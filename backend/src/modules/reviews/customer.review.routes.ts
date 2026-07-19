import { Router } from 'express';
import { CustomerReviewController } from './customer.review.controller';
import { optionalAuthCustomer, authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerReviewController();

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('body').trim().notEmpty().isLength({ min: 20, max: 5000 }).withMessage('Review must be 20–5000 characters.'),
];

// My reviews (protected)
router.get('/me', authenticateCustomer, controller.getMyReviews);

// Product reviews (public)
router.get('/product/:productId', [param('productId').isInt({ min: 1 })], validateRequest, controller.getProductReviews);

// Create review for a product (protected)
router.post('/product/:productId', authenticateCustomer, [param('productId').isInt({ min: 1 }), ...reviewValidation], validateRequest, controller.createReview);

// Update / delete own review
router.patch('/:id', authenticateCustomer, [param('id').isInt({ min: 1 })], validateRequest, controller.updateReview);
router.delete('/:id', authenticateCustomer, [param('id').isInt({ min: 1 })], validateRequest, controller.deleteReview);

// Vote helpful
router.post('/:id/helpful', authenticateCustomer, [param('id').isInt({ min: 1 })], validateRequest, controller.voteHelpful);

export default router;
