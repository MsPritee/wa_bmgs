import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/http.js';
import { authenticate, requireRole, loadTenant } from '../../middleware/auth.js';
import { scopeTenantId } from '../../lib/scope.js';
import { Role } from '@wa/shared';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/overview', async (req, res) => {
  const tenantId = scopeTenantId(req);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    customers,
    newCustomers,
    conversations,
    openConversations,
    automatedConversations,
    humanConversations,
    messagesToday,
    sentToday,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
    prisma.conversation.count({ where: { tenantId } }),
    prisma.conversation.count({ where: { tenantId, status: { in: ['OPEN', 'PENDING'] } } }),
    prisma.conversation.count({ where: { tenantId, mode: 'AUTOMATED' } }),
    prisma.conversation.count({ where: { tenantId, mode: 'HUMAN' } }),
    prisma.message.count({ where: { tenantId, timestamp: { gte: todayStart } } }),
    prisma.message.count({ where: { tenantId, direction: 'OUTBOUND', timestamp: { gte: todayStart } } }),
  ]);

  res.json(
    ok({
      customers,
      newCustomers,
      conversations,
      openConversations,
      automatedConversations,
      humanConversations,
      messagesToday,
      sentToday,
      resolutionRate: conversations > 0 ? Number(((conversations - openConversations) / conversations).toFixed(2)) : 0,
    }),
  );
});

// Simple trend: conversations per day for last N days
router.get('/conversations/trend', requireRole(Role.BUSINESS_ADMIN, Role.PLATFORM_ADMIN), async (req, res) => {
  const tenantId = scopeTenantId(req);
  const days = Math.min(Number(req.query.days ?? 14), 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.message.groupBy({
    by: ['timestamp'],
    where: { tenantId, timestamp: { gte: since } },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = row.timestamp.toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + row._count._all);
  }

  const series: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }
  res.json(ok(series));
});

export default router;