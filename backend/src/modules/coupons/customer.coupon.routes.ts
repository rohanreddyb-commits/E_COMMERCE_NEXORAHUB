import { Router } from 'express';
import { CustomerCouponController } from './customer.coupon.controller';
import { body } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerCouponController();

router.get('/available', controller.getAvailable);
router.post('/validate', [
  body('code').trim().notEmpty().isString().toUpperCase(),
  body('subtotal').isNumeric().custom((val) => val >= 0),
], validateRequest, controller.validate);

export default router;
