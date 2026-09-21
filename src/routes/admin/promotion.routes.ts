import { Router } from 'express';
import { adminPromotionController } from '../../controllers/admin/promotion.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { createPromotionSchema, updatePromotionSchema } from '../../validators/promotion.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

router.get('/promotions', adminPromotionController.list);
router.post('/promotions', validate(createPromotionSchema), adminPromotionController.create);
router.get('/promotions/:id', validate(idParamSchema), adminPromotionController.getOne);
router.patch('/promotions/:id', validate(updatePromotionSchema), adminPromotionController.update);
router.delete('/promotions/:id', validate(idParamSchema), adminPromotionController.remove);

export default router;
