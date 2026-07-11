import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

// Secure all admin backend endpoints
router.use(authenticateJWT as any);
router.use(authorizeRoles(1) as any); // Role ID 1 is Admin

router.get("/dashboard", AdminController.getDashboardStats as any);

export default router;
