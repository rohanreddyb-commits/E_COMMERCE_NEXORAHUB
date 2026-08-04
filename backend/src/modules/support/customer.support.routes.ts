import { Router } from 'express';
import { CustomerSupportController } from './customer.support.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { contentWriteRateLimiter } from '../../common/middleware/rateLimiter.middleware';

const router = Router();
const controller = new CustomerSupportController();

router.use(authenticateCustomer);

router.post('/', contentWriteRateLimiter, [
  body('subject').trim().notEmpty().isLength({ max: 200 }),
  body('category').trim().notEmpty().isIn(['Order Issue', 'Payment Issue', 'Product Issue', 'Delivery', 'Account', 'General']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('message').trim().notEmpty().isLength({ min: 10, max: 5000 }),
  body('orderId').optional().isInt({ min: 1 }),
], validateRequest, controller.createTicket);

router.get('/', controller.getMyTickets);
router.get('/:id', [param('id').isInt({ min: 1 })], validateRequest, controller.getTicketDetail);
router.post('/:id/reply', [param('id').isInt({ min: 1 }), body('message').trim().notEmpty().isLength({ min: 2, max: 5000 })], validateRequest, controller.replyToTicket);
router.patch('/:id/close', [param('id').isInt({ min: 1 })], validateRequest, controller.closeTicket);

export default router;
