import { Router } from 'express';
import { CouponController } from '../controllers/couponController';
import { validate } from '../middleware/validate';
import { validateCouponSchema, couponSchema } from '../validators/couponValidator';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';

const router = Router();

// Apply session auth to all coupon requests
router.use(authenticate);

// Customer validate endpoint
router.post('/validate', validate(validateCouponSchema), CouponController.validate as any);

// Admin-Only CRUD actions
router.get('/', authorizeRole(['Admin', 'Super Admin']), CouponController.getAll as any);
router.get('/:id', authorizeRole(['Admin', 'Super Admin']), CouponController.getOne as any);
router.post('/', authorizeRole(['Admin', 'Super Admin']), validate(couponSchema), CouponController.create as any);
router.put('/:id', authorizeRole(['Admin', 'Super Admin']), validate(couponSchema), CouponController.update as any);
router.delete('/:id', authorizeRole(['Admin', 'Super Admin']), CouponController.delete as any);

export default router;
