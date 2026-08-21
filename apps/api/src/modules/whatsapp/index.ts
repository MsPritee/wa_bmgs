import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { provider } from './provider.js';
import { verifySignature } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { ApiError, ok } from '../../lib/http.js';
import { ConversationStatus, ConversationMode } from '@wa/shared';

// Inbound ingest from the WhatsApp provider. Public route protected by the
// provider signature (X-Hub-Signature-256) and idempotency keys.
const router = Router();

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          type?: string;
          from?: string;
          timestamp?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
};

// GET verification handshake
router.get('/webhooks/whatsapp', (req, res) => {
  const mode = String(req.query['hub.mode'] ?? '');
  const token = String(req.query['hub.verify_token'] ?? '');
  const challenge = String(req.query['hub.challenge'] ?? '');
  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send('Verification failed');
});

router.post('/webhooks/whatsapp', async (req, res) => {
  if (env.WHATSAPP_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    const raw = typeof rawBody === 'string' ? rawBody : (req.body === undefined ? '' : JSON.stringify(req.body));
    if (!verifySignature(raw, env.WHATSAPP_APP_SECRET, signature)) {
      throw ApiError.unauthorized('Invalid webhook signature');
    }
  }

  const payload = req.body as WhatsAppWebhookPayload;
  const idempotencyKey = `${payload.object ?? 'wa'}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const event = await prisma.whatsAppWebhookEvent.create({
    data: { idempotencyKey, provider: 'WHATSAPP', payload: req.body, status: 'RECEIVED' },
  });

  await ingest(payload);

  await prisma.whatsAppWebhookEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
  res.status(200).json(ok({ received: true }));
});

async function ingest(payload: WhatsAppWebhookPayload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  if (change?.field !== 'messages') return;
  const value = change.value;
  if (!value || !value.messages?.length) return;

  const incoming = value.messages[0];
  const metaMsgId = incoming.id;
  if (!metaMsgId) return;

  const businessPhone = value.metadata?.display_phone_number;
  const customerPhone = incoming.from;
  const messageBody = incoming.text?.body ?? '';
  if (!businessPhone || !customerPhone) return;

  const tenant = await prisma.tenant.findFirst({ where: { whatsappPhone: businessPhone, status: 'ACTIVE' } });
  if (!tenant) return;

  // Deduplicate by Meta message ID
  const existing = await prisma.message.findFirst({
    where: { tenantId: tenant.id, providerMessageId: metaMsgId }
  });
  if (existing) return;

  const normalized = normalizePhone(customerPhone);
  let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: normalized } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        phone: normalized,
        name: value.contacts?.[0]?.profile?.name,
        tags: [],
        lastActivityAt: new Date(),
      },
    });
  }
  await prisma.customer.update({ where: { id: customer.id }, data: { lastActivityAt: new Date() } });

  let conversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, customerId: customer.id, status: { in: ['OPEN', 'PENDING'] } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        channel: 'WHATSAPP',
        status: ConversationStatus.OPEN,
        mode: ConversationMode.AUTOMATED,
        variables: {},
      },
    });
  }

  try {
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        direction: 'INBOUND',
        senderType: 'CUSTOMER',
        senderId: customer.id,
        messageType: 'TEXT',
        content: messageBody,
        providerMessageId: incoming.id,
        status: 'DELIVERED',
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') return;
    throw err;
  }
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  if (incoming.id) {
    try {
      await provider.markAsRead({ messageId: incoming.id });
    } catch {
      /* read receipt is best-effort; never block ingest on it */
    }
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export default router;