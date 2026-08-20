import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { paged } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { scopeTenantId } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), async (req, res) => {
  const tenantId = scopeTenantId(req);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);
  const where: Record<string, unknown> = { tenantId };
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.entityType) where.entityType = String(req.query.entityType);

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json(paged(items, total, page, pageSize));
});

export default router;