import sql from "mssql";
import { executeQuery } from "../database/db";

export interface OrderDB {
  order_id: number;
  user_id: number;
  address_id: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  coupon_code: string | null;
  order_status: "Pending" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  payment_status: "Pending" | "Success" | "Failed";
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemDB {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  name?: string;
}

export class OrderRepository {
  static async createOrder(
    userId: number,
    addressId: number,
    subtotal: number,
    discountAmount: number,
    totalAmount: number,
    couponCode: string | null,
    orderStatus: string,
    paymentStatus: string,
    transaction: sql.Transaction
  ): Promise<number> {
    const query = `
      INSERT INTO Orders (user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at)
      OUTPUT INSERTED.order_id
      VALUES (@userId, @addressId, @subtotal, @discountAmount, @totalAmount, @couponCode, @orderStatus, @paymentStatus, GETDATE(), GETDATE());
    `;

    const result = await transaction.request()
      .input("userId", sql.Int, userId)
      .input("addressId", sql.Int, addressId)
      .input("subtotal", sql.Decimal(10, 2), subtotal)
      .input("discountAmount", sql.Decimal(10, 2), discountAmount)
      .input("totalAmount", sql.Decimal(10, 2), totalAmount)
      .input("couponCode", sql.VarChar, couponCode || null)
      .input("orderStatus", sql.VarChar, orderStatus)
      .input("paymentStatus", sql.VarChar, paymentStatus)
      .query(query);

    return result.recordset[0].order_id;
  }

  static async createOrderItem(
    orderId: number,
    productId: number,
    quantity: number,
    unitPrice: number,
    totalPrice: number,
    transaction: sql.Transaction
  ): Promise<void> {
    const query = `
      INSERT INTO OrderItems (order_id, product_id, quantity, unit_price, total_price)
      VALUES (@orderId, @productId, @quantity, @unitPrice, @totalPrice);
    `;

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .input("productId", sql.Int, productId)
      .input("quantity", sql.Int, quantity)
      .input("unitPrice", sql.Decimal(10, 2), unitPrice)
      .input("totalPrice", sql.Decimal(10, 2), totalPrice)
      .query(query);
  }

  static async createPayment(
    orderId: number,
    transactionId: string,
    amount: number,
    paymentMethod: string,
    paymentStatus: string,
    transaction: sql.Transaction
  ): Promise<void> {
    const query = `
      INSERT INTO Payments (order_id, transaction_id, amount, payment_method, payment_status, created_at)
      VALUES (@orderId, @transactionId, @amount, @paymentMethod, @paymentStatus, GETDATE());
    `;

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .input("transactionId", sql.VarChar, transactionId)
      .input("amount", sql.Decimal(10, 2), amount)
      .input("paymentMethod", sql.VarChar, paymentMethod)
      .input("paymentStatus", sql.VarChar, paymentStatus)
      .query(query);
  }

  static async getOrdersByUser(userId: number): Promise<OrderDB[]> {
    const query = `
      SELECT order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at
      FROM Orders
      WHERE user_id = @userId
      ORDER BY order_id DESC;
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
    });

    return result.recordset as OrderDB[];
  }

  static async getOrderById(orderId: number): Promise<OrderDB | null> {
    const query = `
      SELECT order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at
      FROM Orders
      WHERE order_id = @orderId;
    `;

    const result = await executeQuery(query, {
      orderId: { type: sql.Int(), value: orderId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as OrderDB;
  }

  static async getOrderItems(orderId: number): Promise<OrderItemDB[]> {
    const query = `
      SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
             p.name
      FROM OrderItems oi
      INNER JOIN Products p ON oi.product_id = p.product_id
      WHERE oi.order_id = @orderId;
    `;

    const result = await executeQuery(query, {
      orderId: { type: sql.Int(), value: orderId },
    });

    return result.recordset as OrderItemDB[];
  }

  static async getPaymentInfo(orderId: number): Promise<any | null> {
    const query = `
      SELECT payment_id, order_id, transaction_id, amount, payment_method, payment_status, created_at
      FROM Payments
      WHERE order_id = @orderId;
    `;

    const result = await executeQuery(query, {
      orderId: { type: sql.Int(), value: orderId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0];
  }

  static async getAllOrders(): Promise<(OrderDB & { customer_name: string })[]> {
    const query = `
      SELECT o.order_id, o.user_id, o.address_id, o.subtotal, o.discount_amount, o.total_amount, 
             o.coupon_code, o.order_status, o.payment_status, o.created_at, o.updated_at,
             u.name as customer_name
      FROM Orders o
      INNER JOIN Users u ON o.user_id = u.user_id
      ORDER BY o.order_id DESC;
    `;

    const result = await executeQuery(query);
    return result.recordset as (OrderDB & { customer_name: string })[];
  }

  static async updateOrderStatus(
    orderId: number,
    orderStatus: string,
    paymentStatus: string
  ): Promise<boolean> {
    const query = `
      UPDATE Orders
      SET order_status = @orderStatus, payment_status = @paymentStatus, updated_at = GETDATE()
      WHERE order_id = @orderId;
    `;

    const result = await executeQuery(query, {
      orderId: { type: sql.Int(), value: orderId },
      orderStatus: { type: sql.VarChar(), value: orderStatus },
      paymentStatus: { type: sql.VarChar(), value: paymentStatus },
    });

    return result.rowsAffected[0] > 0;
  }
}
