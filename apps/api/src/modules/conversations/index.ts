import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok, paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role, ConversationStatus, ConversationMode } from '@wa/shared';

const router = Router();

const updateSchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  mode: z.nativeEnum(ConversationMode).optional(),
  currentWorkflowId: z.string().optional(),
  currentNodeId: z.string().nullish(),
  variables: z.record(z.unknown()).optional(),
});
const assignSchema = z.object({ agentId: z.string().min(1) });

router.use(authenticate, loadTenant);

async function findScoped(req: Request) {
  const convo = await prisma.conversation.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
  });
  if (!convo) throw ApiError.notFound('Conversation not found');
  return convo;
}

function listWhere(req: Request) {
  const where: Record<string, unknown> = { tenantId: scopeTenantId(req) };
  if (typeof req.query.status === 'string' && req.query.status) where.status = req.query.status;
  if (typeof req.query.mode === 'string' && req.query.mode) where.mode = req.query.mode;
  // AGENT scoping: own + unassigned conversations
  if (req.user?.role === Role.AGENT) where.OR = [{ assignedAgentId: req.user.id }, { assignedAgentId: null }];
  return where;
}

router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const where = listWhere(req);
  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);
  res.json(paged(items, total, page, pageSize));
});

router.get('/:id', async (req, res) => {
  const convo = await prisma.conversation.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
    include: {
      customer: true,
      agent: { select: { id: true, name: true } },
      messages: { orderBy: { timestamp: 'asc' } },
      assignments: { include: { agent: { select: { id: true, name: true } } }, orderBy: { assignedAt: 'desc' } },
    },
  });
  if (!convo) throw ApiError.notFound('Conversation not found');
  res.json(ok(convo));
});

router.patch('/:id', audit('UPDATE', 'CONVERSATION'), async (req, res) => {
  const body = updateSchema.parse(req.body);
  await findScoped(req);
  const convo = await prisma.conversation.update({
    where: { id: param(req, 'id') },
    data: {
      status: body.status,
      mode: body.mode,
      currentWorkflowId: body.currentWorkflowId,
      currentNodeId: body.currentNodeId,
      variables: body.variables ? JSON.parse(JSON.stringify(body.variables)) : undefined,
    },
  });
  res.json(ok(convo));
});

// Human takeover: pause automation and hand the conversation to a human agent
router.post('/:id/takeover', requireRole(Role.AGENT, Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('TAKEOVER', 'CONVERSATION'), async (req, res) => {
  const current = await findScoped(req);
  if (req.user!.role === Role.AGENT && current.assignedAgentId && current.assignedAgentId !== req.user!.id) {
    throw ApiError.forbidden('Conversation assigned to another agent');
  }
  const convo = await prisma.conversation.update({
    where: { id: param(req, 'id') },
    data: { mode: ConversationMode.HUMAN, status: ConversationStatus.OPEN, assignedAgentId: req.user!.id },
  });
  await prisma.agentAssignment.create({
    data: { tenantId: scopeTenantId(req), conversationId: convo.id, agentId: req.user!.id, reason: 'TAKEOVER' },
  });
  res.json(ok(convo));
});

router.post('/:id/resume', requireRole(Role.AGENT, Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('RESUME', 'CONVERSATION'), async (req, res) => {
  await findScoped(req);
  const convo = await prisma.conversation.update({ where: { id: param(req, 'id') }, data: { mode: ConversationMode.AUTOMATED } });
  res.json(ok(convo));
});

router.post('/:id/assign', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'CONVERSATION'), async (req, res) => {
  const body = assignSchema.parse(req.body);
  await findScoped(req);
  const convo = await prisma.conversation.update({
    where: { id: param(req, 'id') },
    data: { assignedAgentId: body.agentId, mode: ConversationMode.HUMAN },
  });
  await prisma.agentAssignment.create({
    data: { tenantId: scopeTenantId(req), conversationId: convo.id, agentId: body.agentId, reason: 'ASSIGNED' },
  });
  res.json(ok(convo));
});

router.post('/:id/resolve', audit('UPDATE', 'CONVERSATION'), async (req, res) => {
  await findScoped(req);
  const convo = await prisma.conversation.update({ where: { id: param(req, 'id') }, data: { status: ConversationStatus.RESOLVED } });
  res.json(ok(convo));
});

export default router;