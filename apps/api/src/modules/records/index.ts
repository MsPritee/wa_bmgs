import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok, paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

const recordCreateSchema = z.object({
  entityId: z.string().min(1),
  data: z.record(z.unknown()),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
const recordPatchSchema = z.object({
  data: z.record(z.unknown()).optional(),
  status: z.string().optional(),
});

router.use(authenticate, loadTenant);

async function ensureEntity(tenantId: string, entityId: string) {
  const entity = await prisma.entity.findFirst({ where: { id: entityId, tenantId } });
  if (!entity) throw ApiError.notFound('Entity not found');
  return entity;
}

router.get('/:entityId/records', async (req, res) => {
  const tenantId = scopeTenantId(req);
  await ensureEntity(tenantId, param(req, 'entityId'));
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);
  const where = { entityId: param(req, 'entityId'), tenantId };
  const [items, total] = await Promise.all([
    prisma.record.findMany({ where, take: pageSize, skip: (page - 1) * pageSize, orderBy: { updatedAt: 'desc' } }),
    prisma.record.count({ where }),
  ]);
  res.json(paged(items, total, page, pageSize));
});

router.post('/:entityId/records', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'RECORD'), async (req, res) => {
  const { data, status, metadata } = recordCreateSchema.parse(req.body);
  const tenantId = scopeTenantId(req);
  const entity = await ensureEntity(tenantId, param(req, 'entityId'));
  const record = await prisma.record.create({
    data: {
      tenantId,
      entityId: entity.id,
      data: JSON.parse(JSON.stringify(data)),
      status,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
  res.status(201).json(ok(record));
});

router.get('/:entityId/records/:recordId', async (req, res) => {
  const record = await prisma.record.findFirst({
    where: { id: param(req, 'recordId'), entityId: param(req, 'entityId'), tenantId: scopeTenantId(req) },
  });
  if (!record) throw ApiError.notFound('Record not found');
  res.json(ok(record));
});

router.patch('/:entityId/records/:recordId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'RECORD'), async (req, res) => {
  const body = recordPatchSchema.parse(req.body);
  const record = await prisma.record.findFirst({
    where: { id: param(req, 'recordId'), entityId: param(req, 'entityId'), tenantId: scopeTenantId(req) },
  });
  if (!record) throw ApiError.notFound('Record not found');
  const updated = await prisma.record.update({
    where: { id: record.id },
    data: {
      ...(body.data ? { data: JSON.parse(JSON.stringify(body.data)) } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
  });
  res.json(ok(updated));
});

router.delete('/:entityId/records/:recordId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'RECORD'), async (req, res) => {
  const result = await prisma.record.deleteMany({
    where: { id: param(req, 'recordId'), entityId: param(req, 'entityId'), tenantId: scopeTenantId(req) },
  });
  if (result.count === 0) throw ApiError.notFound('Record not found');
  res.json(ok({ deleted: true }));
});

export default router;