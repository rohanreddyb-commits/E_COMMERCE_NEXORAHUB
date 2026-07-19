import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';

export interface CartItem {
  cart_item_id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  saved_for_later: boolean;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  stock_status: string;
  primary_image: string | null;
  brand_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export class CustomerCartRepository {
  private readonly cartQuery = `
    SELECT ci.cart_item_id, ci.user_id, ci.product_id, ci.quantity,
           ci.saved_for_later, ci.created_at, ci.updated_at,
           p.name, p.slug, p.price, p.sale_price, p.status as product_status,
           b.name as brand_name,
           i.quantity as stock_quantity, i.status as stock_status,
           (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) as primary_image
    FROM CartItems ci
    INNER JOIN Products p ON ci.product_id = p.product_id
    LEFT JOIN Brands b ON p.brand_id = b.brand_id
    LEFT JOIN Inventory i ON p.product_id = i.product_id
  `;

  async getActiveCart(userId: number): Promise<CartItem[]> {
    const query = `${this.cartQuery}
      WHERE ci.user_id = @user_id AND ci.saved_for_later = 0
      ORDER BY ci.created_at ASC
    `;
    const result = await executeQuery(query, { user_id: { type: sql.Int, value: userId } });
    return result.recordset;
  }

  async getSavedForLater(userId: number): Promise<CartItem[]> {
    const query = `${this.cartQuery}
      WHERE ci.user_id = @user_id AND ci.saved_for_later = 1
      ORDER BY ci.updated_at DESC
    `;
    const result = await executeQuery(query, { user_id: { type: sql.Int, value: userId } });
    return result.recordset;
  }

  async getItemById(cartItemId: number): Promise<any | null> {
    const result = await executeQuery(
      `SELECT ci.*, p.price, p.status as product_status, i.quantity as stock_quantity
       FROM CartItems ci
       INNER JOIN Products p ON ci.product_id = p.product_id
       LEFT JOIN Inventory i ON p.product_id = i.product_id
       WHERE ci.cart_item_id = @id`,
      { id: { type: sql.Int, value: cartItemId } }
    );
    return result.recordset[0] || null;
  }

  async getItemByUserAndProduct(userId: number, productId: number, savedForLater = false): Promise<any | null> {
    const result = await executeQuery(
      `SELECT * FROM CartItems WHERE user_id = @user_id AND product_id = @product_id AND saved_for_later = @sfl`,
      {
        user_id: { type: sql.Int, value: userId },
        product_id: { type: sql.Int, value: productId },
        sfl: { type: sql.Bit, value: savedForLater ? 1 : 0 },
      }
    );
    return result.recordset[0] || null;
  }

  async addItem(userId: number, productId: number, quantity: number): Promise<number> {
    const result = await executeQuery(
      `INSERT INTO CartItems (user_id, product_id, quantity, saved_for_later, created_at, updated_at)
       OUTPUT INSERTED.cart_item_id
       VALUES (@user_id, @product_id, @quantity, 0, GETDATE(), GETDATE())`,
      {
        user_id: { type: sql.Int, value: userId },
        product_id: { type: sql.Int, value: productId },
        quantity: { type: sql.Int, value: quantity },
      }
    );
    return result.recordset[0].cart_item_id;
  }

  async updateQuantity(cartItemId: number, quantity: number): Promise<boolean> {
    const result = await executeQuery(
      `UPDATE CartItems SET quantity = @quantity, updated_at = GETDATE() WHERE cart_item_id = @id`,
      {
        id: { type: sql.Int, value: cartItemId },
        quantity: { type: sql.Int, value: quantity },
      }
    );
    return result.rowsAffected[0] > 0;
  }

  async deleteItem(cartItemId: number): Promise<boolean> {
    const result = await executeQuery(
      `DELETE FROM CartItems WHERE cart_item_id = @id`,
      { id: { type: sql.Int, value: cartItemId } }
    );
    return result.rowsAffected[0] > 0;
  }

  async clearCart(userId: number, transaction?: sql.Transaction): Promise<void> {
    const query = `DELETE FROM CartItems WHERE user_id = @user_id AND saved_for_later = 0`;
    if (transaction) {
      await transaction.request().input('user_id', sql.Int, userId).query(query);
    } else {
      await executeQuery(query, { user_id: { type: sql.Int, value: userId } });
    }
  }

  async saveForLater(cartItemId: number, userId: number): Promise<boolean> {
    const result = await executeQuery(
      `UPDATE CartItems SET saved_for_later = 1, updated_at = GETDATE()
       WHERE cart_item_id = @id AND user_id = @user_id AND saved_for_later = 0`,
      {
        id: { type: sql.Int, value: cartItemId },
        user_id: { type: sql.Int, value: userId },
      }
    );
    return result.rowsAffected[0] > 0;
  }

  async moveToCart(cartItemId: number, userId: number): Promise<boolean> {
    const result = await executeQuery(
      `UPDATE CartItems SET saved_for_later = 0, updated_at = GETDATE()
       WHERE cart_item_id = @id AND user_id = @user_id AND saved_for_later = 1`,
      {
        id: { type: sql.Int, value: cartItemId },
        user_id: { type: sql.Int, value: userId },
      }
    );
    return result.rowsAffected[0] > 0;
  }

  async countActiveItems(userId: number): Promise<number> {
    const result = await executeQuery(
      `SELECT COUNT(*) as cnt FROM CartItems WHERE user_id = @user_id AND saved_for_later = 0`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset[0].cnt;
  }
}
