import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const customerController = new CustomerController();

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin', 'Support']));

router.get('/', asyncHandler(customerController.getAllCustomers));
router.patch('/:id/status', asyncHandler(customerController.updateCustomerStatus));

export default router;
