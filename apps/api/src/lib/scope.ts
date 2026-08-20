import type { Request } from 'express';
import { ApiError } from './http.js';

// Resolves the tenant id that should be used to scope a query. Requires
// loadTenant to have run (or a platform admin with tenant context).
export function scopeTenantId(req: Request): string {
  if (req.tenant) return req.tenant.id;
  if (req.user?.role === 'AGENT' || req.user?.role === 'BUSINESS_ADMIN') return req.user.tenantId!;
  throw ApiError.forbidden('Business context required');
}

// Express 5 may type repeated/wildcard route params as `string | string[]`.
// We only use simple named params, so coerce to the first string segment.
export function param(req: Request, key: string): string {
  const v = (req.params as unknown as Record<string, unknown>)[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return v ? String(v) : '';
}