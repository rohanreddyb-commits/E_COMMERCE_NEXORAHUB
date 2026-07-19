import { executeQuery } from '../../database/db';
import sql from 'mssql';

export class WishlistRepository {
  async getWishlist(userId: number): Promise<any[]> {
    const query = `
      SELECT w.wishlist_id, w.user_id, w.created_at,
             wi.wishlist_item_id, wi.product_id, wi.added_at,
             p.name, p.slug, p.price, p.sale_price, p.status,
             b.name as brand_name,
             i.quantity as stock_quantity, i.status as stock_status,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) as primary_image
      FROM Wishlist w
      INNER JOIN WishlistItems wi ON w.wishlist_id = wi.wishlist_id
      INNER JOIN Products p ON wi.product_id = p.product_id
      LEFT JOIN Brands b ON p.brand_id = b.brand_id
      LEFT JOIN Inventory i ON p.product_id = i.product_id
      WHERE w.user_id = @user_id AND p.status = 'Active'
      ORDER BY wi.added_at DESC
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset;
  }

  async findOrCreateWishlist(userId: number): Promise<number> {
    const findQuery = `SELECT wishlist_id FROM Wishlist WHERE user_id = @user_id`;
    const existing = await executeQuery(findQuery, {
      user_id: { type: sql.Int, value: userId },
    });
    if (existing.recordset.length > 0) return existing.recordset[0].wishlist_id;

    const createQuery = `
      INSERT INTO Wishlist (user_id, created_at) OUTPUT inserted.wishlist_id VALUES (@user_id, GETDATE())
    `;
    const result = await executeQuery(createQuery, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0].wishlist_id;
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const query = `
      SELECT 1 FROM WishlistItems wi
      INNER JOIN Wishlist w ON wi.wishlist_id = w.wishlist_id
      WHERE w.user_id = @user_id AND wi.product_id = @product_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      product_id: { type: sql.Int, value: productId },
    });
    return result.recordset.length > 0;
  }

  async addItem(wishlistId: number, productId: number): Promise<void> {
    await executeQuery(
      `IF NOT EXISTS (SELECT 1 FROM WishlistItems WHERE wishlist_id = @wishlist_id AND product_id = @product_id)
       INSERT INTO WishlistItems (wishlist_id, product_id, added_at) VALUES (@wishlist_id, @product_id, GETDATE())`,
      {
        wishlist_id: { type: sql.Int, value: wishlistId },
        product_id: { type: sql.Int, value: productId },
      }
    );
  }

  async removeItem(userId: number, productId: number): Promise<boolean> {
    const query = `
      DELETE wi FROM WishlistItems wi
      INNER JOIN Wishlist w ON wi.wishlist_id = w.wishlist_id
      WHERE w.user_id = @user_id AND wi.product_id = @product_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      product_id: { type: sql.Int, value: productId },
    });
    return result.rowsAffected[0] > 0;
  }

  async countItems(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as cnt FROM WishlistItems wi
      INNER JOIN Wishlist w ON wi.wishlist_id = w.wishlist_id
      WHERE w.user_id = @user_id
    `;
    const result = await executeQuery(query, { user_id: { type: sql.Int, value: userId } });
    return result.recordset[0].cnt;
  }
}
