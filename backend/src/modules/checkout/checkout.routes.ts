import { Router } from 'express';
import { CheckoutController } from './checkout.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { checkoutRateLimiter } from '../../common/middleware/rateLimiter.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CheckoutController();

router.use(authenticateCustomer);

const previewValidation = [
  body('addressId').isInt({ min: 1 }).withMessage('Valid address ID required.'),
  body('couponCode').optional().isString().trim().toUpperCase(),
  body('pointsToRedeem').optional().isInt({ min: 0 }),
];

const placeOrderValidation = [
  ...previewValidation,
  body('paymentMethod').notEmpty().isIn(['COD', 'Razorpay', 'Stripe', 'Wallet', 'UPI', 'Card']).withMessage('Invalid payment method.'),
  body('giftMessage').optional().isLength({ max: 500 }),
];

router.post('/summary', previewValidation, validateRequest, controller.previewOrder);
router.post('/place-order', checkoutRateLimiter, placeOrderValidation, validateRequest, controller.placeOrder);

export default router;
