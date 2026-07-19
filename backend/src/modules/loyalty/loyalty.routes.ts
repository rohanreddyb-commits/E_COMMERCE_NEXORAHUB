import { Router } from 'express';
import { LoyaltyController } from './loyalty.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';

const router = Router();
const controller = new LoyaltyController();

router.use(authenticateCustomer);
router.get('/', controller.getDashboard);
router.get('/history', controller.getHistory);

export default router;
