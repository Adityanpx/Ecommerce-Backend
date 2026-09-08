import { Router } from 'express';
import { adminOrderController } from '../../controllers/admin/order.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  updateOrderStatusSchema,
  updateShippingSchema,
  cancelOrderSchema,
} from '../../validators/order.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

// Orders
router.get('/orders', adminOrderController.list);
router.get('/orders/:id', validate(idParamSchema), adminOrderController.getOne);
router.patch(
  '/orders/:id/status',
  validate(updateOrderStatusSchema),
  adminOrderController.updateStatus,
);
router.patch(
  '/orders/:id/shipping',
  validate(updateShippingSchema),
  adminOrderController.updateShipping,
);
router.post('/orders/:id/cancel', validate(cancelOrderSchema), adminOrderController.cancel);
router.post('/orders/:id/refund', validate(idParamSchema), adminOrderController.refund);
router.get('/orders/:id/invoice', validate(idParamSchema), adminOrderController.invoice);

// Customers
router.get('/customers', adminOrderController.listCustomers);
router.get('/customers/:id', validate(idParamSchema), adminOrderController.getCustomer);
router.patch(
  '/customers/:id/status',
  validate(idParamSchema),
  adminOrderController.setCustomerStatus,
);

export default router;
