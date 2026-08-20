import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  body: z.string().min(1),
  language: z.string().default('en'),
  category: z.string().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'PENDING', 'REJECTED']).default('DRAFT'),
  metadata: z.record(z.unknown()).optional(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const templates = await prisma.template.findMany({
    where: { tenantId: scopeTenantId(req) },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ok(templates));
});

router.post('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'TEMPLATE'), async (req, res) => {
  const body = templateSchema.parse(req.body);
  const template = await prisma.template.create({
    data: { tenantId: scopeTenantId(req), ...body, metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined },
  });
  res.status(201).json(ok(template));
});

router.get('/:id', async (req, res) => {
  const template = await prisma.template.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!template) throw ApiError.notFound('Template not found');
  res.json(ok(template));
});

router.patch('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'TEMPLATE'), async (req, res) => {
  const body = templateSchema.partial().parse(req.body);
  const template = await prisma.template.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!template) throw ApiError.notFound('Template not found');
  const updated = await prisma.template.update({
    where: { id: template.id },
    data: {
      name: body.name,
      body: body.body,
      language: body.language,
      category: body.category,
      status: body.status,
      metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
    },
  });
  res.json(ok(updated));
});

router.delete('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'TEMPLATE'), async (req, res) => {
  await prisma.template.deleteMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  res.json(ok({ deleted: true }));
});

export default router;