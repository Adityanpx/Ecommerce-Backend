import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);

// Phase 2 mounts here: auth, sports, sub-categories, attributes, products, search, upload
// Phase 3 mounts here: cart, addresses, checkout, orders, payments, returns, content,
//                      admin management routes, webhooks

export default router;
