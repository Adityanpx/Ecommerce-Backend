import { Router } from 'express';
import { orderController } from '../../controllers/customer/order.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, optionalAuth, requireCustomer } from '../../middlewares/authenticate';
import { orderCreateLimiter } from '../../middlewares/rateLimiter';
import {
  createAddressSchema,
  updateAddressSchema,
  checkoutSummarySchema,
  createOrderSchema,
  verifyPaymentSchema,
  cancelOrderSchema,
} from '../../validators/order.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

// ---------- Addresses (logged-in only) ----------
router.get('/addresses', authenticate, orderController.listAddresses);
router.post(
  '/addresses',
  authenticate,
  validate(createAddressSchema),
  orderController.createAddress,
);
router.patch(
  '/addresses/:id',
  authenticate,
  validate(updateAddressSchema),
  orderController.updateAddress,
);
router.delete(
  '/addresses/:id',
  authenticate,
  validate(idParamSchema),
  orderController.deleteAddress,
);
router.post(
  '/addresses/:id/default',
  authenticate,
  validate(idParamSchema),
  orderController.setDefaultAddress,
);

// ---------- Checkout (members only — guest checkout is switched off) ----------
router.post(
  '/checkout/summary',
  requireCustomer,
  validate(checkoutSummarySchema),
  orderController.summary,
);
router.post(
  '/orders',
  requireCustomer,
  orderCreateLimiter,
  validate(createOrderSchema),
  orderController.create,
);
router.post(
  '/payments/verify',
  requireCustomer,
  validate(verifyPaymentSchema),
  orderController.verifyPayment,
);

// ---------- Orders ----------
router.get('/orders', authenticate, orderController.list);
// optionalAuth kept: orders placed as a guest before this change are still viewable by number.
router.get('/orders/:orderNumber', optionalAuth, orderController.getOne);
router.post(
  '/orders/:id/cancel',
  authenticate,
  validate(cancelOrderSchema),
  orderController.cancel,
);
router.get('/orders/:id/invoice', authenticate, validate(idParamSchema), orderController.invoice);

export default router;
