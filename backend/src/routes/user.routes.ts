import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const userController = new UserController();

// Super Admin and Admin routes for managing internal users/staff
router.use(authenticate, authorizeRole(['Super Admin', 'Admin']));

router.get('/', asyncHandler(userController.getAllUsers));
router.post('/', asyncHandler(userController.createUser));
router.put('/:id/role', asyncHandler(userController.updateUserRole));

export default router;
