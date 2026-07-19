import { Router } from 'express';
import { CustomerOrderController } from './customer.order.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerOrderController();

router.use(authenticateCustomer);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isString(),
], validateRequest, controller.getMyOrders);

router.get('/recent', controller.getRecentOrders);

router.get('/:id', [param('id').isInt({ min: 1 })], validateRequest, controller.getOrderDetails);

router.post('/:id/cancel', [
  param('id').isInt({ min: 1 }),
  body('reason').optional().isLength({ max: 500 }),
], validateRequest, controller.cancelOrder);

router.get('/:id/timeline', [param('id').isInt({ min: 1 })], validateRequest, controller.getOrderTimeline);

export default router;
