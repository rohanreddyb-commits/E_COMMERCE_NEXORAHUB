import { Router } from "express";
import { CouponController } from "../controllers/couponController";
import { validate } from "../middleware/validate";
import { validateCouponSchema, couponSchema } from "../validators/couponValidator";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

// Apply session auth to all coupon requests
router.use(authenticateJWT as any);

// Customer validate endpoint
router.post("/validate", validate(validateCouponSchema), CouponController.validate as any);

// Admin-Only CRUD actions
router.get("/", authorizeRoles(1) as any, CouponController.getAll as any);
router.get("/:id", authorizeRoles(1) as any, CouponController.getOne as any);
router.post("/", authorizeRoles(1) as any, validate(couponSchema), CouponController.create as any);
router.put("/:id", authorizeRoles(1) as any, validate(couponSchema), CouponController.update as any);
router.delete("/:id", authorizeRoles(1) as any, CouponController.delete as any);

export default router;
