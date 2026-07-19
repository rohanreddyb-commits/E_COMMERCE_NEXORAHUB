import { Request, Response } from 'express';
import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { runInTransaction } from '../database/db';
import sql from 'mssql';

const variantRepo = new VariantRepository();

export class ProductController {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  getAllProducts = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const category = req.query.category ? parseInt(req.query.category as string) : undefined;

    const products = await this.productRepository.findAll(page, limit, search, category);
    res.status(200).json(new ApiResponse(200, products, 'Products retrieved successfully'));
  };

  getProductById = async (req: Request, res: Response) => {
    const product = await this.productRepository.findById(Number(req.params.id));
    if (!product) throw new ApiError(404, 'Product not found');
    res.status(200).json(new ApiResponse(200, product, 'Product retrieved successfully'));
  };

  createProduct = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (files && files.length > 0) {
      files.forEach((file, idx) => {
        console.log(`[Upload - Create] File[${idx}] received: originalName=${file.originalname}, filename=${file.filename}, savedPath=${file.path}, size=${file.size} bytes`);
      });
    }

    const images = files?.map((file, idx) => {
      const dbPath = `/uploads/${file.filename}`;
      console.log(`[Upload - Create] File[${idx}] mapping to DB path: ${dbPath}`);
      return {
        image_url: dbPath,
        is_primary: idx === 0,
        sort_order: idx
      };
    }) || [];

    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      sku: req.body.sku,
      status: req.body.status || 'Active',
      category_id: parseInt(req.body.categoryId),
      brand_id: req.body.brandId ? parseInt(req.body.brandId) : null,
      stock_quantity: req.body.stockQuantity ? parseInt(req.body.stockQuantity) : 0,
      slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    };

    const product = await this.productRepository.create(productData, images);
    res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
  };

  /**
   * POST /api/products/with-variants
   * Creates a product (base info) + variant groups + all combinations in one transaction.
   * Accepts JSON body (no file upload in this endpoint; images via separate upload).
   */
  createProductWithVariants = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    const images = files?.map((file, idx) => ({
      image_url: `/uploads/${file.filename}`,
      is_primary: idx === 0,
      sort_order: idx,
    })) || [];

    const body = req.body;

    // Parse variant_groups and variants from JSON strings if sent as FormData
    let variantGroups: any[] = [];
    let variants: any[] = [];

    try {
      variantGroups = typeof body.variant_groups === 'string'
        ? JSON.parse(body.variant_groups)
        : (body.variant_groups || []);
      variants = typeof body.variants === 'string'
        ? JSON.parse(body.variants)
        : (body.variants || []);
    } catch {
      throw new ApiError(400, 'Invalid variant_groups or variants JSON');
    }

    // Validate: no empty group names
    for (const g of variantGroups) {
      if (!g.name || !g.name.trim()) throw new ApiError(400, 'Variant group name cannot be empty');
      if (!g.options || g.options.length === 0) throw new ApiError(400, `Variant group "${g.name}" must have at least one option`);
      const seen = new Set<string>();
      for (const opt of g.options) {
        if (!opt || !opt.trim()) throw new ApiError(400, `Option values in "${g.name}" cannot be empty`);
        if (seen.has(opt.trim().toLowerCase())) throw new ApiError(400, `Duplicate option value "${opt}" in group "${g.name}"`);
        seen.add(opt.trim().toLowerCase());
      }
    }

    // Validate: no duplicate SKUs across variants
    const skuSet = new Set<string>();
    for (const v of variants) {
      if (!v.sku || !v.sku.trim()) throw new ApiError(400, 'All variant SKUs are required');
      if (v.stock < 0) throw new ApiError(400, `Stock cannot be negative for variant SKU "${v.sku}"`);
      if (skuSet.has(v.sku.trim())) throw new ApiError(400, `Duplicate SKU "${v.sku}" in variants`);
      skuSet.add(v.sku.trim());
    }

    const slug = (body.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const payload = {
      name: body.name,
      description: body.description || null,
      short_description: body.short_description || null,
      price: parseFloat(body.price),
      sku: body.sku,
      barcode: body.barcode || null,
      brand_id: body.brandId ? parseInt(body.brandId) : null,
      category_id: parseInt(body.categoryId),
      status: (body.status || 'Active') as 'Active' | 'Draft' | 'Archived',
      is_featured: body.is_featured === 'true' || body.is_featured === true,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      variant_groups: variantGroups,
      variants: variants,
    };

    // Create product + images + variants in one transaction
    const result = await runInTransaction(async (transaction) => {
      // 1. Insert base product
      const productReq = transaction.request();
      productReq.input('name', sql.NVarChar, payload.name);
      productReq.input('slug', sql.VarChar, slug);
      productReq.input('description', sql.NVarChar, payload.description);
      productReq.input('short_description', sql.NVarChar, payload.short_description);
      productReq.input('brand_id', sql.Int, payload.brand_id);
      productReq.input('category_id', sql.Int, payload.category_id);
      productReq.input('price', sql.Decimal(10, 2), payload.price);
      productReq.input('sku', sql.VarChar, payload.sku);
      productReq.input('barcode', sql.VarChar, payload.barcode);
      productReq.input('status', sql.VarChar, payload.status);
      productReq.input('is_featured', sql.Bit, payload.is_featured ? 1 : 0);
      productReq.input('meta_title', sql.NVarChar, payload.meta_title);
      productReq.input('meta_description', sql.NVarChar, payload.meta_description);

      const productResult = await productReq.query(`
        INSERT INTO Products (name, slug, description, short_description, brand_id, category_id,
          price, sku, barcode, status, is_featured, meta_title, meta_description)
        OUTPUT inserted.*
        VALUES (@name, @slug, @description, @short_description, @brand_id, @category_id,
          @price, @sku, @barcode, @status, @is_featured, @meta_title, @meta_description)
      `);
      const newProduct = productResult.recordset[0];
      const productId: number = newProduct.product_id;

      // 2. Insert product images
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx];
        await transaction.request()
          .input('product_id', sql.Int, productId)
          .input('image_url', sql.NVarChar, img.image_url)
          .input('is_primary', sql.Bit, img.is_primary ? 1 : 0)
          .input('sort_order', sql.Int, img.sort_order)
          .query(`INSERT INTO ProductImages (product_id, image_url, is_primary, sort_order)
                  VALUES (@product_id, @image_url, @is_primary, @sort_order)`);
      }

      // 3. Insert base inventory (stock=0 for variant products, since stock tracked per variant)
      const hasVariants = payload.variant_groups.length > 0;
      await transaction.request()
        .input('product_id', sql.Int, productId)
        .input('quantity', sql.Int, hasVariants ? 0 : (parseInt(req.body.stockQuantity) || 0))
        .input('status', sql.VarChar, hasVariants ? 'Out of Stock' : 'In Stock')
        .query(`INSERT INTO Inventory (product_id, quantity, status) VALUES (@product_id, @quantity, @status)`);

      // 4. Insert variant groups, options, and combinations
      if (hasVariants) {
        await variantRepo.createVariantsInTransaction(transaction, productId, payload);
      }

      return newProduct;
    });

    res.status(201).json(new ApiResponse(201, result, 'Product with variants created successfully'));
  };

  /**
   * GET /api/products/:id/variants
   * Public endpoint — returns all variant groups, options, and combinations.
   */
  getProductVariants = async (req: Request, res: Response) => {
    const productId = Number(req.params.id);
    const product = await this.productRepository.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const variantData = await variantRepo.getVariantDataByProductId(productId);
    res.status(200).json(new ApiResponse(200, { product, ...variantData }, 'Variant data retrieved successfully'));
  };

  /**
   * PATCH /api/products/variants/:variantId/stock
   * Admin — adjust stock for a single variant combination.
   */
  adjustVariantStock = async (req: Request, res: Response) => {
    const variantId = Number(req.params.variantId);
    const delta = parseInt(req.body.delta);
    if (isNaN(delta)) throw new ApiError(400, 'delta must be an integer (positive to add, negative to deduct)');

    const result = await variantRepo.adjustVariantStock(variantId, delta);
    res.status(200).json(new ApiResponse(200, result, 'Variant stock updated successfully'));
  };

  /**
   * PATCH /api/products/variants/:variantId
   * Admin — update SKU, price, stock, barcode of a single variant.
   */
  updateVariant = async (req: Request, res: Response) => {
    const variantId = Number(req.params.variantId);
    if (isNaN(variantId)) throw new ApiError(400, 'Invalid variant ID');

    const parseIntSafe = (val: any): number | undefined => {
      if (val === undefined || val === null) return undefined;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) ? undefined : parsed;
    };

    const parseFloatSafe = (val: any): number | null | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? undefined : parsed;
    };

    await variantRepo.updateVariant(variantId, {
      sku: req.body.sku,
      price: parseFloatSafe(req.body.price),
      sale_price: parseFloatSafe(req.body.sale_price),
      stock: parseIntSafe(req.body.stock),
      barcode: req.body.barcode !== undefined ? req.body.barcode : undefined,
      weight_grams: parseIntSafe(req.body.weight_grams),
      is_active: req.body.is_active,
    });
    res.status(200).json(new ApiResponse(200, null, 'Variant updated successfully'));
  };

  /**
   * GET /api/products/variant-inventory
   * Admin — paginated list of all variant combinations with their stock.
   */
  getVariantInventory = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;

    const data = await variantRepo.getAllVariantInventory(page, limit, search);
    res.status(200).json(new ApiResponse(200, data, 'Variant inventory retrieved successfully'));
  };

  updateProduct = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (files && files.length > 0) {
      files.forEach((file, idx) => {
        console.log(`[Upload - Update] File[${idx}] received: originalName=${file.originalname}, filename=${file.filename}, savedPath=${file.path}, size=${file.size} bytes`);
      });
    }

    const images = files?.map((file, idx) => {
      const dbPath = `/uploads/${file.filename}`;
      console.log(`[Upload - Update] File[${idx}] mapping to DB path: ${dbPath}`);
      return {
        image_url: dbPath,
        is_primary: idx === 0,
        sort_order: idx
      };
    });

    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      sku: req.body.sku,
      status: req.body.status,
      category_id: req.body.categoryId ? parseInt(req.body.categoryId) : undefined,
      brand_id: req.body.brandId ? (req.body.brandId === "" ? null : parseInt(req.body.brandId)) : undefined,
      stock_quantity: req.body.stockQuantity ? parseInt(req.body.stockQuantity) : undefined,
      slug: req.body.name ? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : undefined,
    };

    const product = await this.productRepository.update(Number(req.params.id), productData, images);
    if (!product) throw new ApiError(404, 'Product not found');
    res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
  };

  deleteProduct = async (req: Request, res: Response) => {
    const success = await this.productRepository.delete(Number(req.params.id));
    if (!success) throw new ApiError(404, 'Product not found');
    res.status(200).json(new ApiResponse(200, null, 'Product deleted successfully'));
  };
}
