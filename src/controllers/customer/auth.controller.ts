import { Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { getRefreshExpiryMs } from '../../utils/jwt';
import { config } from '../../config/env';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: getRefreshExpiryMs('customer'),
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

function context(req: Request) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.signup(req.body, context(req));
    setRefreshCookie(res, result.refreshToken);
    res
      .status(201)
      .json(
        ApiResponse.created(
          { user: result.user, accessToken: result.accessToken },
          'Account created successfully',
        ),
      );
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, context(req));
    setRefreshCookie(res, result.refreshToken);
    res.json(
      ApiResponse.ok(
        { user: result.user, accessToken: result.accessToken },
        'Logged in successfully',
      ),
    );
  }),

  sendOtp: asyncHandler(async (req: Request, res: Response) => {
    await authService.sendOtp(req.body.phone);
    res.json(ApiResponse.ok({ sent: true }, 'OTP sent successfully'));
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyOtp(req.body, context(req));
    setRefreshCookie(res, result.refreshToken);
    res.json(
      ApiResponse.ok(
        { user: result.user, accessToken: result.accessToken },
        'Logged in successfully',
      ),
    );
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw ApiError.unauthorized('No refresh token provided');

    const result = await authService.refresh(token, 'customer', context(req));
    setRefreshCookie(res, result.refreshToken);
    res.json(ApiResponse.ok({ accessToken: result.accessToken }, 'Token refreshed'));
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) await authService.logout(token);
    clearRefreshCookie(res);
    res.json(ApiResponse.ok({ loggedOut: true }, 'Logged out successfully'));
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    // Always the same message — never confirms whether the email exists.
    res.json(
      ApiResponse.ok(
        { sent: true },
        'If an account exists with that email, a reset link has been sent',
      ),
    );
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json(ApiResponse.ok({ reset: true }, 'Password reset successfully. Please log in.'));
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    clearRefreshCookie(res);
    res.json(
      ApiResponse.ok({ changed: true }, 'Password changed. Please log in again on all devices.'),
    );
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    res.json(ApiResponse.ok({ user }));
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json(ApiResponse.ok({ user }, 'Profile updated'));
  }),
};
