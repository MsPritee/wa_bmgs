import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role, EntityFieldType } from '@wa/shared';

const router = Router();

const entitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.nativeEnum(EntityFieldType).default(EntityFieldType.TEXT),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const entities = await prisma.entity.findMany({
    where: { tenantId: scopeTenantId(req) },
    include: { fields: { orderBy: { sortOrder: 'asc' } }, _count: { select: { records: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(ok(entities));
});

router.post('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'ENTITY'), async (req, res) => {
  const body = entitySchema.parse(req.body);
  const existing = await prisma.entity.findFirst({ where: { tenantId: scopeTenantId(req), slug: body.slug } });
  if (existing) throw ApiError.conflict('Entity slug already exists');
  const entity = await prisma.entity.create({ data: { tenantId: scopeTenantId(req), ...body } });
  res.status(201).json(ok(entity));
});

router.get('/:id', async (req, res) => {
  const entity = await prisma.entity.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!entity) throw ApiError.notFound('Entity not found');
  res.json(ok(entity));
});

router.patch('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'ENTITY'), async (req, res) => {
  const body = entitySchema.partial().parse(req.body);
  await prisma.entity.updateMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) }, data: body });
  res.json(ok(await prisma.entity.findUnique({ where: { id: param(req, 'id') } })));
});

router.delete('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'ENTITY'), async (req, res) => {
  await prisma.entity.deleteMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  res.json(ok({ deleted: true }));
});

// Fields --------------------------------------------------------------------
router.post('/:id/fields', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'ENTITY_FIELD'), async (req, res) => {
  const body = fieldSchema.parse(req.body);
  const entity = await prisma.entity.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!entity) throw ApiError.notFound('Entity not found');
  const field = await prisma.entityField.create({ data: { entityId: entity.id, ...body } });
  res.status(201).json(ok(field));
});

router.patch('/fields/:fieldId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'ENTITY_FIELD'), async (req, res) => {
  const body = fieldSchema.partial().parse(req.body);
  const field = await prisma.entityField.findFirst({ where: { id: param(req, 'fieldId'), entity: { tenantId: scopeTenantId(req) } } });
  if (!field) throw ApiError.notFound('Field not found');
  const updated = await prisma.entityField.update({ where: { id: field.id }, data: body });
  res.json(ok(updated));
});

router.delete('/fields/:fieldId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'ENTITY_FIELD'), async (req, res) => {
  const field = await prisma.entityField.findFirst({ where: { id: param(req, 'fieldId'), entity: { tenantId: scopeTenantId(req) } } });
  if (!field) throw ApiError.notFound('Field not found');
  await prisma.entityField.delete({ where: { id: field.id } });
  res.json(ok({ deleted: true }));
});

export default router;