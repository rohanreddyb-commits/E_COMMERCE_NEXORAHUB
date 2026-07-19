import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { cacheService } from '../../common/cache/cache.factory';
import { CACHE_KEYS, CACHE_TTL } from '../../core/constants/customer.constants';

export class SearchService {
  async search(params: {
    q: string; page: unknown; limit: unknown;
    categoryId?: number; brandId?: number;
    minPrice?: number; maxPrice?: number;
    sort?: string; order?: string;
    userId?: number;
  }) {
    const { parsePaginationParams, buildPaginatedResult } = await import('../../common/utils/pagination.util');
    const { page: p, limit: l, offset } = parsePaginationParams(params.page, params.limit, 50);

    if (!params.q?.trim()) {
      return buildPaginatedResult([], 0, p, l);
    }

    const searchTerm = params.q.trim();

    // Track search history (non-blocking)
    if (params.userId) {
      this.trackSearchHistory(params.userId, searchTerm).catch(() => {});
    }
    this.incrementSearchCount(searchTerm).catch(() => {});

    const conditions: string[] = [
      `p.status = 'Active'`,
      `(p.name LIKE @search OR p.description LIKE @search OR p.sku LIKE @search OR b.name LIKE @search OR c.name LIKE @search)`,
    ];
    const queryParams: Record<string, { type: any; value: any }> = {
      search: { type: sql.NVarChar, value: `%${searchTerm}%` },
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: l },
    };

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

    const where = `WHERE ${conditions.join(' AND ')}`;

    const validSortMap: Record<string, string> = {
      price: 'ISNULL(p.sale_price, p.price)', name: 'p.name',
      rating: 'avg_rating', relevance: `(CASE WHEN p.name LIKE @search THEN 3 WHEN p.sku LIKE @search THEN 2 ELSE 1 END)`,
    };
    const sortField = validSortMap[params.sort || 'relevance'] || validSortMap.relevance;
    const sortOrder = params.order === 'ASC' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT p.product_id, p.name, p.slug, p.price, p.sale_price, p.sku,
             c.name as category_name, b.name as brand_name,
             i.quantity as stock_quantity,
             ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating,
             COUNT(DISTINCT r.review_id) as review_count,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image,
             CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price
               THEN ROUND(((p.price - p.sale_price) / p.price) * 100, 0) ELSE 0 END as discount_percent
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      LEFT JOIN Inventory i ON p.product_id = i.product_id
      LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
      ${where}
      GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price, p.sku,
               c.name, b.name, i.quantity
      ORDER BY ${sortField} ${sortOrder}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT p.product_id) as total
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      ${where}
    `;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, queryParams),
      executeQuery(dataQuery, queryParams),
    ]);

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }

  async autocomplete(q: string) {
    if (!q?.trim() || q.trim().length < 2) return [];

    const result = await executeQuery(
      `SELECT TOP 10 p.product_id, p.name, p.slug, p.price, p.sale_price,
              c.name as category_name,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.category_id
       WHERE p.status = 'Active' AND p.name LIKE @q
       ORDER BY p.name ASC`,
      { q: { type: sql.NVarChar, value: `%${q.trim()}%` } }
    );
    return result.recordset;
  }

  async getTrendingSearches() {
    const cached = await cacheService.get<any[]>(CACHE_KEYS.TRENDING_SEARCHES);
    if (cached) return cached;

    const result = await executeQuery(
      `SELECT TOP 10 term, search_count FROM SearchAnalytics ORDER BY search_count DESC`
    );
    const trending = result.recordset;
    await cacheService.set(CACHE_KEYS.TRENDING_SEARCHES, trending, CACHE_TTL.LONG);
    return trending;
  }

  async getSearchHistory(userId: number) {
    const result = await executeQuery(
      `SELECT TOP 20 search_term, searched_at FROM SearchHistory
       WHERE user_id = @user_id ORDER BY searched_at DESC`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset;
  }

  async clearSearchHistory(userId: number): Promise<void> {
    await executeQuery(`DELETE FROM SearchHistory WHERE user_id = @user_id`, {
      user_id: { type: sql.Int, value: userId },
    });
  }

  private async trackSearchHistory(userId: number, term: string): Promise<void> {
    await executeQuery(
      `INSERT INTO SearchHistory (user_id, search_term, searched_at) VALUES (@user_id, @term, GETDATE())`,
      { user_id: { type: sql.Int, value: userId }, term: { type: sql.NVarChar(255), value: term } }
    );
  }

  private async incrementSearchCount(term: string): Promise<void> {
    await executeQuery(
      `MERGE SearchAnalytics AS target USING (SELECT @term AS term) AS source ON target.term = source.term
       WHEN MATCHED THEN UPDATE SET search_count = search_count + 1, last_searched = GETDATE()
       WHEN NOT MATCHED THEN INSERT (term, search_count, last_searched) VALUES (@term, 1, GETDATE());`,
      { term: { type: sql.NVarChar(255), value: term.toLowerCase() } }
    );
  }
}
