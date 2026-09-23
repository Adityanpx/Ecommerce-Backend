import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { RATE_LIMIT } from '../config/constants';
import { config } from '../config/env';

function build(options: { windowMs: number; max: number }, keyBy?: (req: Request) => string) {
  const settings: Partial<Options> = {
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    // Disabled in dev so testing is not blocked by your own limits.
    skip: () => config.isDevelopment,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        errors: [],
      });
    },
  };

  if (keyBy) settings.keyGenerator = keyBy;

  return rateLimit(settings);
}

export const loginLimiter = build(RATE_LIMIT.LOGIN);
export const signupLimiter = build(RATE_LIMIT.SIGNUP);
export const forgotPasswordLimiter = build(RATE_LIMIT.FORGOT_PASSWORD);
export const contactFormLimiter = build(RATE_LIMIT.CONTACT_FORM);
export const publicLimiter = build(RATE_LIMIT.PUBLIC);

export const authenticatedLimiter = build(
  RATE_LIMIT.AUTHENTICATED,
  (req) => req.user?.id ?? req.admin?.id ?? req.ip ?? 'unknown',
);

/** 10 profile-picture upload URLs per user per hour. */
export const avatarUploadLimiter = build(
  RATE_LIMIT.AVATAR_UPLOAD,
  (req) => req.user?.id ?? req.ip ?? 'unknown',
);

export const orderCreateLimiter = build(
  RATE_LIMIT.ORDER_CREATE,
  (req) => req.user?.id ?? req.ip ?? 'unknown',
);

/** Keyed by phone so one attacker cannot exhaust another user's OTP quota. */
export const otpSendLimiter = build(
  RATE_LIMIT.OTP_SEND,
  (req) => (req.body?.phone as string) ?? req.ip ?? 'unknown',
);
