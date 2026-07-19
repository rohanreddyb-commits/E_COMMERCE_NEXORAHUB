import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const orderController = new OrderController();

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin', 'Support']));

router.get('/admin/all', asyncHandler(orderController.getAllOrders));
router.get('/:id', asyncHandler(orderController.getOrderById));
router.put('/admin/:id', asyncHandler(orderController.updateOrderStatus));

export default router;
