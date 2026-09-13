import { Router } from 'express';
import { returnController } from '../../controllers/customer/return.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { createReturnSchema, returnUploadSignatureSchema } from '../../validators/return.validator';
import { idParamSchema } from '../../validators/catalog.validator';
import { authenticatedLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

// Declared before '/' — not a return sub-resource, and rate-limited since
// each call mints a fresh presigned PUT URL.
router.post(
  '/upload/signature',
  authenticatedLimiter,
  validate(returnUploadSignatureSchema),
  returnController.uploadSignature,
);

router.post('/', validate(createReturnSchema), returnController.create);
router.get('/', returnController.list);
router.get('/:id', validate(idParamSchema), returnController.getOne);

export default router;
