import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { ApiError, ok } from '../../lib/http.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { authenticate } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';

const router = Router();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const changePasswordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8) });

function publicUser(user: {
  id: string; email: string; name: string; role: string; tenantId: string | null; phone: string | null; agentStatus: string | null;
}) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, phone: user.phone, agentStatus: user.agentStatus };
}

async function issueTokens(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const familyId = randomUUID();
  const refreshToken = signRefreshToken({ userId });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), familyId, expiresAt },
  });
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role as never,
    tenantId: user.tenantId,
  });
  return { accessToken, refreshToken, user: publicUser(user) };
}

router.post('/login', audit('LOGIN', 'USER'), async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');
  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || tenant.status !== 'ACTIVE') throw ApiError.forbidden('Business is inactive');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json(ok(await issueTokens(user.id)));
});

router.post('/refresh', async (req, res) => {
  const body = refreshSchema.parse(req.body);
  let payload;
  try {
    payload = verifyRefreshToken(body.refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(body.refreshToken) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token revoked or expired');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid user');

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  res.json(ok(await issueTokens(user.id)));
});

router.post('/logout', authenticate, async (req, res) => {
  if (req.body?.refreshToken) {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(String(req.body.refreshToken)) },
    });
    if (stored) await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  }
  res.json(ok({ loggedOut: true }));
});

router.get('/me', authenticate, async (req, res) => {
  const user = req.user!;
  const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId } }) : null;
  res.json(ok({ user: publicUser(user), tenant }));
});

router.post('/change-password', authenticate, async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const valid = await bcrypt.compare(body.oldPassword, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Current password is incorrect');
  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
  res.json(ok({ changed: true }));
});

export default router;