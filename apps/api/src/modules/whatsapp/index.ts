import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { provider } from './provider.js';
import { verifySignature } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { ApiError, ok } from '../../lib/http.js';
import { ConversationStatus, ConversationMode } from '@wa/shared';

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
          image?: { id?: string; mime_type?: string; caption?: string };
          document?: { id?: string; mime_type?: string; caption?: string; filename?: string };
          audio?: { id?: string; mime_type?: string };
          video?: { id?: string; mime_type?: string; caption?: string };
        }[];
        statuses?: {
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
        }[];
      };
    }[];
  }[];
};

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

async function findTenantByPhone(displayPhone: string) {
  const normalized = normalizePhone(displayPhone);
  console.log('[whatsapp] findTenantByPhone: displayPhone=', displayPhone, 'normalized=', normalized);
  let tenant = await prisma.tenant.findFirst({ where: { whatsappPhone: normalized, status: 'ACTIVE' } });
  if (tenant) {
    console.log('[whatsapp] findTenantByPhone: found tenant by normalized phone, tenantId=', tenant.id);
    return tenant;
  }
  tenant = await prisma.tenant.findFirst({ where: { whatsappPhone: displayPhone, status: 'ACTIVE' } });
  if (tenant) {
    console.log('[whatsapp] findTenantByPhone: found tenant by display phone, tenantId=', tenant.id);
    return tenant;
  }
  const allActive = await prisma.tenant.findMany({ where: { status: 'ACTIVE', whatsappPhone: { not: null } } });
  console.log('[whatsapp] findTenantByPhone: checking', allActive.length, 'active tenants');
  for (const t of allActive) {
    if (t.whatsappPhone && normalizePhone(t.whatsappPhone) === normalized) {
      console.log('[whatsapp] findTenantByPhone: found tenant by iteration, tenantId=', t.id);
      return t;
    }
  }
  console.warn('[whatsapp] findTenantByPhone: no tenant found for phone', displayPhone);
  return null;
}

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
  console.log('[whatsapp] POST /webhooks/whatsapp - request received');
  console.log('[whatsapp] WHATSAPP_APP_SECRET configured:', !!env.WHATSAPP_APP_SECRET);
  
  if (env.WHATSAPP_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: string }).rawBody;
    const raw = typeof rawBody === 'string' ? rawBody : (req.body === undefined ? '' : JSON.stringify(req.body));
    console.log('[whatsapp] signature present:', !!signature);
    if (!verifySignature(raw, env.WHATSAPP_APP_SECRET, signature)) {
      console.error('[whatsapp] Invalid webhook signature');
      throw ApiError.unauthorized('Invalid webhook signature');
    }
  }

  const payload = req.body as WhatsAppWebhookPayload;
  const field = payload.entry?.[0]?.changes?.[0]?.field;
  console.log(`[whatsapp] webhook received object=${payload.object ?? 'n/a'} field=${field ?? 'n/a'}`);

  const idempotencyKey = `${payload.object ?? 'wa'}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const event = await prisma.whatsAppWebhookEvent.create({
    data: { idempotencyKey, provider: 'WHATSAPP', payload: req.body, status: 'RECEIVED' },
  });

  try {
    if (field === 'statuses') {
      await ingestStatuses(payload);
    } else {
      await ingestMessages(payload);
    }
  } catch (err) {
    console.error(`[whatsapp] ingest error:`, err);
  }

  await prisma.whatsAppWebhookEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
  res.status(200).json(ok({ received: true }));
});

async function ingestMessages(payload: WhatsAppWebhookPayload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  if (change?.field !== 'messages') return;
  const value = change.value;
  if (!value) return;

  const businessPhone = value.metadata?.display_phone_number;
  if (!businessPhone) {
    console.warn('[whatsapp] ingestMessages: no display_phone_number in metadata');
    return;
  }

  const tenant = await findTenantByPhone(businessPhone);
  if (!tenant) {
    console.warn(`[whatsapp] event dropped: no tenant matches display_phone_number=${businessPhone}`);
    return;
  }

  const messages = value.messages ?? [];
  for (const incoming of messages) {
    const metaMsgId = incoming.id;
    if (!metaMsgId) continue;

    const customerPhone = incoming.from;
    if (!customerPhone) continue;

    const existing = await prisma.message.findFirst({
      where: { tenantId: tenant.id, providerMessageId: metaMsgId }
    });
    if (existing) continue;

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

    let content = incoming.text?.body ?? '';
    let messageType = 'TEXT';

    if (incoming.image) {
      messageType = 'IMAGE';
      content = incoming.image.caption ?? '';
    } else if (incoming.document) {
      messageType = 'DOCUMENT';
      content = incoming.document.caption ?? incoming.document.filename ?? '';
    } else if (incoming.audio) {
      messageType = 'AUDIO';
    } else if (incoming.video) {
      messageType = 'VIDEO';
      content = incoming.video.caption ?? '';
    }

    try {
      await prisma.message.create({
        data: {
          tenantId: tenant.id,
          conversationId: conversation.id,
          direction: 'INBOUND',
          senderType: 'CUSTOMER',
          senderId: customer.id,
          messageType,
          content,
          providerMessageId: metaMsgId,
          status: 'DELIVERED',
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') continue;
      throw err;
    }

    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

    try {
      await provider.markAsRead({ messageId: metaMsgId });
    } catch {
      // read receipt is best-effort
    }
  }
}

async function ingestStatuses(payload: WhatsAppWebhookPayload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  if (change?.field !== 'statuses') return;
  const value = change.value;
  if (!value || !value.statuses?.length) return;

  const businessPhone = value.metadata?.display_phone_number;
  const tenant = businessPhone ? await findTenantByPhone(businessPhone) : null;

  for (const status of value.statuses) {
    const metaMsgId = status.id;
    const newStatus = status.status;
    if (!metaMsgId || !newStatus) continue;

    const mappedStatus = mapMetaStatus(newStatus);

    if (tenant) {
      const updated = await prisma.message.updateMany({
        where: { tenantId: tenant.id, providerMessageId: metaMsgId },
        data: {
          status: mappedStatus,
          metadata: status.errors?.length ? { errors: status.errors } : undefined,
        },
      });
      console.log(`[whatsapp] status update msg=${metaMsgId} status=${newStatus} mapped=${mappedStatus} updated=${updated.count}`);
    } else {
      console.warn(`[whatsapp] status update ignored: no tenant for display_phone_number=${businessPhone}`);
    }
  }
}

function mapMetaStatus(status: string): string {
  switch (status) {
    case 'sent': return 'SENT';
    case 'delivered': return 'DELIVERED';
    case 'read': return 'READ';
    case 'failed': return 'FAILED';
    case 'expired': return 'FAILED';
    default: return 'SENT';
  }
}

export default router;