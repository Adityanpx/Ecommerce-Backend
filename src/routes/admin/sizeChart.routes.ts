import { Router } from 'express';
import { adminSizeChartController } from '../../controllers/admin/sizeChart.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { createSizeChartSchema, updateSizeChartSchema } from '../../validators/sizeChart.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

router.get('/size-charts/sub-category/:subCategoryId', adminSizeChartController.getBySubCategory);
router.post('/size-charts', validate(createSizeChartSchema), adminSizeChartController.create);
router.get('/size-charts/:id', validate(idParamSchema), adminSizeChartController.getOne);
router.patch('/size-charts/:id', validate(updateSizeChartSchema), adminSizeChartController.update);
router.delete('/size-charts/:id', validate(idParamSchema), adminSizeChartController.remove);

export default router;
