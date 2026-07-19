import { Router } from 'express';
import { CustomerCartController } from './customer.cart.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerCartController();

router.use(authenticateCustomer);

router.get('/', controller.getCart);
router.delete('/', controller.clearCart);

router.post('/items', [
  body('productId').isInt({ min: 1 }).withMessage('Valid product ID required.'),
  body('quantity').optional().isInt({ min: 1, max: 100 }).withMessage('Quantity must be 1–100.'),
], validateRequest, controller.addItem);

router.patch('/items/:id', [
  param('id').isInt({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be 1–100.'),
], validateRequest, controller.updateItem);

router.delete('/items/:id', [param('id').isInt({ min: 1 })], validateRequest, controller.removeItem);
router.post('/items/:id/save-for-later', [param('id').isInt({ min: 1 })], validateRequest, controller.saveForLater);

router.get('/saved', controller.getSaved);
router.post('/saved/:id/move-to-cart', [param('id').isInt({ min: 1 })], validateRequest, controller.moveToCart);

router.post('/apply-coupon', [
  body('couponCode').trim().notEmpty().withMessage('Coupon code is required.').toUpperCase(),
], validateRequest, controller.applyCoupon);

export default router;
