import { executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import { Product, ProductImage } from '../interfaces/catalog.interface';


export class ProductRepository {
  async findAll(page = 1, limit = 10, search?: string, categoryId?: number): Promise<{ data: Product[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let countQuery = `SELECT COUNT(*) as total FROM Products p`;
    let dataQuery = `
      SELECT p.product_id, p.name, p.description, p.price, p.sku, p.category_id, p.status, p.created_at, p.updated_at,
             p.brand_id, p.sale_price, p.barcode, p.is_featured, p.meta_title, p.meta_description,
             c.name AS category_name,
             i.quantity AS stock_quantity,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) AS primary_image,
             (SELECT COUNT(*) FROM VariantGroups vg WHERE vg.product_id = p.product_id) AS variant_groups_count
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Inventory i ON p.product_id = i.product_id
    `;

    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };

    const conditions: string[] = [];
    if (search) {
      conditions.push(`(p.name LIKE @search OR p.sku LIKE @search)`);
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }
    if (categoryId) {
      conditions.push(`p.category_id = @categoryId`);
      params.categoryId = { type: sql.Int, value: categoryId };
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ` + conditions.join(' AND ');
      countQuery += whereClause;
      dataQuery += whereClause;
    }

    dataQuery += ` ORDER BY p.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async findById(id: number): Promise<Product | null> {
    const query = `
      SELECT p.product_id, p.name, p.description, p.price, p.sku, p.category_id, p.status, p.created_at, p.updated_at,
             p.brand_id, p.sale_price, p.barcode, p.is_featured, p.meta_title, p.meta_description,
             c.name AS category_name,
             i.quantity AS stock_quantity
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Inventory i ON p.product_id = i.product_id
      WHERE p.product_id = @id
    `;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.recordset[0] || null;
  }

  async create(data: Partial<Product>, images: Partial<ProductImage>[] = []): Promise<Product> {
    return runInTransaction(async (transaction) => {
      const query = `
        INSERT INTO Products (
          name, slug, description, short_description, brand_id, category_id, 
          price, sale_price, sku, barcode, status, is_featured, meta_title, meta_description
        )
        OUTPUT inserted.*
        VALUES (
          @name, @slug, @description, @short_description, @brand_id, @category_id, 
          @price, @sale_price, @sku, @barcode, @status, @is_featured, @meta_title, @meta_description
        )
      `;
      const request = transaction.request();
      request.input('name', sql.NVarChar, data.name);
      request.input('slug', sql.VarChar, data.slug);
      request.input('description', sql.NVarChar, data.description || null);
      request.input('short_description', sql.NVarChar, data.short_description || null);
      request.input('brand_id', sql.Int, data.brand_id || null);
      request.input('category_id', sql.Int, data.category_id);
      request.input('price', sql.Decimal(10, 2), data.price);
      request.input('sale_price', sql.Decimal(10, 2), data.sale_price || null);
      request.input('sku', sql.VarChar, data.sku);
      request.input('barcode', sql.VarChar, data.barcode || null);
      request.input('status', sql.VarChar, data.status || 'Active');
      request.input('is_featured', sql.Bit, data.is_featured ? 1 : 0);
      request.input('meta_title', sql.NVarChar, data.meta_title || null);
      request.input('meta_description', sql.NVarChar, data.meta_description || null);

      const result = await request.query(query);
      const newProduct = result.recordset[0];

      // Insert Inventory Record
      const stockQuantity = data.stock_quantity || 0;
      const invStatus = stockQuantity > 10 ? 'In Stock' : (stockQuantity > 0 ? 'Low Stock' : 'Out of Stock');
      const invQuery = `
        INSERT INTO Inventory (product_id, quantity, status)
        VALUES (@product_id, @quantity, @status)
      `;
      const invRequest = transaction.request();
      invRequest.input('product_id', sql.Int, newProduct.product_id);
      invRequest.input('quantity', sql.Int, stockQuantity);
      invRequest.input('status', sql.VarChar, invStatus);
      await invRequest.query(invQuery);

      if (images && images.length > 0) {
        for (const img of images) {
          const imgRequest = transaction.request();
          imgRequest.input('product_id', sql.Int, newProduct.product_id);
          imgRequest.input('image_url', sql.NVarChar, img.image_url);
          imgRequest.input('is_primary', sql.Bit, img.is_primary ? 1 : 0);
          imgRequest.input('sort_order', sql.Int, img.sort_order || 0);
          await imgRequest.query(`
            INSERT INTO ProductImages (product_id, image_url, is_primary, sort_order)
            VALUES (@product_id, @image_url, @is_primary, @sort_order)
          `);
        }
      }

      return newProduct;
    });
  }

  async update(id: number, data: Partial<Product>, images?: Partial<ProductImage>[]): Promise<Product | null> {
    return runInTransaction(async (transaction) => {
      // 1. Build update query dynamically
      const updates: string[] = [];
      const request = transaction.request();
      request.input('id', sql.Int, id);

      if (data.name !== undefined) {
        updates.push('name = @name');
        request.input('name', sql.NVarChar, data.name);
      }
      if (data.slug !== undefined) {
        updates.push('slug = @slug');
        request.input('slug', sql.VarChar, data.slug);
      }
      if (data.description !== undefined) {
        updates.push('description = @description');
        request.input('description', sql.NVarChar, data.description || null);
      }
      if (data.short_description !== undefined) {
        updates.push('short_description = @short_description');
        request.input('short_description', sql.NVarChar, data.short_description || null);
      }
      if (data.brand_id !== undefined) {
        updates.push('brand_id = @brand_id');
        request.input('brand_id', sql.Int, data.brand_id || null);
      }
      if (data.category_id !== undefined) {
        updates.push('category_id = @category_id');
        request.input('category_id', sql.Int, data.category_id);
      }
      if (data.price !== undefined) {
        updates.push('price = @price');
        request.input('price', sql.Decimal(10, 2), data.price);
      }
      if (data.sale_price !== undefined) {
        updates.push('sale_price = @sale_price');
        request.input('sale_price', sql.Decimal(10, 2), data.sale_price || null);
      }
      if (data.sku !== undefined) {
        updates.push('sku = @sku');
        request.input('sku', sql.VarChar, data.sku);
      }
      if (data.barcode !== undefined) {
        updates.push('barcode = @barcode');
        request.input('barcode', sql.VarChar, data.barcode || null);
      }
      if (data.status !== undefined) {
        updates.push('status = @status');
        request.input('status', sql.VarChar, data.status);
      }
      if (data.is_featured !== undefined) {
        updates.push('is_featured = @is_featured');
        request.input('is_featured', sql.Bit, data.is_featured ? 1 : 0);
      }
      if (data.meta_title !== undefined) {
        updates.push('meta_title = @meta_title');
        request.input('meta_title', sql.NVarChar, data.meta_title || null);
      }
      if (data.meta_description !== undefined) {
        updates.push('meta_description = @meta_description');
        request.input('meta_description', sql.NVarChar, data.meta_description || null);
      }

      let updatedProduct = null;
      if (updates.length > 0) {
        const query = `
          UPDATE Products SET ${updates.join(', ')}
          WHERE product_id = @id
        `;
        await request.query(query);
      }

      const getQuery = `SELECT * FROM Products WHERE product_id = @id`;
      const result = await transaction.request()
        .input('id', sql.Int, id)
        .query(getQuery);
      updatedProduct = result.recordset[0];

      if (!updatedProduct) return null;

      // 2. Update Inventory
      if (data.stock_quantity !== undefined) {
        const invQuery = `
          MERGE Inventory AS target
          USING (SELECT @product_id AS product_id) AS source
          ON (target.product_id = source.product_id)
          WHEN MATCHED THEN
            UPDATE SET quantity = @quantity, status = @status, updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (product_id, quantity, status) VALUES (source.product_id, @quantity, @status);
        `;
        const stockQuantity = data.stock_quantity;
        const invStatus = stockQuantity > 10 ? 'In Stock' : (stockQuantity > 0 ? 'Low Stock' : 'Out of Stock');
        
        const invRequest = transaction.request();
        invRequest.input('product_id', sql.Int, id);
        invRequest.input('quantity', sql.Int, stockQuantity);
        invRequest.input('status', sql.VarChar, invStatus);
        await invRequest.query(invQuery);
      }

      // 3. Update ProductImages if new images are uploaded
      if (images && images.length > 0) {
        const deleteRequest = transaction.request();
        deleteRequest.input('product_id', sql.Int, id);
        await deleteRequest.query(`DELETE FROM ProductImages WHERE product_id = @product_id`);

        for (const img of images) {
          const imgRequest = transaction.request();
          imgRequest.input('product_id', sql.Int, id);
          imgRequest.input('image_url', sql.NVarChar, img.image_url);
          imgRequest.input('is_primary', sql.Bit, img.is_primary ? 1 : 0);
          imgRequest.input('sort_order', sql.Int, img.sort_order || 0);
          await imgRequest.query(`
            INSERT INTO ProductImages (product_id, image_url, is_primary, sort_order)
            VALUES (@product_id, @image_url, @is_primary, @sort_order)
          `);
        }
      }

      return updatedProduct;
    });
  }

  async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM Products WHERE product_id = @id`;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.rowsAffected[0] > 0;
  }
}
