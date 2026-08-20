import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role, WorkflowNodeType } from '@wa/shared';

const router = Router();

const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string().default('MESSAGE_RECEIVED'),
  isActive: z.boolean().optional(),
});
const nodeSchema = z.object({
  name: z.string().min(1),
  nodeType: z.nativeEnum(WorkflowNodeType),
  config: z.record(z.unknown()).optional(),
  position: z.record(z.unknown()).optional(),
  nextNodeId: z.string().nullish(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const workflows = await prisma.workflow.findMany({
    where: { tenantId: scopeTenantId(req) },
    include: { nodes: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(ok(workflows));
});

router.post('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'WORKFLOW'), async (req, res) => {
  const body = workflowSchema.parse(req.body);
  const workflow = await prisma.workflow.create({ data: { tenantId: scopeTenantId(req), ...body } });
  res.status(201).json(ok(workflow));
});

router.get('/:id', async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
    include: { nodes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!workflow) throw ApiError.notFound('Workflow not found');
  res.json(ok(workflow));
});

router.patch('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'WORKFLOW'), async (req, res) => {
  const body = workflowSchema.partial().parse(req.body);
  await prisma.workflow.updateMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) }, data: body });
  res.json(ok(await prisma.workflow.findUnique({ where: { id: param(req, 'id') } })));
});

router.delete('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'WORKFLOW'), async (req, res) => {
  await prisma.workflow.deleteMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  res.json(ok({ deleted: true }));
});

router.post('/:id/activate', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'WORKFLOW'), async (req, res) => {
  const workflow = await prisma.workflow.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!workflow) throw ApiError.notFound('Workflow not found');
  const updated = await prisma.workflow.update({ where: { id: workflow.id }, data: { isActive: true } });
  res.json(ok(updated));
});

router.post('/:id/deactivate', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'WORKFLOW'), async (req, res) => {
  const workflow = await prisma.workflow.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!workflow) throw ApiError.notFound('Workflow not found');
  const updated = await prisma.workflow.update({ where: { id: workflow.id }, data: { isActive: false } });
  res.json(ok(updated));
});

// Nodes ------------------------------------------------------------------
router.post('/:id/nodes', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'WORKFLOW_NODE'), async (req, res) => {
  const body = nodeSchema.parse(req.body);
  const workflow = await prisma.workflow.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!workflow) throw ApiError.notFound('Workflow not found');
  const node = await prisma.workflowNode.create({
    data: {
      workflowId: workflow.id,
      ...body,
      config: body.config ? JSON.parse(JSON.stringify(body.config)) : undefined,
      position: body.position ? JSON.parse(JSON.stringify(body.position)) : {},
    },
  });
  res.status(201).json(ok(node));
});

router.patch('/nodes/:nodeId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'WORKFLOW_NODE'), async (req, res) => {
  const body = nodeSchema.partial().parse(req.body);
  const node = await prisma.workflowNode.findFirst({ where: { id: param(req, 'nodeId'), workflow: { tenantId: scopeTenantId(req) } } });
  if (!node) throw ApiError.notFound('Node not found');
  const updated = await prisma.workflowNode.update({
    where: { id: node.id },
    data: {
      ...body,
      config: body.config ? JSON.parse(JSON.stringify(body.config)) : undefined,
      position: body.position ? JSON.parse(JSON.stringify(body.position)) : undefined,
    },
  });
  res.json(ok(updated));
});

router.delete('/nodes/:nodeId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'WORKFLOW_NODE'), async (req, res) => {
  const node = await prisma.workflowNode.findFirst({ where: { id: param(req, 'nodeId'), workflow: { tenantId: scopeTenantId(req) } } });
  if (!node) throw ApiError.notFound('Node not found');
  await prisma.workflowNode.delete({ where: { id: node.id } });
  res.json(ok({ deleted: true }));
});

export default router;