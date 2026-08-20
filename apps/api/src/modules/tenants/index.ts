import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok, paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { Role } from '@wa/shared';
import { param } from '../../lib/scope.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  businessType: z.string().optional(),
  whatsappPhone: z.string().optional(),
  whatsappAccountId: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
  adminName: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  businessType: z.string().optional(),
  whatsappPhone: z.string().optional(),
  whatsappAccountId: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  settings: z.record(z.unknown()).optional(),
});

// PLATFORM ADMIN ONLY -------------------------------------------------
router.get('/', authenticate, requireRole(Role.PLATFORM_ADMIN), async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { customers: true, conversations: true, users: true } } },
    }),
    prisma.tenant.count(),
  ]);
  res.json(paged(items, total, page, pageSize));
});

router.post('/', authenticate, requireRole(Role.PLATFORM_ADMIN), audit('CREATE', 'TENANT'), async (req, res) => {
  const body = createSchema.parse(req.body);
  const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
  if (existing) throw ApiError.conflict('Slug already in use');

  const tenant = await prisma.tenant.create({
    data: {
      name: body.name,
      slug: body.slug,
      businessType: body.businessType,
      whatsappPhone: body.whatsappPhone,
      whatsappAccountId: body.whatsappAccountId,
      settings: {},
    },
  });

  if (body.adminEmail) {
    const passwordHash = await bcrypt.hash(body.adminPassword ?? 'change-me-1234', 10);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: body.adminEmail.toLowerCase(),
        passwordHash,
        name: body.adminName ?? 'Business Admin',
        role: Role.BUSINESS_ADMIN,
      },
    });
  }

  res.status(201).json(ok(tenant));
});

router.get('/:tenantId', authenticate, requireRole(Role.PLATFORM_ADMIN), async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: param(req, 'tenantId') },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { customers: true, conversations: true, users: true } },
    },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  res.json(ok(tenant));
});

router.patch('/:tenantId', authenticate, requireRole(Role.PLATFORM_ADMIN), audit('UPDATE', 'TENANT'), async (req, res) => {
  const body = updateSchema.parse(req.body);
  const tenant = await prisma.tenant.update({
    where: { id: param(req, 'tenantId') },
    data: {
      name: body.name,
      businessType: body.businessType,
      whatsappPhone: body.whatsappPhone,
      whatsappAccountId: body.whatsappAccountId,
      status: body.status,
      settings: body.settings ? JSON.parse(JSON.stringify(body.settings)) : undefined,
    },
  });
  res.json(ok(tenant));
});

router.post('/:tenantId/deactivate', authenticate, requireRole(Role.PLATFORM_ADMIN), audit('UPDATE', 'TENANT'), async (req, res) => {
  const tenant = await prisma.tenant.update({ where: { id: param(req, 'tenantId') }, data: { status: 'SUSPENDED' } });
  res.json(ok(tenant));
});

// BUSINESS OWNER PROFILE (scope-loaded) ------------------------------
router.get('/me', authenticate, loadTenant, async (req, res) => {
  res.json(ok(req.tenant));
});

router.put('/me', authenticate, loadTenant, requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'TENANT'), async (req, res) => {
  const body = updateSchema.parse(req.body);
  const tenant = await prisma.tenant.update({
    where: { id: req.tenant!.id },
    data: {
      name: body.name,
      businessType: body.businessType,
      whatsappPhone: body.whatsappPhone,
      whatsappAccountId: body.whatsappAccountId,
      status: body.status,
      settings: body.settings ? JSON.parse(JSON.stringify(body.settings)) : undefined,
    },
  });
  res.json(ok(tenant));
});

export default router;

export { router as businessesRouter };