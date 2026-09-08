import { Router } from 'express';
import { adminOperationsController } from '../../controllers/admin/operations.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { createCouponSchema, updateCouponSchema } from '../../validators/coupon.validator';
import { updateReturnStatusSchema, processRefundSchema } from '../../validators/return.validator';
import {
  createBannerSchema,
  updateBannerSchema,
  upsertPageSchema,
  updateSettingsSchema,
} from '../../validators/content.validator';
import { idParamSchema, slugParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

// ---------- Dashboard (declared first — all literal paths) ----------
router.get('/dashboard/stats', adminOperationsController.dashboardStats);
router.get('/dashboard/sales', adminOperationsController.dashboardSales);
router.get('/dashboard/top-products', adminOperationsController.dashboardTopProducts);
router.get('/dashboard/top-categories', adminOperationsController.dashboardTopCategories);
router.get('/dashboard/low-stock', adminOperationsController.dashboardLowStock);
router.get('/dashboard/recent-orders', adminOperationsController.dashboardRecentOrders);

// ---------- Coupons ----------
router.get('/coupons', adminOperationsController.listCoupons);
router.post('/coupons', validate(createCouponSchema), adminOperationsController.createCoupon);
router.get('/coupons/:id', validate(idParamSchema), adminOperationsController.getCoupon);
router.patch('/coupons/:id', validate(updateCouponSchema), adminOperationsController.updateCoupon);

// ---------- Returns ----------
router.get('/returns', adminOperationsController.listReturns);
router.get('/returns/:id', validate(idParamSchema), adminOperationsController.getReturn);
router.patch(
  '/returns/:id/status',
  validate(updateReturnStatusSchema),
  adminOperationsController.updateReturnStatus,
);
router.post(
  '/returns/:id/refund',
  validate(processRefundSchema),
  adminOperationsController.processReturnRefund,
);

// ---------- Banners ----------
router.get('/banners', adminOperationsController.listBanners);
router.post('/banners', validate(createBannerSchema), adminOperationsController.createBanner);
router.patch('/banners/:id', validate(updateBannerSchema), adminOperationsController.updateBanner);
router.delete('/banners/:id', validate(idParamSchema), adminOperationsController.deleteBanner);

// ---------- Static pages ----------
router.get('/pages', adminOperationsController.listPages);
router.put('/pages', validate(upsertPageSchema), adminOperationsController.upsertPage);
router.delete('/pages/:slug', validate(slugParamSchema), adminOperationsController.deletePage);

// ---------- Contact messages ----------
router.get('/contact-messages', adminOperationsController.listContactMessages);
router.patch(
  '/contact-messages/:id/read',
  validate(idParamSchema),
  adminOperationsController.markMessageRead,
);

// ---------- Settings ----------
router.get('/settings', adminOperationsController.listSettings);
router.patch('/settings', validate(updateSettingsSchema), adminOperationsController.updateSettings);

export default router;
