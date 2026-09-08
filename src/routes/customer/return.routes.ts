import { Router } from 'express';
import { returnController } from '../../controllers/customer/return.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { createReturnSchema } from '../../validators/return.validator';
import { idParamSchema } from '../../validators/catalog.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createReturnSchema), returnController.create);
router.get('/', returnController.list);
router.get('/:id', validate(idParamSchema), returnController.getOne);

export default router;
