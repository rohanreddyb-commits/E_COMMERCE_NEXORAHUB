import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new PaymentController();

router.use(authenticateCustomer);

router.post('/initiate', [body('orderId').isInt({ min: 1 })], validateRequest, controller.initiatePayment);
router.post('/verify', [body('orderId').isInt({ min: 1 })], validateRequest, controller.verifyPayment);
router.get('/history', controller.getHistory);

export default router;
