import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { scopeTenantId, param } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

const availabilitySchema = z.object({ agentStatus: z.enum(['ONLINE', 'OFFLINE']) });

router.use(authenticate, loadTenant);

router.get('/', async (req, res) => {
  const agents = await prisma.user.findMany({
    where: { tenantId: scopeTenantId(req), role: Role.AGENT },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      agentStatus: true,
      isActive: true,
      _count: { select: { conversations: { where: {} } } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(ok(agents));
});

// A user can update their own availability
router.patch('/me/availability', async (req, res) => {
  const body = availabilitySchema.parse(req.body);
  const me = await prisma.user.update({ where: { id: req.user!.id }, data: { agentStatus: body.agentStatus } });
  res.json(ok({ agentStatus: me.agentStatus }));
});

router.patch('/:agentId', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), audit('UPDATE', 'AGENT'), async (req, res) => {
  const body = availabilitySchema.parse(req.body);
  const agent = await prisma.user.updateMany({
    where: { id: param(req, 'agentId'), tenantId: scopeTenantId(req) },
    data: { agentStatus: body.agentStatus },
  });
  if (agent.count === 0) throw ApiError.notFound('Agent not found');
  res.json(ok({ updated: true }));
});

export default router;