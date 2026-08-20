import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok, paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

const createSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const tenantId = scopeTenantId(req);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const { q } = req.query;
  const where: Record<string, unknown> = { tenantId };
  if (typeof q === 'string' && q) {
    where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { email: { contains: q, mode: 'insensitive' } }];
  }
  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, take: pageSize, skip: (page - 1) * pageSize, orderBy: { updatedAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  res.json(paged(items, total, page, pageSize));
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
    include: { conversations: { orderBy: { updatedAt: 'desc' }, take: 20 } },
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  res.json(ok(customer));
});

router.post('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'CUSTOMER'), async (req, res) => {
  const body = createSchema.parse(req.body);
  const tenantId = scopeTenantId(req);
  const existing = await prisma.customer.findFirst({ where: { tenantId, phone: body.phone } });
  if (existing) return res.json(ok(existing, { created: false }));
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      tags: body.tags ?? [],
      metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
      lastActivityAt: new Date(),
    },
  });
  res.status(201).json(ok(customer, { created: true }));
});

router.patch('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'CUSTOMER'), async (req, res) => {
  const body = updateSchema.parse(req.body);
  const customer = await prisma.customer.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!customer) throw ApiError.notFound('Customer not found');
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      tags: body.tags !== undefined ? body.tags : undefined,
      metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
      updatedAt: new Date(),
    },
  });
  res.json(ok(updated));
});

router.delete('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'CUSTOMER'), async (req, res) => {
  const result = await prisma.customer.deleteMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (result.count === 0) throw ApiError.notFound('Customer not found');
  res.json(ok({ deleted: true }));
});

export default router;