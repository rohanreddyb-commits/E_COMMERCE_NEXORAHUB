import { Router } from "express";
import { AddressController } from "../controllers/addressController";
import { validate } from "../middleware/validate";
import { addressSchema } from "../validators/addressValidator";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Apply auth middleware globally to all shipping address endpoints
router.use(authenticateJWT as any);

router.get("/", AddressController.getAddresses as any);
router.get("/:id", AddressController.getAddress as any);
router.post("/", validate(addressSchema), AddressController.createAddress as any);
router.put("/:id", validate(addressSchema), AddressController.updateAddress as any);
router.delete("/:id", AddressController.deleteAddress as any);

export default router;
