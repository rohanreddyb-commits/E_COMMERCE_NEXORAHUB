import { executeQuery } from '../../database/db';
import sql from 'mssql';

export class RecommendationService {
  async getPersonalizedRecommendations(userId: number, limit = 10) {
    // 1. Based on recent order history categories and recently viewed
    const query = `
      WITH UserCategories AS (
        SELECT DISTINCT p.category_id
        FROM Orders o
        INNER JOIN OrderItems oi ON o.order_id = oi.order_id
        INNER JOIN Products p ON oi.product_id = p.product_id
        WHERE o.user_id = @user_id
        UNION
        SELECT DISTINCT p.category_id
        FROM RecentlyViewed rv
        INNER JOIN Products p ON rv.product_id = p.product_id
        WHERE rv.user_id = @user_id
      )
      SELECT TOP (@limit) p.product_id, p.name, p.slug, p.price, p.sale_price,
             c.name as category_name, b.name as brand_name,
             ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
      FROM Products p
      INNER JOIN UserCategories uc ON p.category_id = uc.category_id
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
      WHERE p.status = 'Active'
        AND p.product_id NOT IN (
          SELECT product_id FROM RecentlyViewed WHERE user_id = @user_id
        )
      GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price, c.name, b.name,
               p.is_featured, p.created_at
      ORDER BY p.is_featured DESC, avg_rating DESC, p.created_at DESC
    `;

    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      limit: { type: sql.Int, value: limit },
    });

    // Fallback to trending/featured if no user history
    if (result.recordset.length === 0) {
      const fallbackQuery = `
        SELECT TOP (@limit) p.product_id, p.name, p.slug, p.price, p.sale_price,
               c.name as category_name, b.name as brand_name,
               ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) as avg_rating,
               (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
        FROM Products p
        LEFT JOIN Categories c ON p.category_id = c.category_id
        LEFT JOIN Brands b ON p.brand_id = b.brand_id
        LEFT JOIN Reviews r ON p.product_id = r.product_id AND r.status = 'Approved'
        WHERE p.status = 'Active'
        GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price, c.name, b.name,
                 p.is_featured
        ORDER BY p.is_featured DESC, avg_rating DESC
      `;
      const fallbackResult = await executeQuery(fallbackQuery, {
        limit: { type: sql.Int, value: limit },
      });
      return fallbackResult.recordset;
    }

    return result.recordset;
  }

  async getFrequentlyBoughtTogether(productId: number, limit = 4) {
    const query = `
      SELECT TOP (@limit) p.product_id, p.name, p.slug, p.price, p.sale_price,
             COUNT(*) as buy_count,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as primary_image
      FROM OrderItems oi1
      INNER JOIN OrderItems oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id <> oi2.product_id
      INNER JOIN Products p ON oi2.product_id = p.product_id
      WHERE oi1.product_id = @productId AND p.status = 'Active'
      GROUP BY p.product_id, p.name, p.slug, p.price, p.sale_price
      ORDER BY buy_count DESC
    `;
    const result = await executeQuery(query, {
      productId: { type: sql.Int, value: productId },
      limit: { type: sql.Int, value: limit },
    });
    return result.recordset;
  }
}
