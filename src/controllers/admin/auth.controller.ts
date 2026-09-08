import { Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { getRefreshExpiryMs } from '../../utils/jwt';
import { config } from '../../config/env';

const ADMIN_REFRESH_COOKIE = 'adminRefreshToken';

function setAdminRefreshCookie(res: Response, token: string): void {
  res.cookie(ADMIN_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: getRefreshExpiryMs('admin'),
    path: '/',
  });
}

export const adminAuthController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.adminLogin(req.body, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setAdminRefreshCookie(res, result.refreshToken);
    res.json(
      ApiResponse.ok(
        { admin: result.admin, accessToken: result.accessToken },
        'Logged in successfully',
      ),
    );
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE] as string | undefined;
    if (!token) throw ApiError.unauthorized('No refresh token provided');

    const result = await authService.refresh(token, 'admin', {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setAdminRefreshCookie(res, result.refreshToken);
    res.json(ApiResponse.ok({ accessToken: result.accessToken }, 'Token refreshed'));
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE] as string | undefined;
    if (token) await authService.logout(token);
    res.clearCookie(ADMIN_REFRESH_COOKIE, { path: '/' });
    res.json(ApiResponse.ok({ loggedOut: true }, 'Logged out successfully'));
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const admin = await authService.getAdminProfile(req.admin!.id);
    res.json(ApiResponse.ok({ admin }));
  }),
};
