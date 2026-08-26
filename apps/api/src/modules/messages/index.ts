import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok, paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId } from '../../lib/scope.js';
import { provider } from '../whatsapp/provider.js';
import { Role, SenderType, MessageDirection, MessageStatus } from '@wa/shared';

const router = Router();

const sendSchema = z.object({
  conversationId: z.string().min(1),
  messageType: z.enum(['TEXT', 'IMAGE', 'DOCUMENT']).default('TEXT'),
  content: z.string().optional(),
  media: z.record(z.unknown()).optional(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const conversationId = String(req.query.conversationId ?? '');
  if (!conversationId) throw ApiError.badRequest('conversationId is required');
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: scopeTenantId(req) },
  });
  if (!convo) throw ApiError.notFound('Conversation not found');

  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 100);
  const where = { conversationId, tenantId: scopeTenantId(req) };
  const [items, total] = await Promise.all([
    prisma.message.findMany({ where, take: pageSize, skip: (page - 1) * pageSize, orderBy: { timestamp: 'desc' } }),
    prisma.message.count({ where }),
  ]);
  res.json(paged(items.reverse(), total, page, pageSize));
});

// Outbound message — agent reply or automated send.
router.post(
  '/send',
  requireRole(Role.AGENT, Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN),
  audit('CREATE', 'MESSAGE'),
  async (req, res) => {
    const body = sendSchema.parse(req.body);
    const tenantId = scopeTenantId(req);
    const convo = await prisma.conversation.findFirst({ where: { id: body.conversationId, tenantId } });
    if (!convo) throw ApiError.notFound('Conversation not found');
    const customer = await prisma.customer.findUnique({ where: { id: convo.customerId } });
    const convoPhone = customer?.phone ?? '';

    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: convo.id,
        direction: MessageDirection.OUTBOUND,
        senderType: SenderType.AGENT,
        senderId: req.user!.id,
        messageType: body.messageType,
        content: body.content ?? null,
        media: body.media ? JSON.parse(JSON.stringify(body.media)) : undefined,
        status: MessageStatus.QUEUED,
      },
    });

    let result: { providerMessageId: string };
    console.log('[messages] Attempting to send message to phone:', convoPhone, 'messageType:', body.messageType);
    try {
      result = await provider.send({
        tenantId,
        to: convoPhone,
        messageType: body.messageType,
        content: body.content,
        media: body.media,
      });
      console.log('[messages] Provider send success, providerMessageId:', result.providerMessageId);
    } catch (err) {
      const providerErr = err as { status?: number; meta?: unknown };
      console.error(
        `[messages] provider send failed status=${providerErr.status ?? 'n/a'} error=${err instanceof Error ? err.message : String(err)} detail=${typeof providerErr.meta === 'string' ? providerErr.meta : JSON.stringify(providerErr.meta) ?? ''}`,
      );
      await prisma.message.update({
        where: { id: message.id },
        data: { status: MessageStatus.FAILED, metadata: { error: err instanceof Error ? err.message : 'send failed' } },
      });
      throw ApiError.badGateway(err instanceof Error ? err.message : 'Failed to send message');
    }

    const sentMessage = await prisma.message.update({
      where: { id: message.id },
      data: { providerMessageId: result.providerMessageId, status: MessageStatus.SENT },
    });
    await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });

    res.status(201).json(ok(sentMessage));
  },
);

export default router;