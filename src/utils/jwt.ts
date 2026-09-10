import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';

export type TokenType = 'customer' | 'admin';

export interface CustomerTokenPayload {
  sub: string;
  type: 'customer';
  email?: string;
}

export interface AdminTokenPayload {
  sub: string;
  type: 'admin';
  role: string;
}

export type TokenPayload = CustomerTokenPayload | AdminTokenPayload;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function getSecrets(type: TokenType) {
  return type === 'admin' ? config.jwt.admin : config.jwt.customer;
}

export function signAccessToken(payload: TokenPayload): string {
  const secrets = getSecrets(payload.type);
  const options: SignOptions = { expiresIn: secrets.accessExpiry as SignOptions['expiresIn'] };
  return jwt.sign(payload, secrets.accessSecret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const secrets = getSecrets(payload.type);
  // jwtid guarantees uniqueness even when two refresh tokens for the same
  // payload are issued within the same second — jwt.sign is deterministic
  // (iat has 1s resolution), so without it, back-to-back issuance (e.g.
  // login immediately followed by refresh) can produce byte-identical
  // tokens, colliding on the unique token_hash column in the database.
  const options: SignOptions = {
    expiresIn: secrets.refreshExpiry as SignOptions['expiresIn'],
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign(payload, secrets.refreshSecret, options);
}

export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function verifyAccessToken<T extends TokenPayload>(token: string, type: TokenType): T {
  const secrets = getSecrets(type);
  return jwt.verify(token, secrets.accessSecret) as T;
}

export function verifyRefreshToken<T extends TokenPayload>(token: string, type: TokenType): T {
  const secrets = getSecrets(type);
  return jwt.verify(token, secrets.refreshSecret) as T;
}

/**
 * Refresh tokens are stored as SHA-256 hashes, never in plaintext.
 * A database leak then does not hand an attacker usable sessions.
 * SHA-256 (not bcrypt) because these are high-entropy random strings,
 * not guessable passwords, and lookups must be fast.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Milliseconds until expiry, for setting the refresh cookie's maxAge. */
export function getRefreshExpiryMs(type: TokenType): number {
  const expiry = getSecrets(type).refreshExpiry;
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * unitMs[match[2]];
}
