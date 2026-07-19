import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();
const inventoryController = new InventoryController();

// Admin only routes
router.use(authenticate, authorizeRole(['Admin', 'Super Admin']));

router.get('/', asyncHandler(inventoryController.getAllInventory));
router.post('/adjust/:productId', asyncHandler(inventoryController.adjustInventory));
router.get('/history/:productId', asyncHandler(inventoryController.getInventoryHistory));

export default router;
