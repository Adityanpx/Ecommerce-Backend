import { Router } from 'express';
import { adminProductController } from '../../controllers/admin/product.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  bulkCreateVariantsSchema,
  updateVariantSchema,
  attachImagesSchema,
  reorderImagesSchema,
  updateImageSchema,
  bulkProductActionSchema,
  bulkEditSchema,
  duplicateProductSchema,
  setRelationsSchema,
  createColorSchema,
  updateColorSchema,
  reorderColorsSchema,
  stockAdjustmentSchema,
  stockGridSchema,
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

// Static paths before /products/:id so they are not matched as an id.
router.patch(
  '/products/bulk',
  validate(bulkProductActionSchema),
  adminProductController.bulkAction,
);
router.patch('/products/bulk-edit', validate(bulkEditSchema), adminProductController.bulkEdit);
router.get('/products/meta', adminProductController.meta);

router.get('/products', adminProductController.list);
router.post('/products', validate(createProductSchema), adminProductController.create);
router.get('/products/:id', validate(idParamSchema), adminProductController.getOne);
router.patch('/products/:id', validate(updateProductSchema), adminProductController.update);
router.delete('/products/:id', validate(idParamSchema), adminProductController.remove);
router.post(
  '/products/:id/duplicate',
  validate(duplicateProductSchema),
  adminProductController.duplicate,
);
router.put(
  '/products/:id/relations',
  validate(setRelationsSchema),
  adminProductController.setRelations,
);

// Stock
router.get(
  '/products/:id/stock-history',
  validate(idParamSchema),
  adminProductController.stockHistory,
);
router.put(
  '/products/:id/stock',
  validate(stockGridSchema),
  adminProductController.updateStockGrid,
);
router.post(
  '/variants/:id/stock-adjustments',
  validate(stockAdjustmentSchema),
  adminProductController.adjustStock,
);
router.get(
  '/variants/:id/stock-history',
  validate(idParamSchema),
  adminProductController.variantStockHistory,
);

// Colours — reorder before /colors/:id.
router.post('/products/:id/colors', validate(createColorSchema), adminProductController.addColor);
router.patch(
  '/products/:id/colors/reorder',
  validate(reorderColorsSchema),
  adminProductController.reorderColors,
);
router.patch('/colors/:id', validate(updateColorSchema), adminProductController.updateColor);
router.delete('/colors/:id', validate(idParamSchema), adminProductController.deleteColor);

// Variants — bulk before single so "bulk" is not treated as an id.
router.post(
  '/products/:id/variants/bulk',
  validate(bulkCreateVariantsSchema),
  adminProductController.addVariants,
);
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
router.patch('/images/:id', validate(updateImageSchema), adminProductController.updateImage);
router.delete('/images/:id', validate(idParamSchema), adminProductController.deleteImage);

export default router;
