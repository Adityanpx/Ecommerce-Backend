import { Router } from 'express';
import { cartController } from '../../controllers/customer/cart.controller';
import { validate } from '../../middlewares/validate';
import { optionalAuth, authenticate } from '../../middlewares/authenticate';
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  mergeCartSchema,
} from '../../validators/cart.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

// optionalAuth on every cart route — guests and logged-in users share these.
router.use(optionalAuth);

router.get('/', cartController.get);
router.post('/items', validate(addToCartSchema), cartController.addItem);
router.patch('/items/:id', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:id', validate(idParamSchema), cartController.removeItem);
router.post('/items/:id/save', validate(idParamSchema), cartController.saveForLater);
router.post('/items/:id/move-to-cart', validate(idParamSchema), cartController.moveToCart);

router.post('/coupon', validate(applyCouponSchema), cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);
router.delete('/', cartController.clear);

// Merge requires a real logged-in user.
router.post('/merge', authenticate, validate(mergeCartSchema), cartController.merge);

export default router;
