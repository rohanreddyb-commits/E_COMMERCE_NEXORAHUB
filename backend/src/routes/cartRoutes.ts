import { Router } from "express";
import { CartController } from "../controllers/cartController";
import { validate } from "../middleware/validate";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cartValidator";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Secure all endpoints with user session verification
router.use(authenticateJWT as any);

router.get("/", CartController.getCart as any);
router.post("/", validate(addCartItemSchema), CartController.addItem as any);
router.put("/:id", validate(updateCartItemSchema), CartController.updateItem as any);
router.delete("/:id", CartController.removeItem as any);

export default router;
