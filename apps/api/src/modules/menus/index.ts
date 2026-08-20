import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role, MenuItemAction } from '@wa/shared';

const router = Router();

const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string().optional(),
  isActive: z.boolean().optional(),
});
const itemSchema = z.object({
  label: z.string().min(1),
  action: z.nativeEnum(MenuItemAction).default(MenuItemAction.SHOW_MENU),
  actionConfig: z.record(z.unknown()).optional(),
  nextMenuId: z.string().nullish(),
  sortOrder: z.number().int().optional(),
});

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const menus = await prisma.menu.findMany({
    where: { tenantId: scopeTenantId(req) },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(ok(menus));
});

router.post('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'MENU'), async (req, res) => {
  const body = menuSchema.parse(req.body);
  const menu = await prisma.menu.create({ data: { tenantId: scopeTenantId(req), ...body } });
  res.status(201).json(ok(menu));
});

router.get('/:id', async (req, res) => {
  const menu = await prisma.menu.findFirst({
    where: { id: param(req, 'id'), tenantId: scopeTenantId(req) },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!menu) throw ApiError.notFound('Menu not found');
  res.json(ok(menu));
});

router.patch('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'MENU'), async (req, res) => {
  const body = menuSchema.parse(req.body);
  await prisma.menu.updateMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) }, data: body });
  res.json(ok(await prisma.menu.findUnique({ where: { id: param(req, 'id') } })));
});

router.delete('/:id', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'MENU'), async (req, res) => {
  await prisma.menu.deleteMany({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  res.json(ok({ deleted: true }));
});

// Nested items ----------------------------------------------------------
router.post('/:id/items', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('CREATE', 'MENU_ITEM'), async (req, res) => {
  const body = itemSchema.parse(req.body);
  const menu = await prisma.menu.findFirst({ where: { id: param(req, 'id'), tenantId: scopeTenantId(req) } });
  if (!menu) throw ApiError.notFound('Menu not found');
  const item = await prisma.menuItem.create({
    data: { menuId: menu.id, ...body, actionConfig: body.actionConfig ? JSON.parse(JSON.stringify(body.actionConfig)) : undefined },
  });
  res.status(201).json(ok(item));
});

router.patch('/items/:itemId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'MENU_ITEM'), async (req, res) => {
  const body = itemSchema.partial().parse(req.body);
  const item = await prisma.menuItem.findFirst({
    where: { id: param(req, 'itemId'), menu: { tenantId: scopeTenantId(req) } },
  });
  if (!item) throw ApiError.notFound('Menu item not found');
  const updated = await prisma.menuItem.update({
    where: { id: item.id },
    data: { ...body, actionConfig: body.actionConfig ? JSON.parse(JSON.stringify(body.actionConfig)) : undefined },
  });
  res.json(ok(updated));
});

router.delete('/items/:itemId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('DELETE', 'MENU_ITEM'), async (req, res) => {
  const item = await prisma.menuItem.findFirst({
    where: { id: param(req, 'itemId'), menu: { tenantId: scopeTenantId(req) } },
  });
  if (!item) throw ApiError.notFound('Menu item not found');
  await prisma.menuItem.delete({ where: { id: item.id } });
  res.json(ok({ deleted: true }));
});

export default router;