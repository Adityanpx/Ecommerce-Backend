import { z } from 'zod';
import { AUTH } from '../config/constants';

const passwordField = z
  .string()
  .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const phoneField = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const signupSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email('Enter a valid email address').toLowerCase(),
    phone: phoneField.optional(),
    password: passwordField,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: phoneField,
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneField,
    code: z.string().length(AUTH.OTP_LENGTH, `OTP must be ${AUTH.OTP_LENGTH} digits`),
    firstName: z.string().min(1).max(100).optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordField,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).nullable().optional(),
    phone: phoneField.optional(),
    avatarUrl: z.string().url().nullable().optional(),
  }),
});

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});
