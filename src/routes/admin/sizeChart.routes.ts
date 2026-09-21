import { Router } from 'express';
import { adminSizeChartController } from '../../controllers/admin/sizeChart.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { resolveSizeChartSchema } from '../../validators/sizeChart.validator';

const router = Router();

router.use(authorize);

// Read-only: the charts are a built-in library, so there is nothing to create or edit.
router.get('/size-charts', adminSizeChartController.list);
router.get(
  '/size-charts/resolve',
  validate(resolveSizeChartSchema),
  adminSizeChartController.resolve,
);

export default router;
