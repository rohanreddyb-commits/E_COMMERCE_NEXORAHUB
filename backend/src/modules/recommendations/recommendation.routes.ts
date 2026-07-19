import { Router } from 'express';
import { RecommendationController } from './recommendation.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new RecommendationController();

router.get('/personalized', authenticateCustomer, controller.getPersonalized);
router.get('/frequently-bought-together/:productId', [param('productId').isInt({ min: 1 })], validateRequest, controller.getFrequentlyBoughtTogether);

export default router;
