import { Request, Response, NextFunction } from "express";
import { ProductService } from "../services/productService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/customError";

export class ProductController {
  // --- Category Handlers ---

  static async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const categoryId = await ProductService.createCategory(name, description);

      res.status(201).json({
        success: true,
        message: "Category created successfully.",
        categoryId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCategories(req: Request | any, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await ProductService.getCategories();
      res.status(200).json({
        success: true,
        categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCategory(req: Request | any, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        throw new BadRequestError("Invalid category ID.");
      }

      const category = await ProductService.getCategory(categoryId);
      res.status(200).json({
        success: true,
        category,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        throw new BadRequestError("Invalid category ID.");
      }

      const { name, description } = req.body;
      await ProductService.updateCategory(categoryId, name, description);

      res.status(200).json({
        success: true,
        message: "Category updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        throw new BadRequestError("Invalid category ID.");
      }

      await ProductService.deleteCategory(categoryId);
      res.status(200).json({
        success: true,
        message: "Category deleted successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Product Handlers ---

  static async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, price, sku, stockQuantity, categoryId, status } = req.body;
      
      // Parse numeric fields (express-validator or yup might have done this, but we coerce it to be safe)
      const parsedPrice = parseFloat(price);
      const parsedStock = parseInt(stockQuantity, 10);
      const parsedCategoryId = parseInt(categoryId, 10);

      const files = req.files as Express.Multer.File[] | undefined;

      const productId = await ProductService.createProduct(
        name,
        description,
        parsedPrice,
        sku,
        parsedStock,
        parsedCategoryId,
        status || "Active",
        files
      );

      res.status(201).json({
        success: true,
        message: "Product created successfully.",
        productId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || "1", 10);
      const limit = parseInt(req.query.limit as string || "10", 10);
      const categoryId = req.query.category ? parseInt(req.query.category as string, 10) : undefined;
      const search = req.query.search as string || undefined;

      const result = await ProductService.getProducts(page, limit, categoryId, search, false);

      res.status(200).json({
        success: true,
        products: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProductDetails(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        throw new BadRequestError("Invalid product ID.");
      }

      const product = await ProductService.getProductDetails(productId);
      res.status(200).json({
        success: true,
        product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        throw new BadRequestError("Invalid product ID.");
      }

      const { name, description, price, sku, stockQuantity, categoryId, status } = req.body;
      const files = req.files as Express.Multer.File[] | undefined;

      await ProductService.updateProduct(
        productId,
        name,
        description,
        parseFloat(price),
        sku,
        parseInt(stockQuantity, 10),
        parseInt(categoryId, 10),
        status,
        files
      );

      res.status(200).json({
        success: true,
        message: "Product updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        throw new BadRequestError("Invalid product ID.");
      }

      await ProductService.deleteProduct(productId);
      res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}
