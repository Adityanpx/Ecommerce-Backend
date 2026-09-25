import { Router } from 'express';
import { catalogToolsController } from '../../controllers/admin/catalogTools.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  createSwatchSchema,
  updateSwatchSchema,
  createSizePresetSchema,
  updateSizePresetSchema,
  saveDraftSchema,
} from '../../validators/product.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

// Colour library
router.get('/color-swatches', catalogToolsController.listSwatches);
router.post('/color-swatches', validate(createSwatchSchema), catalogToolsController.createSwatch);
router.patch(
  '/color-swatches/:id',
  validate(updateSwatchSchema),
  catalogToolsController.updateSwatch,
);
router.delete('/color-swatches/:id', validate(idParamSchema), catalogToolsController.deleteSwatch);

// Size presets
router.get('/size-presets', catalogToolsController.listSizePresets);
router.post(
  '/size-presets',
  validate(createSizePresetSchema),
  catalogToolsController.createSizePreset,
);
router.patch(
  '/size-presets/:id',
  validate(updateSizePresetSchema),
  catalogToolsController.updateSizePreset,
);
router.delete(
  '/size-presets/:id',
  validate(idParamSchema),
  catalogToolsController.deleteSizePreset,
);

// Product-form autosave drafts (private to the signed-in admin)
router.get('/product-drafts', catalogToolsController.listDrafts);
router.get('/product-drafts/:id', validate(idParamSchema), catalogToolsController.getDraft);
router.put('/product-drafts/:id', validate(saveDraftSchema), catalogToolsController.saveDraft);
router.delete('/product-drafts/:id', validate(idParamSchema), catalogToolsController.deleteDraft);

// Inventory (variant-level stock screen)
router.get('/inventory', catalogToolsController.inventory);

export default router;
