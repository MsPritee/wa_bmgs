import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from '../modules/auth/index.js';
import tenantRoutes, { businessesRouter } from '../modules/tenants/index.js';
import customerRoutes from '../modules/customers/index.js';
import conversationRoutes from '../modules/conversations/index.js';
import messageRoutes from '../modules/messages/index.js';
import menuRoutes from '../modules/menus/index.js';
import workflowRoutes from '../modules/workflows/index.js';
import entityRoutes from '../modules/entities/index.js';
import recordRoutes from '../modules/records/index.js';
import templateRoutes from '../modules/templates/index.js';
import agentRoutes from '../modules/agents/index.js';
import analyticsRoutes from '../modules/analytics/index.js';
import auditRoutes from '../modules/audit/index.js';
import { ok } from '../lib/http.js';

const router = Router();

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

router.get('/health', (_req, res) => res.json(ok({ status: 'ok', ts: new Date().toISOString() })));

router.use('/auth', authRoutes);
router.use('/businesses', businessesRouter);
router.use('/tenants', tenantRoutes);
router.use('/customers', customerRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/menus', menuRoutes);
router.use('/workflows', workflowRoutes);
router.use('/entities', entityRoutes);
router.use('/records', recordRoutes);
router.use('/templates', templateRoutes);
router.use('/agents', agentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);
router.use(apiLimiter);

export default router;