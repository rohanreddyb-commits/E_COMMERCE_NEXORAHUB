import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin']));

router.get('/metrics', asyncHandler(analyticsController.getDashboardMetrics));
router.get('/sales', asyncHandler(analyticsController.getSalesData));

export default router;
