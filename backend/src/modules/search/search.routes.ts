import { Router } from 'express';
import { SearchController } from './search.controller';
import { optionalAuthCustomer, authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { searchRateLimiter } from '../../common/middleware/rateLimiter.middleware';

const router = Router();
const controller = new SearchController();

router.get('/', searchRateLimiter, optionalAuthCustomer, controller.search);
router.get('/autocomplete', searchRateLimiter, controller.autocomplete);
router.get('/trending', controller.getTrending);
router.get('/history', authenticateCustomer, controller.getHistory);
router.delete('/history', authenticateCustomer, controller.clearHistory);

export default router;
