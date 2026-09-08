import { AdminRole } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email?: string;
    }

    interface AuthenticatedAdmin {
      id: string;
      role: AdminRole;
    }

    interface Request {
      user?: AuthenticatedUser;
      admin?: AuthenticatedAdmin;
      requestId?: string;
      guestToken?: string;
      rawBody?: Buffer;
    }
  }
}

export {};
