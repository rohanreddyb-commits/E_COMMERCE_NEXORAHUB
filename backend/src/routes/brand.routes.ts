import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const brandController = new BrandController();

router.get('/', asyncHandler(brandController.getAllBrands));
router.get('/:id', asyncHandler(brandController.getBrandById));

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin']));
router.post('/', asyncHandler(brandController.createBrand));
router.put('/:id', asyncHandler(brandController.updateBrand));
router.delete('/:id', asyncHandler(brandController.deleteBrand));

export default router;
