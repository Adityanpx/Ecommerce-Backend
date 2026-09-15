import { Router } from 'express';
import { adminHomepageController } from '../../controllers/admin/homepage.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  createTrustBadgeSchema,
  updateTrustBadgeSchema,
  createTestimonialSchema,
  updateTestimonialSchema,
  createCollectionSchema,
  updateCollectionSchema,
  setCollectionProductsSchema,
  upsertSpotlightSchema,
} from '../../validators/homepage.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authorize);

// Announcements
router.get('/announcements', adminHomepageController.listAnnouncements);
router.post(
  '/announcements',
  validate(createAnnouncementSchema),
  adminHomepageController.createAnnouncement,
);
router.patch(
  '/announcements/:id',
  validate(updateAnnouncementSchema),
  adminHomepageController.updateAnnouncement,
);
router.delete(
  '/announcements/:id',
  validate(idParamSchema),
  adminHomepageController.deleteAnnouncement,
);

// Trust Badges
router.get('/trust-badges', adminHomepageController.listTrustBadges);
router.post(
  '/trust-badges',
  validate(createTrustBadgeSchema),
  adminHomepageController.createTrustBadge,
);
router.patch(
  '/trust-badges/:id',
  validate(updateTrustBadgeSchema),
  adminHomepageController.updateTrustBadge,
);
router.delete(
  '/trust-badges/:id',
  validate(idParamSchema),
  adminHomepageController.deleteTrustBadge,
);

// Testimonials
router.get('/testimonials', adminHomepageController.listTestimonials);
router.post(
  '/testimonials',
  validate(createTestimonialSchema),
  adminHomepageController.createTestimonial,
);
router.patch(
  '/testimonials/:id',
  validate(updateTestimonialSchema),
  adminHomepageController.updateTestimonial,
);
router.delete(
  '/testimonials/:id',
  validate(idParamSchema),
  adminHomepageController.deleteTestimonial,
);

// Collections
router.get('/collections', adminHomepageController.listCollections);
router.post(
  '/collections',
  validate(createCollectionSchema),
  adminHomepageController.createCollection,
);
router.get('/collections/:id', validate(idParamSchema), adminHomepageController.getCollection);
router.patch(
  '/collections/:id',
  validate(updateCollectionSchema),
  adminHomepageController.updateCollection,
);
router.delete(
  '/collections/:id',
  validate(idParamSchema),
  adminHomepageController.deleteCollection,
);
router.put(
  '/collections/:id/products',
  validate(setCollectionProductsSchema),
  adminHomepageController.setCollectionProducts,
);

// Featured Spotlights
router.get('/spotlights', adminHomepageController.listSpotlights);
router.put('/spotlights', validate(upsertSpotlightSchema), adminHomepageController.upsertSpotlight);
router.delete('/spotlights/:id', adminHomepageController.deleteSpotlight);

export default router;
