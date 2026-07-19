import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const categoryController = new CategoryController();

router.get('/', asyncHandler(categoryController.getAllCategories));
router.get('/:id', asyncHandler(categoryController.getCategoryById));

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin']));
router.post('/', asyncHandler(categoryController.createCategory));
router.put('/:id', asyncHandler(categoryController.updateCategory));
router.delete('/:id', asyncHandler(categoryController.deleteCategory));

export default router;
