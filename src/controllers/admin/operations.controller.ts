import { Request, Response } from 'express';
import { ReturnStatus } from '@prisma/client';
import { couponService } from '../../services/coupon.service';
import { returnService } from '../../services/return.service';
import { contentService } from '../../services/content.service';
import { settingsService } from '../../services/settings.service';
import { dashboardService } from '../../services/dashboard.service';
import { uploadService } from '../../services/upload.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export const adminOperationsController = {
  // ---------- Coupons ----------

  listCoupons: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const activeOnly = req.query.active === 'true';

    const { items, total } = await couponService.list(skip, take, activeOnly);
    res.json(
      ApiResponse.ok({ coupons: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getCoupon: asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.getById(req.params.id);
    res.json(ApiResponse.ok({ coupon }));
  }),

  createCoupon: asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.create(req.body);
    res.status(201).json(ApiResponse.created({ coupon }, 'Coupon created'));
  }),

  updateCoupon: asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ coupon }, 'Coupon updated'));
  }),

  // ---------- Returns ----------

  listReturns: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const status = req.query.status as ReturnStatus | undefined;

    const { items, total } = await returnService.list({ status }, skip, take);
    res.json(
      ApiResponse.ok({ returns: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getReturn: asyncHandler(async (req: Request, res: Response) => {
    const record = await returnService.getById(req.params.id);
    res.json(ApiResponse.ok({ return: record }));
  }),

  updateReturnStatus: asyncHandler(async (req: Request, res: Response) => {
    const record = await returnService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.adminNote,
    );
    res.json(ApiResponse.ok({ return: record }, 'Return updated'));
  }),

  processReturnRefund: asyncHandler(async (req: Request, res: Response) => {
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : undefined;
    const record = await returnService.processRefund(req.params.id, amount);
    res.json(ApiResponse.ok({ return: record }, 'Refund processed'));
  }),

  // ---------- Content ----------

  listBanners: asyncHandler(async (_req: Request, res: Response) => {
    const banners = await contentService.listBanners();
    res.json(ApiResponse.ok({ banners }));
  }),

  createBanner: asyncHandler(async (req: Request, res: Response) => {
    const banner = await contentService.createBanner(req.body);
    res.status(201).json(ApiResponse.created({ banner }, 'Banner created'));
  }),

  updateBanner: asyncHandler(async (req: Request, res: Response) => {
    const banner = await contentService.updateBanner(req.params.id, req.body);
    res.json(ApiResponse.ok({ banner }, 'Banner updated'));
  }),

  deleteBanner: asyncHandler(async (req: Request, res: Response) => {
    await contentService.deleteBanner(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Banner deleted'));
  }),

  listPages: asyncHandler(async (_req: Request, res: Response) => {
    const pages = await contentService.listPages();
    res.json(ApiResponse.ok({ pages }));
  }),

  upsertPage: asyncHandler(async (req: Request, res: Response) => {
    const page = await contentService.upsertPage(req.body);
    res.json(ApiResponse.ok({ page }, 'Page saved'));
  }),

  deletePage: asyncHandler(async (req: Request, res: Response) => {
    await contentService.deletePage(req.params.slug);
    res.json(ApiResponse.ok({ deleted: true }, 'Page deleted'));
  }),

  listContactMessages: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const unreadOnly = req.query.unread === 'true';

    const { items, total } = await contentService.listContactMessages(skip, take, unreadOnly);
    res.json(
      ApiResponse.ok({ messages: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  markMessageRead: asyncHandler(async (req: Request, res: Response) => {
    const message = await contentService.markMessageRead(req.params.id);
    res.json(ApiResponse.ok({ message }, 'Marked as read'));
  }),

  // ---------- Settings ----------

  listSettings: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.listRaw();
    res.json(ApiResponse.ok({ settings }));
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    await settingsService.updateMany(req.body.settings);
    const settings = await settingsService.listRaw();
    res.json(ApiResponse.ok({ settings }, 'Settings updated'));
  }),

  // ---------- Dashboard ----------

  dashboardStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await dashboardService.stats();
    res.json(ApiResponse.ok(stats));
  }),

  dashboardSales: asyncHandler(async (req: Request, res: Response) => {
    const series = await dashboardService.sales(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );
    res.json(ApiResponse.ok({ series }));
  }),

  dashboardTopProducts: asyncHandler(async (req: Request, res: Response) => {
    const products = await dashboardService.topProducts(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );
    res.json(ApiResponse.ok({ products }));
  }),

  dashboardTopCategories: asyncHandler(async (req: Request, res: Response) => {
    const categories = await dashboardService.topCategories(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );
    res.json(ApiResponse.ok({ categories }));
  }),

  dashboardLowStock: asyncHandler(async (_req: Request, res: Response) => {
    const variants = await dashboardService.lowStock();
    res.json(ApiResponse.ok({ variants }));
  }),

  dashboardRecentOrders: asyncHandler(async (_req: Request, res: Response) => {
    const orders = await dashboardService.recentOrders();
    res.json(ApiResponse.ok({ orders }));
  }),

  uploadSignature: asyncHandler(async (req: Request, res: Response) => {
    const signature = uploadService.getSignature(req.body.folder);
    res.json(ApiResponse.ok(signature));
  }),
};
