import { Router } from 'express';
import { WishlistController } from './wishlist.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new WishlistController();

router.use(authenticateCustomer);
router.get('/', controller.getWishlist);
router.post('/', [body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required.')], validateRequest, controller.addToWishlist);
router.delete('/:productId', [param('productId').isInt({ min: 1 })], validateRequest, controller.removeFromWishlist);
router.post('/:productId/move-to-cart', [param('productId').isInt({ min: 1 }), body('quantity').optional().isInt({ min: 1, max: 100 })], validateRequest, controller.moveToCart);

export default router;
