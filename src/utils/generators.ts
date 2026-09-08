import crypto from 'crypto';
import { AUTH } from '../config/constants';

/** e.g. ('SNB-BURTON', 'M', 'Black') -> 'SNB-BURTON-M-BLACK' */
export function generateSku(prefix: string, size: string, color?: string | null): string {
  const parts = [prefix, size];
  if (color) parts.push(color);
  return parts
    .map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
}

/** e.g. ('ORD-2026-', 142) -> 'ORD-2026-000142' */
export function formatSequentialNumber(prefix: string, sequence: number, padding = 6): string {
  return `${prefix}${String(sequence).padStart(padding, '0')}`;
}

/** Cryptographically secure numeric OTP. Math.random is not acceptable here. */
export function generateOtp(length: number = AUTH.OTP_LENGTH): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, '0');
}

export function generateGuestToken(): string {
  return crypto.randomBytes(AUTH.GUEST_TOKEN_LENGTH).toString('hex');
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
