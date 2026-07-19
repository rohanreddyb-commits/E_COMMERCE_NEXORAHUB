import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/rbac.middleware';
import { upload } from '../middleware/upload';

const router = Router();
const productController = new ProductController();

// ─── IMPORTANT: Route order matters in Express ────────────────────────────────
// Specific named paths MUST be declared before wildcard /:id routes.
// Otherwise Express matches /:id first (e.g. "variant-inventory" → product ID → "Product not found").

// ─── Public: list all products ────────────────────────────────────────────────
router.get('/', asyncHandler(productController.getAllProducts));

// ─── Public: variant data for a product (must come before /:id) ───────────────
router.get('/:id/variants', asyncHandler(productController.getProductVariants));

// ─── Admin: variant inventory list (MUST be before /:id wildcard) ─────────────
router.get(
  '/variant-inventory',
  authenticate,
  authorizeRole(['Admin', 'Super Admin', 'Inventory Manager']),
  asyncHandler(productController.getVariantInventory)
);

// ─── Admin: patch variant stock / details (MUST be before /:id wildcard) ──────
router.patch(
  '/variants/:variantId/stock',
  authenticate,
  authorizeRole(['Admin', 'Super Admin', 'Inventory Manager']),
  asyncHandler(productController.adjustVariantStock)
);
router.patch(
  '/variants/:variantId',
  authenticate,
  authorizeRole(['Admin', 'Super Admin', 'Inventory Manager']),
  asyncHandler(productController.updateVariant)
);

// ─── Public: single product by ID (wildcard — must come last among GETs) ──────
router.get('/:id', asyncHandler(productController.getProductById));

// ─── Admin: product CRUD (wildcard /:id routes) ───────────────────────────────
router.use(authenticate, authorizeRole(['Admin', 'Super Admin', 'Inventory Manager']));

router.post('/', upload.array('images', 5), asyncHandler(productController.createProduct));
router.post('/with-variants', upload.array('images', 5), asyncHandler(productController.createProductWithVariants));
router.put('/:id', upload.array('images', 5), asyncHandler(productController.updateProduct));
router.delete('/:id', asyncHandler(productController.deleteProduct));

export default router;
