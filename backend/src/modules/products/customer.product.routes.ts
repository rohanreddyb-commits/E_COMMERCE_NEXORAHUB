import { Router } from 'express';
import { CustomerProductController } from './customer.product.controller';
import { optionalAuthCustomer, authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { searchRateLimiter } from '../../common/middleware/rateLimiter.middleware';

const router = Router();
const controller = new CustomerProductController();

// Public routes (optional auth for recently viewed tracking)
router.get('/', optionalAuthCustomer, controller.getProducts);
router.get('/featured', controller.getFeaturedProducts);
router.get('/new-arrivals', controller.getNewArrivals);
router.get('/best-sellers', controller.getBestSellers);

// Protected
router.get('/recently-viewed', authenticateCustomer, controller.getRecentlyViewed);

// Must come last to avoid conflicts with named routes
router.get('/:id', optionalAuthCustomer, controller.getProductDetail);
router.get('/:id/related', controller.getRelatedProducts);

export default router;
