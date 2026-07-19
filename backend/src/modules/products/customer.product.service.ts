import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { cacheService } from '../../common/cache/cache.factory';
import { CACHE_KEYS, CACHE_TTL } from '../../core/constants/customer.constants';
import { buildCacheHash } from '../../common/utils/helpers.util';

export class CustomerProductService {
  async getProducts(params: {
    page: unknown; limit: unknown; search?: string; categoryId?: number;
    brandId?: number; minPrice?: number; maxPrice?: number;
    sort?: string; order?: 'ASC' | 'DESC'; status?: string;
    isFeatured?: boolean; onSale?: boolean;
  }) {
    const { page: p, limit: l, offset } = parsePaginationParams(params.page, params.limit, 50);

    const cacheKey = CACHE_KEYS.PRODUCTS_LIST(buildCacheHash({
      ...params, page: p, limit: l, offset
    }));
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const conditions: string[] = [`p.status = 'Active'`];
    const queryParams: Record<string, { type: any; value: any }> = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: l },
    };

    if (params.search) {
      conditions.push(`(p.name LIKE @search OR p.description LIKE @search OR b.name LIKE @search)`);
      queryParams.search = { type: sql.NVarChar, value: `%${params.search}%` };
    }
    if (params.categoryId) {
      conditions.push(`p.category_id = @category_id`);
      queryParams.category_id = { type: sql.Int, value: params.categoryId };
    }
    if (params.brandId) {
      conditions.push(`p.brand_id = @brand_id`);
      queryParams.brand_id = { type: sql.Int, value: params.brandId };
    }
    if (params.minPrice !== undefined) {
      conditions.push(`ISNULL(p.sale_price, p.price) >= @min_price`);
      queryParams.min_price = { type: sql.Decimal(10, 2), value: params.minPrice };
    }
    if (params.maxPrice !== undefined) {
      conditions.push(`ISNULL(p.sale_price, p.price) <= @max_price`);
      queryParams.max_price = { type: sql.Decimal(10, 2), value: params.maxPrice };
    }
    if (params.isFeatured) {
      conditions.push(`p.is_featured = 1`);
    }
    if (params.onSale) {
      conditions.push(`p.sale_price IS NOT NULL AND p.sale_price < p.price`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSortFields: Record<string, string> = {
      price: 'ISNULL(p.sale_price, p.price)', name: 'p.name',
      created_at: 'p.created_at', rating: 'avg_rating',
    };
    const sortField = validSortFields[params.sort || 'created_at'] || 'p.created_at';
    const sortOrder = params.order === 'ASC' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT p.product_id, p.name, p.slug, p.short_description, p.price, p.sale_price,
             p.sku, p.is_featured, p.created_at,
             c.name as category_name, b.name as brand_name,
             i.quantity as stock_quantity, i.status as stock_status,
             ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating,
             COUNT(DISTINCT r.review_id) as review_count,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) as primary_image,
             CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price
               THEN ROUND(((p.price - p.sale_price) / p.price) * 100, 0) ELSE 0 END as discount_percent
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      LEFT JOIN Inventory i ON p.product_id = i.product_id
      LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
      ${where}
      GROUP BY p.product_id, p.name, p.slug, p.short_description, p.price, p.sale_price,
               p.sku, p.is_featured, p.created_at, c.name, b.name, i.quantity, i.status
      ORDER BY ${sortField} ${sortOrder}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT p.product_id) as total
      FROM Products p
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      ${where}
    `;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, queryParams),
      executeQuery(dataQuery, queryParams),
    ]);

    const result = buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
    await cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  async getProductDetail(productId: number, userId?: number) {
    const cacheKey = CACHE_KEYS.PRODUCT(productId);
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      if (userId) await this.trackRecentlyViewed(userId, productId);
      return cached;
    }

    const productResult = await executeQuery(
      `SELECT p.product_id, p.name, p.slug, p.description, p.short_description,
              p.price, p.sale_price, p.sku, p.barcode, p.status, p.is_featured,
              p.meta_title, p.meta_description, p.created_at,
              c.name as category_name, c.slug as category_slug,
              b.name as brand_name, b.slug as brand_slug, b.logo_url as brand_logo,
              i.quantity as stock_quantity, i.status as stock_status,
              ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating,
              COUNT(DISTINCT r.review_id) as review_count,
              CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price
                THEN ROUND(((p.price - p.sale_price) / p.price) * 100, 0) ELSE 0 END as discount_percent
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.category_id
       LEFT JOIN Brands b ON p.brand_id = b.brand_id
       LEFT JOIN Inventory i ON p.product_id = i.product_id
       LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
       WHERE p.product_id = @id AND p.status = 'Active'
       GROUP BY p.product_id, p.name, p.slug, p.description, p.short_description,
                p.price, p.sale_price, p.sku, p.barcode, p.status, p.is_featured,
                p.meta_title, p.meta_description, p.created_at,
                c.name, c.slug, b.name, b.slug, b.logo_url,
                i.quantity, i.status`,
      { id: { type: sql.Int, value: productId } }
    );

    const product = productResult.recordset[0];
    if (!product) return null;

    const imagesResult = await executeQuery(
      `SELECT image_url, is_primary, sort_order FROM ProductImages WHERE product_id = @id ORDER BY is_primary DESC, sort_order ASC`,
      { id: { type: sql.Int, value: productId } }
    );

    const result = { ...product, images: imagesResult.recordset };
    await cacheService.set(cacheKey, result, CACHE_TTL.LONG);

    if (userId) await this.trackRecentlyViewed(userId, productId);

    return result;
  }

  async getFeaturedProducts() {
    const cached = await cacheService.get<any[]>(CACHE_KEYS.FEATURED_PRODUCTS);
    if (cached) return cached;

    const result = await executeQuery(
      `SELECT TOP 12 p.product_id, p.name, p.slug, p.price, p.sale_price, p.is_featured,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image,
              ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating
       FROM Products p
       LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
       WHERE p.status = 'Active' AND p.is_featured = 1
       GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price, p.is_featured
       ORDER BY p.created_at DESC`
    );
    const products = result.recordset;
    await cacheService.set(CACHE_KEYS.FEATURED_PRODUCTS, products, CACHE_TTL.LONG);
    return products;
  }

  async getNewArrivals() {
    const result = await executeQuery(
      `SELECT TOP 16 p.product_id, p.name, p.slug, p.price, p.sale_price, p.created_at,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
       FROM Products p WHERE p.status = 'Active'
       ORDER BY p.created_at DESC`
    );
    return result.recordset;
  }

  async getRelatedProducts(productId: number) {
    const product = await executeQuery(
      `SELECT category_id FROM Products WHERE product_id = @id`,
      { id: { type: sql.Int, value: productId } }
    );
    if (!product.recordset[0]) return [];

    const result = await executeQuery(
      `SELECT TOP 8 p.product_id, p.name, p.slug, p.price, p.sale_price,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
       FROM Products p
       WHERE p.status = 'Active' AND p.category_id = @category_id AND p.product_id <> @id
       ORDER BY NEWID()`,
      {
        category_id: { type: sql.Int, value: product.recordset[0].category_id },
        id: { type: sql.Int, value: productId },
      }
    );
    return result.recordset;
  }

  async getBestSellers() {
    const cached = await cacheService.get<any[]>(CACHE_KEYS.BEST_SELLERS);
    if (cached) return cached;

    const result = await executeQuery(
      `SELECT TOP 16 p.product_id, p.name, p.slug, p.price, p.sale_price,
              SUM(oi.quantity) as total_sold,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
       FROM Products p
       INNER JOIN OrderItems oi ON p.product_id = oi.product_id
       INNER JOIN Orders o ON oi.order_id = o.order_id AND o.order_status NOT IN ('Cancelled', 'Returned')
       WHERE p.status = 'Active'
       GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price
       ORDER BY total_sold DESC`
    );
    const products = result.recordset;
    await cacheService.set(CACHE_KEYS.BEST_SELLERS, products, CACHE_TTL.VERY_LONG);
    return products;
  }

  async getRecentlyViewed(userId: number) {
    const result = await executeQuery(
      `SELECT TOP 12 p.product_id, p.name, p.slug, p.price, p.sale_price, rv.viewed_at,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
       FROM RecentlyViewed rv
       INNER JOIN Products p ON rv.product_id = p.product_id
       WHERE rv.user_id = @user_id AND p.status = 'Active'
       ORDER BY rv.viewed_at DESC`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset;
  }

  private async trackRecentlyViewed(userId: number, productId: number): Promise<void> {
    try {
      await executeQuery(
        `MERGE RecentlyViewed AS target
         USING (SELECT @user_id AS user_id, @product_id AS product_id) AS source
         ON target.user_id = source.user_id AND target.product_id = source.product_id
         WHEN MATCHED THEN UPDATE SET viewed_at = GETDATE()
         WHEN NOT MATCHED THEN INSERT (user_id, product_id, viewed_at) VALUES (@user_id, @product_id, GETDATE());`,
        {
          user_id: { type: sql.Int, value: userId },
          product_id: { type: sql.Int, value: productId },
        }
      );
    } catch { /* Non-critical */ }
  }
}
