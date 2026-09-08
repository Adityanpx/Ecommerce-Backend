import { OtpCode, OtpPurpose, PasswordResetToken, RefreshToken } from '@prisma/client';
import { prisma } from '../config/database';

export const tokenRepository = {
  // ---------- Refresh tokens ----------

  createRefreshToken(data: {
    tokenHash: string;
    userId?: string;
    adminId?: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  /** Used on reuse detection and on password change. */
  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllForAdmin(adminId: string) {
    return prisma.refreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // ---------- OTP ----------

  createOtp(data: {
    phone: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<OtpCode> {
    return prisma.otpCode.create({ data });
  },

  /** Most recent unconsumed OTP for a phone number. */
  findActiveOtp(phone: string): Promise<OtpCode | null> {
    return prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  },

  incrementOtpAttempts(id: string): Promise<OtpCode> {
    return prisma.otpCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  consumeOtp(id: string): Promise<OtpCode> {
    return prisma.otpCode.update({ where: { id }, data: { consumedAt: new Date() } });
  },

  /** Invalidate any earlier codes when a new one is issued. */
  invalidateOtpsForPhone(phone: string) {
    return prisma.otpCode.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  },

  // ---------- Password reset ----------

  createPasswordReset(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({ data });
  },

  findPasswordReset(tokenHash: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  },

  consumePasswordReset(id: string): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
