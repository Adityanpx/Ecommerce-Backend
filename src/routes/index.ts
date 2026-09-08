import { Router } from 'express';
import healthRoutes from './health.routes';

import customerAuthRoutes from './customer/auth.routes';
import customerCatalogRoutes from './customer/catalog.routes';

import adminAuthRoutes from './admin/auth.routes';
import adminCatalogRoutes from './admin/catalog.routes';
import adminProductRoutes from './admin/product.routes';

const router = Router();

router.use('/health', healthRoutes);

// ---------- Customer ----------
router.use('/auth', customerAuthRoutes);
router.use('/', customerCatalogRoutes);

// ---------- Admin ----------
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminCatalogRoutes);
router.use('/admin', adminProductRoutes);

// Phase 3 mounts here: cart, addresses, checkout, orders, payments,
//                      returns, content, admin orders/coupons/settings/dashboard, webhooks

export default router;
