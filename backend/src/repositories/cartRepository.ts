import sql from "mssql";
import { executeQuery } from "../database/db";

export interface CartItemDB {
  cart_item_id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name?: string;
  price?: number;
  stock_quantity?: number;
  primary_image?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class CartRepository {
  static async getCartByUser(userId: number): Promise<CartItemDB[]> {
    const query = `
      SELECT ci.cart_item_id, ci.user_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
             p.name, p.price, p.stock_quantity,
             (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC, pi.image_id ASC) as primary_image
      FROM CartItems ci
      INNER JOIN Products p ON ci.product_id = p.product_id
      WHERE ci.user_id = @userId
      ORDER BY ci.cart_item_id ASC;
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
    });

    return result.recordset as CartItemDB[];
  }

  static async getCartItemById(cartItemId: number): Promise<CartItemDB | null> {
    const query = `
      SELECT cart_item_id, user_id, product_id, quantity, created_at, updated_at
      FROM CartItems
      WHERE cart_item_id = @cartItemId;
    `;

    const result = await executeQuery(query, {
      cartItemId: { type: sql.Int(), value: cartItemId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as CartItemDB;
  }

  static async getCartItemByUserAndProduct(userId: number, productId: number): Promise<CartItemDB | null> {
    const query = `
      SELECT cart_item_id, user_id, product_id, quantity, created_at, updated_at
      FROM CartItems
      WHERE user_id = @userId AND product_id = @productId;
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
      productId: { type: sql.Int(), value: productId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as CartItemDB;
  }

  static async createCartItem(userId: number, productId: number, quantity: number): Promise<number> {
    const query = `
      INSERT INTO CartItems (user_id, product_id, quantity, created_at, updated_at)
      OUTPUT INSERTED.cart_item_id
      VALUES (@userId, @productId, @quantity, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
      productId: { type: sql.Int(), value: productId },
      quantity: { type: sql.Int(), value: quantity },
    });

    return result.recordset[0].cart_item_id;
  }

  static async updateCartItemQuantity(cartItemId: number, quantity: number): Promise<boolean> {
    const query = `
      UPDATE CartItems
      SET quantity = @quantity, updated_at = GETDATE()
      WHERE cart_item_id = @cartItemId;
    `;

    const result = await executeQuery(query, {
      cartItemId: { type: sql.Int(), value: cartItemId },
      quantity: { type: sql.Int(), value: quantity },
    });

    return result.rowsAffected[0] > 0;
  }

  static async deleteCartItem(cartItemId: number): Promise<boolean> {
    const query = "DELETE FROM CartItems WHERE cart_item_id = @cartItemId;";
    const result = await executeQuery(query, {
      cartItemId: { type: sql.Int(), value: cartItemId },
    });

    return result.rowsAffected[0] > 0;
  }

  static async clearCart(userId: number, connection?: sql.Transaction): Promise<void> {
    const query = "DELETE FROM CartItems WHERE user_id = @userId;";
    if (connection instanceof sql.Transaction) {
      await connection.request()
        .input("userId", sql.Int(), userId)
        .query(query);
    } else {
      await executeQuery(query, {
        userId: { type: sql.Int(), value: userId },
      });
    }
  }
}
