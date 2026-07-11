import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/authValidator";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);
router.get("/me", authenticateJWT as any, AuthController.getMe);

export default router;
