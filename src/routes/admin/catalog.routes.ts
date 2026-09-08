import { Router } from 'express';
import { adminCatalogController } from '../../controllers/admin/catalog.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  createSportSchema,
  updateSportSchema,
  createSubCategorySchema,
  updateSubCategorySchema,
  createAttributeSchema,
  updateAttributeSchema,
  reorderAttributesSchema,
  idParamSchema,
} from '../../validators/catalog.validator';

const router = Router();

// Every route below requires a valid admin token.
router.use(authorize);

// Sports
router.get('/sports', adminCatalogController.listSports);
router.post('/sports', validate(createSportSchema), adminCatalogController.createSport);
router.patch('/sports/:id', validate(updateSportSchema), adminCatalogController.updateSport);
router.delete('/sports/:id', validate(idParamSchema), adminCatalogController.deleteSport);

// Sub-categories
router.get('/sub-categories', adminCatalogController.listSubCategories);
router.post(
  '/sub-categories',
  validate(createSubCategorySchema),
  adminCatalogController.createSubCategory,
);
router.patch(
  '/sub-categories/:id',
  validate(updateSubCategorySchema),
  adminCatalogController.updateSubCategory,
);
router.delete(
  '/sub-categories/:id',
  validate(idParamSchema),
  adminCatalogController.deleteSubCategory,
);

// Attributes — reorder is declared before /:id so "reorder" is not read as an id.
router.get('/attributes', adminCatalogController.listAttributes);
router.post('/attributes', validate(createAttributeSchema), adminCatalogController.createAttribute);
router.patch(
  '/attributes/reorder',
  validate(reorderAttributesSchema),
  adminCatalogController.reorderAttributes,
);
router.patch(
  '/attributes/:id',
  validate(updateAttributeSchema),
  adminCatalogController.updateAttribute,
);
router.delete('/attributes/:id', validate(idParamSchema), adminCatalogController.deleteAttribute);

export default router;
