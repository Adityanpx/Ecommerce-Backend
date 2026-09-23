import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken, CustomerTokenPayload, AdminTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Customer routes. Rejects if no valid customer token is present. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken<CustomerTokenPayload>(token, 'customer');
    if (payload.type !== 'customer') {
      next(ApiError.unauthorized('Invalid token type'));
      return;
    }
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(ApiError.unauthorized('Token expired'));
      return;
    }
    if (error instanceof JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
      return;
    }
    next(error);
  }
}

/**
 * Members-only shopper actions (cart, wishlist, checkout).
 * Same checks as `authenticate`, but a missing token is reported as
 * AUTH_REQUIRED so the storefront opens its "sign in to continue" popup
 * instead of treating it as a broken session.
 */
export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  if (!extractBearerToken(req)) {
    next(ApiError.authRequired());
    return;
  }
  authenticate(req, res, next);
}

/** Admin routes. Signed with a different secret than customer tokens. */
export function authorize(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(ApiError.unauthorized('Admin authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken<AdminTokenPayload>(token, 'admin');
    if (payload.type !== 'admin') {
      next(ApiError.forbidden('Admin access required'));
      return;
    }
    req.admin = { id: payload.sub, role: payload.role as Express.AuthenticatedAdmin['role'] };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(ApiError.unauthorized('Token expired'));
      return;
    }
    if (error instanceof JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
      return;
    }
    next(error);
  }
}

/**
 * Cart and checkout routes. Attaches the user when a valid token exists,
 * otherwise falls through to the guest token header. Never rejects.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token) {
    try {
      const payload = verifyAccessToken<CustomerTokenPayload>(token, 'customer');
      if (payload.type === 'customer') {
        req.user = { id: payload.sub, email: payload.email };
      }
    } catch {
      // Invalid or expired token is not an error here — continue as guest.
    }
  }

  const guestToken = req.headers['x-guest-token'];
  if (typeof guestToken === 'string' && guestToken.length > 0) {
    req.guestToken = guestToken;
  }

  next();
}
