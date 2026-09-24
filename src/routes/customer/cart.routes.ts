import { Router } from 'express';
import { cartController } from '../../controllers/customer/cart.controller';
import { validate } from '../../middlewares/validate';
import { optionalAuth, requireCustomer } from '../../middlewares/authenticate';
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  mergeCartSchema,
} from '../../validators/cart.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

/**
 * The cart is members-only. Browsing stays open to everyone, but adding to
 * the cart, changing it, and checking out require a signed-in customer.
 *
 * GET stays readable without a token so the header badge can render for a
 * signed-out visitor: it returns an empty cart and never creates a guest cart.
 */
router.get('/', optionalAuth, cartController.get);

router.use(requireCustomer);

router.post('/items', validate(addToCartSchema), cartController.addItem);
router.patch('/items/:id', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:id', validate(idParamSchema), cartController.removeItem);
router.post('/items/:id/save', validate(idParamSchema), cartController.saveForLater);
router.post('/items/:id/move-to-cart', validate(idParamSchema), cartController.moveToCart);

router.post('/coupon', validate(applyCouponSchema), cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);
router.delete('/', cartController.clear);

// Kept so carts created by guests before this change can still be merged once after login.
router.post('/merge', validate(mergeCartSchema), cartController.merge);

export default router;
