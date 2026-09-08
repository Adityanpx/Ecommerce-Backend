import { Router } from 'express';
import { adminAuthController } from '../../controllers/admin/auth.controller';
import { validate } from '../../middlewares/validate';
import { authorize } from '../../middlewares/authenticate';
import { loginLimiter } from '../../middlewares/rateLimiter';
import { adminLoginSchema } from '../../validators/auth.validator';

const router = Router();

router.post('/login', loginLimiter, validate(adminLoginSchema), adminAuthController.login);
router.post('/refresh', adminAuthController.refresh);
router.post('/logout', adminAuthController.logout);
router.get('/me', authorize, adminAuthController.me);

export default router;
