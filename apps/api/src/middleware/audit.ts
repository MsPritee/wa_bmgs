import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuditAction } from '@wa/shared';

export type AuditMeta = {
  action: string;
  entityType: string;
  entityId?: string;
  diff?: unknown;
};

// Recorded after a successful request if res.locals.audit is set by the handler
export async function writeAudit(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const meta: AuditMeta | undefined = (res.locals as Record<string, unknown>).audit as AuditMeta;
    if (meta && res.statusCode < 400) {
      prisma.auditLog
        .create({
          data: {
            tenantId: req.tenant?.id ?? req.user?.tenantId ?? null,
            userId: req.user?.id ?? null,
            action: meta.action,
            entityType: meta.entityType,
            entityId: meta.entityId ?? null,
            diff: meta.diff ? JSON.parse(JSON.stringify(meta.diff)) : undefined,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        })
        .catch(() => undefined);
    }
    return originalJson(body);
  };
  next();
}

export function audit(action: AuditAction, entityType: string, entityId?: string, diff?: unknown) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.locals.audit = { action, entityType, entityId, diff };
    next();
  };
}