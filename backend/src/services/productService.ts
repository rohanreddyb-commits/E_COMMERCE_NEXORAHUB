import { CategoryRepository, CategoryDB } from "../repositories/categoryRepository";
import { ProductRepository, ProductDB, ProductImageDB } from "../repositories/productRepository";
import { NotFoundError, BadRequestError } from "../utils/customError";

export class ProductService {
  // --- Category Services ---
  
  static async createCategory(name: string, description?: string): Promise<number> {
    if (!name) {
      throw new BadRequestError("Category name is required.");
    }
    return CategoryRepository.createCategory(name, description);
  }

  static async getCategories(): Promise<CategoryDB[]> {
    return CategoryRepository.getAllCategories();
  }

  static async getCategory(categoryId: number): Promise<CategoryDB> {
    const category = await CategoryRepository.getCategoryById(categoryId);
    if (!category) {
      throw new NotFoundError(`Category with ID ${categoryId} not found.`);
    }
    return category;
  }

  static async updateCategory(categoryId: number, name: string, description?: string): Promise<void> {
    await this.getCategory(categoryId); // Verify existence
    const success = await CategoryRepository.updateCategory(categoryId, name, description);
    if (!success) {
      throw new BadRequestError("Failed to update category.");
    }
  }

  static async deleteCategory(categoryId: number): Promise<void> {
    await this.getCategory(categoryId); // Verify existence
    const success = await CategoryRepository.deleteCategory(categoryId);
    if (!success) {
      throw new BadRequestError("Failed to delete category. Ensure no products are linked to it first.");
    }
  }

  // --- Product Services ---

  static async createProduct(
    name: string,
    description: string,
    price: number,
    sku: string,
    stockQuantity: number,
    categoryId: number,
    status: string,
    imageFiles?: Express.Multer.File[]
  ): Promise<number> {
    // 1. Validate category existence
    await this.getCategory(categoryId);

    // 2. Create the base product
    const productId = await ProductRepository.createProduct(
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      status
    );

    // 3. Add images if uploaded
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        // Store relative path from backend/uploads to access via static server
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = i === 0; // First image is marked primary
        await ProductRepository.addProductImage(productId, imageUrl, isPrimary);
      }
    }

    return productId;
  }

  static async getProducts(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    search?: string,
    includeInactive: boolean = false
  ): Promise<{ products: ProductDB[]; total: number; page: number; limit: number; pages: number }> {
    const { products, total } = await ProductRepository.getProducts(
      page,
      limit,
      categoryId,
      search,
      includeInactive
    );

    const pages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      pages,
    };
  }

  static async getProductDetails(productId: number): Promise<ProductDB & { images: string[] }> {
    const product = await ProductRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} not found.`);
    }

    const images = await ProductRepository.getProductImages(productId);
    
    return {
      ...product,
      images: images.map((img) => img.image_url),
    };
  }

  static async updateProduct(
    productId: number,
    name: string,
    description: string,
    price: number,
    sku: string,
    stockQuantity: number,
    categoryId: number,
    status: string,
    imageFiles?: Express.Multer.File[]
  ): Promise<void> {
    // 1. Verify product and category exist
    const existingProduct = await ProductRepository.getProductById(productId);
    if (!existingProduct) {
      throw new NotFoundError(`Product with ID ${productId} not found.`);
    }
    await this.getCategory(categoryId);

    // 2. Update properties
    const success = await ProductRepository.updateProduct(
      productId,
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      status
    );

    if (!success) {
      throw new BadRequestError("Failed to update product details.");
    }

    // 3. Handle image uploads if provided
    if (imageFiles && imageFiles.length > 0) {
      // For simplicity in this intermediate version, new image uploads add to the catalog.
      // Set primary if the product currently has no images
      const existingImages = await ProductRepository.getProductImages(productId);
      const hasNoImages = existingImages.length === 0;

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = hasNoImages && i === 0;
        await ProductRepository.addProductImage(productId, imageUrl, isPrimary);
      }
    }
  }

  static async deleteProduct(productId: number): Promise<void> {
    const product = await ProductRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} not found.`);
    }

    // Cascade constraints on ProductImages handles DB cleaning, but we can call it to be sure
    await ProductRepository.deleteProductImages(productId);
    const success = await ProductRepository.deleteProduct(productId);
    if (!success) {
      throw new BadRequestError("Failed to delete product.");
    }
  }
}
