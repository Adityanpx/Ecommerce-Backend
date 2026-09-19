import { Router } from 'express';
import { adminProductController } from '../../controllers/admin/product.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  attachImagesSchema,
  reorderImagesSchema,
  bulkProductActionSchema,
  uploadSignatureSchema,
} from '../../validators/product.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

// Upload signature — declared first, it is not a product sub-resource.
router.post(
  '/upload/signature',
  validate(uploadSignatureSchema),
  adminProductController.uploadSignature,
);

// Bulk before /:id so "bulk" is not matched as an id.
router.patch(
  '/products/bulk',
  validate(bulkProductActionSchema),
  adminProductController.bulkAction,
);

router.get('/products', adminProductController.list);
router.post('/products', validate(createProductSchema), adminProductController.create);
router.get('/products/:id', validate(idParamSchema), adminProductController.getOne);
router.patch('/products/:id', validate(updateProductSchema), adminProductController.update);
router.delete('/products/:id', validate(idParamSchema), adminProductController.remove);
router.get(
  '/products/:id/stock-history',
  validate(idParamSchema),
  adminProductController.stockHistory,
);

// Variants
router.post(
  '/products/:id/variants',
  validate(createVariantSchema),
  adminProductController.addVariant,
);
router.patch('/variants/:id', validate(updateVariantSchema), adminProductController.updateVariant);
router.delete('/variants/:id', validate(idParamSchema), adminProductController.deleteVariant);

// Images — reorder before /:id.
router.patch(
  '/images/reorder',
  validate(reorderImagesSchema),
  adminProductController.reorderImages,
);
router.post(
  '/products/:id/images',
  validate(attachImagesSchema),
  adminProductController.attachImages,
);
router.delete('/images/:id', validate(idParamSchema), adminProductController.deleteImage);

export default router;
