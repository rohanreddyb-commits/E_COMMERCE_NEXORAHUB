import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new NotificationController();

router.use(authenticateCustomer);

router.get('/', controller.getAll);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', [param('id').isInt({ min: 1 })], validateRequest, controller.markAsRead);
router.delete('/:id', [param('id').isInt({ min: 1 })], validateRequest, controller.delete);

export default router;
