import { Router } from 'express';
import { CustomerReferralController } from './customer.referral.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';

const router = Router();
const controller = new CustomerReferralController();

router.use(authenticateCustomer);

router.get('/code', controller.getCode);
router.get('/stats', controller.getStats);
router.get('/history', controller.getHistory);

export default router;
