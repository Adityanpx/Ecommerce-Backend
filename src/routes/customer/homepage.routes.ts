import { Router } from 'express';
import { homepageController } from '../../controllers/customer/homepage.controller';
import { slugParamSchema } from '../../validators/catalog.validator';
import { validate } from '../../middlewares/validate';

const router = Router();

router.get('/announcements', homepageController.announcements);
router.get('/trust-badges', homepageController.trustBadges);
router.get('/testimonials', homepageController.testimonials);
router.get('/collections', homepageController.collections);
router.get('/collections/:slug', validate(slugParamSchema), homepageController.collectionBySlug);
router.get('/spotlights/:key', homepageController.spotlight);

export default router;
