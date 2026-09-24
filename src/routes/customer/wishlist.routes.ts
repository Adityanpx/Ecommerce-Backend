import { Router } from 'express';
import { wishlistController } from '../../controllers/customer/wishlist.controller';
import { validate } from '../../middlewares/validate';
import { requireCustomer } from '../../middlewares/authenticate';
import { wishlistItemSchema, wishlistBatchCheckSchema } from '../../validators/wishlist.validator';

const router = Router();

// Members only — a signed-out shopper gets 401 AUTH_REQUIRED (storefront shows the sign-in popup).
router.use(requireCustomer);

router.get('/', wishlistController.getWishlist);
router.post('/', validate(wishlistItemSchema), wishlistController.addItem);
router.delete('/:productId', wishlistController.removeItem);
router.get('/check/:productId', wishlistController.check);
router.post('/check', validate(wishlistBatchCheckSchema), wishlistController.batchCheck);

export default router;
