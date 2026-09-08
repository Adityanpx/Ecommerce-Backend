import { Router } from 'express';
import { contentController } from '../../controllers/customer/content.controller';
import { validate } from '../../middlewares/validate';
import { contactFormLimiter } from '../../middlewares/rateLimiter';
import { contactFormSchema } from '../../validators/content.validator';
import { slugParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.get('/banners', contentController.banners);
router.get('/announcement', contentController.announcement);
router.get('/pages/:slug', validate(slugParamSchema), contentController.page);
router.post('/contact', contactFormLimiter, validate(contactFormSchema), contentController.contact);

export default router;
