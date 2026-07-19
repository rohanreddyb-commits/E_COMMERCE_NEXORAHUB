import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const reviewController = new ReviewController();

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin', 'Support']));

router.get('/', asyncHandler(reviewController.getAllReviews));
router.patch('/:id/status', asyncHandler(reviewController.updateReviewStatus));

export default router;
