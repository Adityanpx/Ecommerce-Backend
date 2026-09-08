import { Router } from 'express';
import { catalogController } from '../../controllers/customer/catalog.controller';
import { validate } from '../../middlewares/validate';
import { slugParamSchema, idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.get('/sports', catalogController.listSports);
router.get('/sports/:slug', validate(slugParamSchema), catalogController.getSport);
router.get('/sub-categories/:slug', validate(slugParamSchema), catalogController.getSubCategory);

router.get('/products', catalogController.listProducts);
router.get('/products/:slug', validate(slugParamSchema), catalogController.getProduct);
router.get('/products/:id/stock', validate(idParamSchema), catalogController.getProductStock);

router.get('/search', catalogController.search);

export default router;
