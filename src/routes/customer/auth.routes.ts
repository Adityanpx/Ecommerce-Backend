import { Router } from 'express';
import { authController } from '../../controllers/customer/auth.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  loginLimiter,
  signupLimiter,
  otpSendLimiter,
  forgotPasswordLimiter,
  avatarUploadLimiter,
} from '../../middlewares/rateLimiter';
import {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  avatarUploadUrlSchema,
  setAvatarSchema,
} from '../../validators/auth.validator';

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/otp/send', otpSendLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateMe);

// Profile picture: get upload URL -> browser PUTs the file to R2 -> save the key.
router.post(
  '/me/avatar/upload-url',
  authenticate,
  avatarUploadLimiter,
  validate(avatarUploadUrlSchema),
  authController.avatarUploadUrl,
);
router.put('/me/avatar', authenticate, validate(setAvatarSchema), authController.setAvatar);
router.delete('/me/avatar', authenticate, authController.removeAvatar);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
