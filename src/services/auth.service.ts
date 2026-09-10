import { addHours, addMinutes } from 'date-fns';
import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { adminRepository } from '../repositories/admin.repository';
import { tokenRepository } from '../repositories/token.repository';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateTokenPair,
  hashToken,
  verifyRefreshToken,
  getRefreshExpiryMs,
  CustomerTokenPayload,
  AdminTokenPayload,
  TokenType,
} from '../utils/jwt';
import { generateOtp, generateRandomToken, sha256 } from '../utils/generators';
import { ApiError } from '../utils/ApiError';
import { AUTH } from '../config/constants';
import { config } from '../config/env';
import { sendOtpSms } from '../integrations/msg91/sendOtp';
import { sendEmail } from '../integrations/resend/sendEmail';
import { welcomeEmail, passwordResetEmail } from '../integrations/resend/templates/auth.templates';
import { logger } from '../utils/logger';

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  };
}

async function issueTokens(
  payload: CustomerTokenPayload | AdminTokenPayload,
  ctx: RequestContext,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { accessToken, refreshToken } = generateTokenPair(payload);

  await tokenRepository.createRefreshToken({
    tokenHash: hashToken(refreshToken),
    userId: payload.type === 'customer' ? payload.sub : undefined,
    adminId: payload.type === 'admin' ? payload.sub : undefined,
    expiresAt: new Date(Date.now() + getRefreshExpiryMs(payload.type)),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async signup(
    input: {
      firstName: string;
      lastName?: string;
      email: string;
      phone?: string;
      password: string;
    },
    ctx: RequestContext,
  ): Promise<AuthResult> {
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw ApiError.conflict('An account with this email already exists', [
        { field: 'email', message: 'Already registered' },
      ]);
    }

    if (input.phone) {
      const existingPhone = await userRepository.findByPhone(input.phone);
      if (existingPhone) {
        throw ApiError.conflict('An account with this phone number already exists', [
          { field: 'phone', message: 'Already registered' },
        ]);
      }
    }

    const user = await userRepository.create({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
    });

    const tokens = await issueTokens(
      { sub: user.id, type: 'customer', email: user.email ?? undefined },
      ctx,
    );

    // Fire-and-forget — a failed welcome email must not fail signup.
    const template = welcomeEmail(user.firstName);
    void sendEmail({ to: input.email, subject: template.subject, html: template.html });

    return { user: toPublicUser(user), ...tokens };
  },

  async login(
    input: { email: string; password: string },
    ctx: RequestContext,
  ): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);

    // Identical message for unknown email and wrong password — do not reveal which.
    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated');
    }

    await userRepository.touchLastLogin(user.id);
    const tokens = await issueTokens(
      { sub: user.id, type: 'customer', email: user.email ?? undefined },
      ctx,
    );

    return { user: toPublicUser(user), ...tokens };
  },

  async sendOtp(phone: string): Promise<void> {
    const user = await userRepository.findByPhone(phone);
    const purpose = user ? 'LOGIN' : 'SIGNUP';

    // Only one live OTP per phone at a time.
    await tokenRepository.invalidateOtpsForPhone(phone);

    const code = generateOtp();
    await tokenRepository.createOtp({
      phone,
      codeHash: sha256(code),
      purpose,
      expiresAt: addMinutes(new Date(), AUTH.OTP_EXPIRY_MINUTES),
    });

    const sent = await sendOtpSms(phone, code);

    if (!sent && config.isDevelopment) {
      // Local development without MSG91 credentials — log the code so the flow is testable.
      logger.warn(`DEV OTP for ${phone}: ${code}`);
      return;
    }

    if (!sent) {
      throw ApiError.internal('Could not send OTP. Please try again.');
    }
  },

  async verifyOtp(
    input: { phone: string; code: string; firstName?: string },
    ctx: RequestContext,
  ): Promise<AuthResult> {
    const otp = await tokenRepository.findActiveOtp(input.phone);

    if (!otp) {
      throw ApiError.badRequest('OTP is invalid or has expired. Request a new one.');
    }

    if (otp.attempts >= AUTH.OTP_MAX_ATTEMPTS) {
      await tokenRepository.consumeOtp(otp.id);
      throw ApiError.badRequest('Too many incorrect attempts. Request a new OTP.');
    }

    if (otp.codeHash !== sha256(input.code)) {
      await tokenRepository.incrementOtpAttempts(otp.id);
      throw ApiError.badRequest('Incorrect OTP');
    }

    await tokenRepository.consumeOtp(otp.id);

    let user = await userRepository.findByPhone(input.phone);

    if (!user) {
      if (!input.firstName) {
        throw ApiError.badRequest('firstName is required to create a new account', [
          { field: 'firstName', message: 'Required for signup' },
        ]);
      }
      user = await userRepository.create({
        firstName: input.firstName,
        phone: input.phone,
        phoneVerified: true,
      });
    } else {
      if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
      user = await userRepository.update(user.id, {
        phoneVerified: true,
        lastLoginAt: new Date(),
      });
    }

    const tokens = await issueTokens(
      { sub: user.id, type: 'customer', email: user.email ?? undefined },
      ctx,
    );

    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Rotation with reuse detection. A revoked token being presented again means
   * it leaked — every session for that account is killed, not just this request.
   */
  async refresh(
    token: string,
    type: TokenType,
    ctx: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: CustomerTokenPayload | AdminTokenPayload;

    try {
      payload = verifyRefreshToken(token, type);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const stored = await tokenRepository.findRefreshToken(hashToken(token));

    if (!stored) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (stored.revokedAt) {
      logger.error('Refresh token reuse detected', {
        userId: stored.userId,
        adminId: stored.adminId,
      });
      if (stored.userId) await tokenRepository.revokeAllForUser(stored.userId);
      if (stored.adminId) await tokenRepository.revokeAllForAdmin(stored.adminId);
      throw ApiError.unauthorized('Session invalidated. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired');
    }

    await tokenRepository.revokeRefreshToken(stored.id);

    // jwt.verify() returns the full decoded payload, including the old
    // token's iat/exp/jti claims. jwt.sign() refuses to combine an
    // expiresIn/jwtid option with a payload that already carries the
    // corresponding exp/jti claim, so all three must be stripped before
    // re-signing a fresh token pair.
    const {
      exp: _exp,
      iat: _iat,
      jti: _jti,
      ...cleanPayload
    } = payload as (CustomerTokenPayload | AdminTokenPayload) & {
      iat?: number;
      exp?: number;
      jti?: string;
    };
    return issueTokens(cleanPayload, ctx);
  },

  async logout(token: string): Promise<void> {
    const stored = await tokenRepository.findRefreshToken(hashToken(token));
    if (stored && !stored.revokedAt) {
      await tokenRepository.revokeRefreshToken(stored.id);
    }
  },

  /** Always resolves successfully — never confirms whether an email is registered. */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const rawToken = generateRandomToken(32);
    await tokenRepository.createPasswordReset({
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt: addHours(new Date(), AUTH.PASSWORD_RESET_EXPIRY_HOURS),
    });

    const resetUrl = `${config.cors.customerAppUrl}/reset-password?token=${rawToken}`;
    const template = passwordResetEmail(user.firstName, resetUrl);
    void sendEmail({ to: email, subject: template.subject, html: template.html });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await tokenRepository.findPasswordReset(sha256(token));

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiError.badRequest('This reset link is invalid or has expired');
    }

    await userRepository.update(record.userId, {
      passwordHash: await hashPassword(newPassword),
    });

    await tokenRepository.consumePasswordReset(record.id);
    await tokenRepository.revokeAllForUser(record.userId);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw ApiError.badRequest('This account has no password set. Use forgot password instead.');
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw ApiError.badRequest('Current password is incorrect', [
        { field: 'currentPassword', message: 'Incorrect' },
      ]);
    }

    await userRepository.update(userId, { passwordHash: await hashPassword(newPassword) });
    await tokenRepository.revokeAllForUser(userId);
  },

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async updateProfile(
    userId: string,
    input: {
      firstName?: string;
      lastName?: string | null;
      phone?: string;
      avatarUrl?: string | null;
    },
  ): Promise<PublicUser> {
    if (input.phone) {
      const existing = await userRepository.findByPhone(input.phone);
      if (existing && existing.id !== userId) {
        throw ApiError.conflict('This phone number is already in use', [
          { field: 'phone', message: 'Already registered' },
        ]);
      }
    }

    const user = await userRepository.update(userId, input);
    return toPublicUser(user);
  },

  // ---------- Admin ----------

  async adminLogin(
    input: { email: string; password: string },
    ctx: RequestContext,
  ): Promise<{
    admin: { id: string; email: string; name: string; role: string };
    accessToken: string;
    refreshToken: string;
  }> {
    const admin = await adminRepository.findByEmail(input.email);

    if (!admin) throw ApiError.unauthorized('Invalid email or password');

    const valid = await comparePassword(input.password, admin.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    if (!admin.isActive) throw ApiError.forbidden('This admin account has been deactivated');

    await adminRepository.touchLastLogin(admin.id);
    const tokens = await issueTokens({ sub: admin.id, type: 'admin', role: admin.role }, ctx);

    return {
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      ...tokens,
    };
  },

  async getAdminProfile(adminId: string) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw ApiError.notFound('Admin not found');
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    };
  },
};
