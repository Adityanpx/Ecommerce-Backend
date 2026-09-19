import { Router } from 'express';
import { wishlistController } from '../../controllers/customer/wishlist.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { wishlistItemSchema, wishlistBatchCheckSchema } from '../../validators/wishlist.validator';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/', validate(wishlistItemSchema), wishlistController.addItem);
router.delete('/:productId', wishlistController.removeItem);
router.get('/check/:productId', wishlistController.check);
router.post('/check', validate(wishlistBatchCheckSchema), wishlistController.batchCheck);

export default router;
