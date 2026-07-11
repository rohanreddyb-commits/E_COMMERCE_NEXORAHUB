import { Router } from "express";
import { ProductController } from "../controllers/productController";
import { validate, validateQuery } from "../middleware/validate";
import { productSchema, productQuerySchema, categorySchema } from "../validators/productValidator";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// --- Customer / Public Routes ---

// Get paginated product catalog
router.get("/", validateQuery(productQuerySchema), ProductController.getProducts as any);

// Fetch categories list
router.get("/categories", ProductController.getCategories as any);

// Fetch category by ID
router.get("/categories/:id", ProductController.getCategory as any);

// Get product details
router.get("/:id", ProductController.getProductDetails as any);

// --- Admin Only CRUD Routes (roleId = 1 is Admin) ---

// Create Category
router.post(
  "/categories",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  validate(categorySchema),
  ProductController.createCategory as any
);

// Update Category
router.put(
  "/categories/:id",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  validate(categorySchema),
  ProductController.updateCategory as any
);

// Delete Category
router.delete(
  "/categories/:id",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  ProductController.deleteCategory as any
);

// Create Product (with file uploads)
// Multer parses multipart forms first so Yup can read the body fields
router.post(
  "/",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  upload.array("images", 5),
  validate(productSchema),
  ProductController.createProduct as any
);

// Update Product (with optional image uploads)
router.put(
  "/:id",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  upload.array("images", 5),
  validate(productSchema),
  ProductController.updateProduct as any
);

// Delete Product
router.delete(
  "/:id",
  authenticateJWT as any,
  authorizeRoles(1) as any,
  ProductController.deleteProduct as any
);

export default router;
