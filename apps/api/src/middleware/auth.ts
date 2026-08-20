import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/http.js';
import { param } from '../lib/scope.js';
import type { Role } from '@wa/shared';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw ApiError.unauthorized('Invalid or inactive user');
    req.auth = payload;
    req.user = user;
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();
    if (!roles.includes(user.role as Role)) throw ApiError.forbidden('Insufficient permissions');
    next();
  };
}

export async function loadTenant(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();

  // Platform admins operate tenant-scoped via ?tenantId= or a path param
  if (user.role === 'PLATFORM_ADMIN' && !user.tenantId) {
    const tenantIdOverride = (req.query.tenantId as string) || param(req, 'tenantId');
    if (tenantIdOverride) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantIdOverride } });
      if (!tenant) throw ApiError.notFound('Tenant not found');
      req.tenant = tenant;
    }
    next();
    return;
  }

  if (!user.tenantId) throw ApiError.forbidden('User is not bound to a business');
  const tenant = await prisma.tenant.findFirst({ where: { id: user.tenantId, status: 'ACTIVE' } });
  if (!tenant) throw ApiError.forbidden('Business is inactive');
  req.tenant = tenant;
  next();
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenant) {
    const user = req.user;
    if (user?.tenantId) throw ApiError.forbidden('Business context required');
  }
  next();
}