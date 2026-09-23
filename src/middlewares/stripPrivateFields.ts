import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * Keys that must never appear in a storefront (customer-facing) response.
 * Several customer endpoints return raw Prisma product rows (product page,
 * listings, collections, spotlights), and a raw row carries costPrice. This
 * middleware is the single safety net instead of remembering a `select` in
 * every repository.
 */
const PRIVATE_KEYS = new Set(['costPrice', 'passwordHash', 'codeHash', 'tokenHash']);

/** Plain objects (Prisma rows) and our ApiResponse envelope are walked; class instances like
 *  Date or Prisma.Decimal are left alone so they serialise exactly as before. */
function isTraversable(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (value instanceof ApiResponse) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Deep copy with private keys removed. Dates, Decimals etc. are passed through untouched. */
export function stripPrivate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPrivate);
  if (!isTraversable(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(key)) continue;
    out[key] = stripPrivate(child);
  }
  return out;
}

export function stripPrivateFields(req: Request, res: Response, next: NextFunction): void {
  // Admin and webhook routes are trusted; everything else is storefront.
  if (req.path.startsWith('/admin') || req.path.startsWith('/webhooks')) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body?: unknown) => originalJson(stripPrivate(body));
  next();
}
