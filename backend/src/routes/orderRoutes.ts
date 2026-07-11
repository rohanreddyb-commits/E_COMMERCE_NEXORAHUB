import { Router } from "express";
import { OrderController } from "../controllers/orderController";
import { validate } from "../middleware/validate";
import { placeOrderSchema, updateOrderStatusSchema } from "../validators/orderValidator";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

// Apply session verification globally
router.use(authenticateJWT as any);

// Customer endpoints
router.post("/", validate(placeOrderSchema), OrderController.placeOrder as any);
router.get("/", OrderController.getOrders as any);

// Admin-Only bulk orders list
router.get("/admin/all", authorizeRoles(1) as any, OrderController.getAdminOrders as any);

// Admin-Only update order status
router.put("/admin/:id", authorizeRoles(1) as any, validate(updateOrderStatusSchema), OrderController.updateOrderStatus as any);

// Fetch order details (Customer or Admin)
router.get("/:id", OrderController.getOrderDetails as any);

export default router;
