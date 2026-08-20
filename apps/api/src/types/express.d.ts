import type { JwtPayload } from '@wa/shared';
import type { Tenant, User } from '@prisma/client';

declare global {
   
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      user?: User;
      tenant?: Tenant;
    }
  }
}

export {};