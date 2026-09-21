import { Router } from 'express';
import healthRoutes from './health.routes';

import customerAuthRoutes from './customer/auth.routes';
import customerCatalogRoutes from './customer/catalog.routes';
import customerCartRoutes from './customer/cart.routes';
import customerOrderRoutes from './customer/order.routes';
import customerReturnRoutes from './customer/return.routes';
import customerContentRoutes from './customer/content.routes';
import customerHomepageRoutes from './customer/homepage.routes';

import adminAuthRoutes from './admin/auth.routes';
import adminCatalogRoutes from './admin/catalog.routes';
import adminProductRoutes from './admin/product.routes';
import adminOrderRoutes from './admin/order.routes';
import adminOperationsRoutes from './admin/operations.routes';
import adminHomepageRoutes from './admin/homepage.routes';
import adminBrandRoutes from './admin/brand.routes';
import adminSizeChartRoutes from './admin/sizeChart.routes';
import adminPromotionRoutes from './admin/promotion.routes';

import razorpayWebhookRoutes from './webhooks/razorpay.routes';

const router = Router();

router.use('/health', healthRoutes);

// ---------- Customer ----------
router.use('/auth', customerAuthRoutes);
router.use('/cart', customerCartRoutes);
router.use('/returns', customerReturnRoutes);
router.use('/content', customerContentRoutes);
router.use('/homepage', customerHomepageRoutes);

// Mounted at root — these routers define their own path prefixes
// (/sports, /products, /orders, /addresses, /checkout, /payments).
router.use('/', customerCatalogRoutes);
router.use('/', customerOrderRoutes);

// ---------- Admin ----------
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminCatalogRoutes);
router.use('/admin', adminProductRoutes);
router.use('/admin', adminOrderRoutes);
router.use('/admin', adminOperationsRoutes);
router.use('/admin', adminHomepageRoutes);
router.use('/admin', adminBrandRoutes);
router.use('/admin', adminSizeChartRoutes);
router.use('/admin', adminPromotionRoutes);

// ---------- Webhooks ----------
router.use('/webhooks/razorpay', razorpayWebhookRoutes);

export default router;
