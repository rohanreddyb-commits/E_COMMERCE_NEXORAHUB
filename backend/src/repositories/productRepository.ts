import sql from "mssql";
import { executeQuery } from "../database/db";

export interface ProductDB {
  product_id: number;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock_quantity: number;
  category_id: number;
  category_name?: string;
  status: string;
  primary_image?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImageDB {
  image_id: number;
  product_id: number;
  image_url: string;
  is_primary: boolean;
  created_at: Date;
}

export class ProductRepository {
  static async createProduct(
    name: string,
    description: string,
    price: number,
    sku: string,
    stockQuantity: number,
    categoryId: number,
    status: string = "Active"
  ): Promise<number> {
    const query = `
      INSERT INTO Products (name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
      OUTPUT INSERTED.product_id
      VALUES (@name, @description, @price, @sku, @stockQuantity, @categoryId, @status, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      name: { type: sql.NVarChar(), value: name },
      description: { type: sql.NVarChar(), value: description },
      price: { type: sql.Decimal(10, 2), value: price },
      sku: { type: sql.VarChar(), value: sku },
      stockQuantity: { type: sql.Int(), value: stockQuantity },
      categoryId: { type: sql.Int(), value: categoryId },
      status: { type: sql.VarChar(), value: status },
    });

    return result.recordset[0].product_id;
  }

  static async getProducts(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    search?: string,
    includeInactive: boolean = false
  ): Promise<{ products: ProductDB[]; total: number }> {
    const offset = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : null;

    // 1. Get Count Query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Products p
      WHERE (@categoryId IS NULL OR p.category_id = @categoryId)
        AND (@search IS NULL OR p.name LIKE @search OR p.description LIKE @search)
        AND (@includeInactive = 1 OR p.status = 'Active');
    `;

    const countResult = await executeQuery(countQuery, {
      categoryId: { type: sql.Int(), value: categoryId || null },
      search: { type: sql.NVarChar(), value: searchPattern },
      includeInactive: { type: sql.Bit(), value: includeInactive ? 1 : 0 },
    });

    const total = countResult.recordset[0].total;

    if (total === 0) {
      return { products: [], total: 0 };
    }

    // 2. Get Paginated Products
    const productsQuery = `
      SELECT p.product_id, p.name, p.description, p.price, p.sku, p.stock_quantity, p.category_id, p.status, p.created_at, p.updated_at,
             c.name as category_name,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) as primary_image
      FROM Products p
      INNER JOIN Categories c ON p.category_id = c.category_id
      WHERE (@categoryId IS NULL OR p.category_id = @categoryId)
        AND (@search IS NULL OR p.name LIKE @search OR p.description LIKE @search)
        AND (@includeInactive = 1 OR p.status = 'Active')
      ORDER BY p.product_id DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY;
    `;

    const productsResult = await executeQuery(productsQuery, {
      categoryId: { type: sql.Int(), value: categoryId || null },
      search: { type: sql.NVarChar(), value: searchPattern },
      includeInactive: { type: sql.Bit(), value: includeInactive ? 1 : 0 },
      offset: { type: sql.Int(), value: offset },
      limit: { type: sql.Int(), value: limit },
    });

    return {
      products: productsResult.recordset as ProductDB[],
      total,
    };
  }

  static async getProductById(productId: number): Promise<ProductDB | null> {
    const query = `
      SELECT p.product_id, p.name, p.description, p.price, p.sku, p.stock_quantity, p.category_id, p.status, p.created_at, p.updated_at,
             c.name as category_name
      FROM Products p
      INNER JOIN Categories c ON p.category_id = c.category_id
      WHERE p.product_id = @productId;
    `;

    const result = await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as ProductDB;
  }

  static async getProductImages(productId: number): Promise<ProductImageDB[]> {
    const query = `
      SELECT image_id, product_id, image_url, is_primary, created_at 
      FROM ProductImages 
      WHERE product_id = @productId
      ORDER BY is_primary DESC, image_id ASC;
    `;

    const result = await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
    });

    return result.recordset as ProductImageDB[];
  }

  static async addProductImage(productId: number, imageUrl: string, isPrimary: boolean = false): Promise<number> {
    const query = `
      INSERT INTO ProductImages (product_id, image_url, is_primary, created_at)
      OUTPUT INSERTED.image_id
      VALUES (@productId, @imageUrl, @isPrimary, GETDATE());
    `;

    const result = await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
      imageUrl: { type: sql.NVarChar(), value: imageUrl },
      isPrimary: { type: sql.Bit(), value: isPrimary ? 1 : 0 },
    });

    return result.recordset[0].image_id;
  }

  static async updateProduct(
    productId: number,
    name: string,
    description: string,
    price: number,
    sku: string,
    stockQuantity: number,
    categoryId: number,
    status: string
  ): Promise<boolean> {
    const query = `
      UPDATE Products
      SET name = @name, description = @description, price = @price, sku = @sku,
          stock_quantity = @stockQuantity, category_id = @categoryId, status = @status, updated_at = GETDATE()
      WHERE product_id = @productId;
    `;

    const result = await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
      name: { type: sql.NVarChar(), value: name },
      description: { type: sql.NVarChar(), value: description },
      price: { type: sql.Decimal(10, 2), value: price },
      sku: { type: sql.VarChar(), value: sku },
      stockQuantity: { type: sql.Int(), value: stockQuantity },
      categoryId: { type: sql.Int(), value: categoryId },
      status: { type: sql.VarChar(), value: status },
    });

    return result.rowsAffected[0] > 0;
  }

  static async updateStock(productId: number, quantity: number, connection?: sql.Transaction | sql.ConnectionPool): Promise<boolean> {
    const query = `
      UPDATE Products
      SET stock_quantity = @quantity, updated_at = GETDATE()
      WHERE product_id = @productId;
    `;

    let result;
    if (connection instanceof sql.Transaction) {
      result = await connection.request()
        .input("productId", sql.Int, productId)
        .input("quantity", sql.Int, quantity)
        .query(query);
    } else {
      result = await executeQuery(query, {
        productId: { type: sql.Int(), value: productId },
        quantity: { type: sql.Int(), value: quantity },
      });
    }

    return result.rowsAffected[0] > 0;
  }

  static async deleteProduct(productId: number): Promise<boolean> {
    const query = "DELETE FROM Products WHERE product_id = @productId;";
    const result = await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
    });

    return result.rowsAffected[0] > 0;
  }

  static async deleteProductImages(productId: number): Promise<void> {
    const query = "DELETE FROM ProductImages WHERE product_id = @productId;";
    await executeQuery(query, {
      productId: { type: sql.Int(), value: productId },
    });
  }
}
