import { Router } from 'express';
import { CustomerReturnController } from './customer.return.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerReturnController();

router.use(authenticateCustomer);

router.post('/', [
  body('orderId').isInt({ min: 1 }).withMessage('Valid order ID is required.'),
  body('orderItemId').isInt({ min: 1 }).withMessage('Valid order item ID is required.'),
  body('reason').trim().notEmpty().withMessage('Reason is required.').isLength({ max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
], validateRequest, controller.requestReturn);

router.get('/', controller.getMyReturns);
router.get('/:id', [param('id').isInt({ min: 1 })], validateRequest, controller.getReturnDetail);

export default router;
