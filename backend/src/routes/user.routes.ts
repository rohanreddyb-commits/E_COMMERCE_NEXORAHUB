import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const userController = new UserController();

router.use(authenticate);

// Listing staff is available to Admin; anything that GRANTS privilege is
// restricted to Super Admin, so an Admin cannot escalate themselves or others.
router.get('/', authorizeRole(['Super Admin', 'Admin']), asyncHandler(userController.getAllUsers));
router.post('/', authorizeRole(['Super Admin']), asyncHandler(userController.createUser));
router.put('/:id/role', authorizeRole(['Super Admin']), asyncHandler(userController.updateUserRole));

export default router;
