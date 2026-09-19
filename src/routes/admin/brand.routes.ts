import { Router } from 'express';
import { adminBrandController } from '../../controllers/admin/brand.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { createBrandSchema, updateBrandSchema } from '../../validators/brand.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

router.get('/brands', adminBrandController.list);
router.post('/brands', validate(createBrandSchema), adminBrandController.create);
router.get('/brands/:id', validate(idParamSchema), adminBrandController.getOne);
router.patch('/brands/:id', validate(updateBrandSchema), adminBrandController.update);
router.delete('/brands/:id', validate(idParamSchema), adminBrandController.remove);

export default router;
