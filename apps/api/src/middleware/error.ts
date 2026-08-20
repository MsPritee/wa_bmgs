import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/http.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: err.flatten(),
      },
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // Prisma known errors
  const prismaErr = err as { code?: string; meta?: { target?: string[] } };
  if (prismaErr?.code === 'P2002') {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with that value already exists', details: { fields: prismaErr.meta?.target } },
    });
    return;
  }
  if (prismaErr?.code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    return;
  }
   
  if (!isProd) console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}