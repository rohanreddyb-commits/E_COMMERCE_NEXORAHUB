import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { ApiError } from '../../utils/ApiError';
import { CANCELLABLE_ORDER_STATUSES } from '../../core/constants/customer.constants';
import { AuditService } from '../../shared/audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

export class CustomerOrderService {
  private readonly auditService: AuditService;
  private readonly notificationService: NotificationService;

  constructor() {
    this.auditService = new AuditService();
    this.notificationService = new NotificationService();
  }

  async getMyOrders(userId: number, page: unknown, limit: unknown, status?: string) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 50);

    let countQuery = `SELECT COUNT(*) as total FROM Orders WHERE user_id = @user_id`;
    let dataQuery = `
      SELECT o.order_id, o.order_number, o.order_status, o.payment_status, o.payment_method,
             o.subtotal, o.shipping_fee, o.tax_amount, o.discount_amount, o.total_amount,
             o.tracking_number, o.created_at, o.updated_at,
             (SELECT COUNT(*) FROM OrderItems oi WHERE oi.order_id = o.order_id) as item_count
      FROM Orders o
      WHERE o.user_id = @user_id
    `;

    const params: Record<string, { type: any; value: any }> = {
      user_id: { type: sql.Int, value: userId },
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: l },
    };

    if (status) {
      countQuery += ` AND order_status = @status`;
      dataQuery += ` AND o.order_status = @status`;
      params.status = { type: sql.VarChar(30), value: status };
    }

    dataQuery += ` ORDER BY o.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params),
    ]);

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }

  async getOrderDetails(orderId: number, userId: number) {
    const orderResult = await executeQuery(
      `SELECT o.*, a.street, a.city, a.state, a.postal_code, a.country,
              a.first_name as ship_first_name, a.last_name as ship_last_name, a.phone as ship_phone
       FROM Orders o
       LEFT JOIN Addresses a ON o.shipping_address_id = a.address_id
       WHERE o.order_id = @order_id AND o.user_id = @user_id`,
      {
        order_id: { type: sql.Int, value: orderId },
        user_id: { type: sql.Int, value: userId },
      }
    );

    const order = orderResult.recordset[0];
    if (!order) throw new ApiError(404, 'Order not found.');

    const [itemsResult, paymentResult, historyResult] = await Promise.all([
      executeQuery(
        `SELECT oi.order_item_id, oi.product_id, oi.product_name, oi.sku, oi.quantity, oi.unit_price, oi.total_price,
                (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = oi.product_id ORDER BY pi.is_primary DESC) as product_image
         FROM OrderItems oi WHERE oi.order_id = @order_id`,
        { order_id: { type: sql.Int, value: orderId } }
      ),
      executeQuery(
        `SELECT gateway_transaction_id, payment_method, amount, status, response_json, created_at
         FROM Transactions WHERE order_id = @order_id ORDER BY created_at DESC`,
        { order_id: { type: sql.Int, value: orderId } }
      ),
      executeQuery(
        `SELECT status, changed_at, notes FROM OrderStatusHistory WHERE order_id = @order_id ORDER BY changed_at ASC`,
        { order_id: { type: sql.Int, value: orderId } }
      ),
    ]);

    return {
      orderId: order.order_id,
      orderNumber: order.order_number,
      status: order.order_status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      trackingNumber: order.tracking_number,
      giftMessage: order.notes,
      pricing: {
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        tax: order.tax_amount,
        discount: order.discount_amount,
        total: order.total_amount,
      },
      shippingAddress: order.street ? {
        name: `${order.ship_first_name} ${order.ship_last_name}`,
        phone: order.ship_phone,
        street: order.street,
        city: order.city,
        state: order.state,
        postalCode: order.postal_code,
        country: order.country,
      } : null,
      items: itemsResult.recordset,
      payment: paymentResult.recordset[0] || null,
      statusHistory: historyResult.recordset,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  async cancelOrder(orderId: number, userId: number, reason: string): Promise<void> {
    const orderResult = await executeQuery(
      `SELECT order_id, order_status, user_id FROM Orders WHERE order_id = @order_id AND user_id = @user_id`,
      { order_id: { type: sql.Int, value: orderId }, user_id: { type: sql.Int, value: userId } }
    );

    const order = orderResult.recordset[0];
    if (!order) throw new ApiError(404, 'Order not found.');
    if (!CANCELLABLE_ORDER_STATUSES.includes(order.order_status as any)) {
      throw new ApiError(400, `Order cannot be cancelled. Current status: ${order.order_status}`);
    }

    // Update order status and restore inventory
    const { runInTransaction } = await import('../../database/db');
    await runInTransaction(async (transaction) => {
      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .query(`UPDATE Orders SET order_status = 'Cancelled', updated_at = GETDATE() WHERE order_id = @order_id`);

      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .query(`INSERT INTO OrderStatusHistory (order_id, status, notes, changed_at)
                VALUES (@order_id, 'Cancelled', 'Cancelled by customer', GETDATE())`);

      // Restore inventory
      const items = await transaction.request()
        .input('order_id', sql.Int, orderId)
        .query(`SELECT product_id, quantity FROM OrderItems WHERE order_id = @order_id`);

      for (const item of items.recordset) {
        await transaction.request()
          .input('product_id', sql.Int, item.product_id)
          .input('qty', sql.Int, item.quantity)
          .query(`UPDATE Inventory SET quantity = quantity + @qty WHERE product_id = @product_id`);
      }

      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .input('reason', sql.NVarChar(500), reason)
        .query(`INSERT INTO OrderCancellations (order_id, reason, cancelled_at) VALUES (@order_id, @reason, GETDATE())`);
    });

    await this.notificationService.createNotification(userId, {
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Your order has been cancelled. Your refund will be processed within 5-7 business days.`,
      referenceId: orderId,
    });

    await this.auditService.log({ userId, action: 'order_cancelled', module: 'orders', recordId: orderId });
  }

  async getOrderTimeline(orderId: number, userId: number) {
    const orderCheck = await executeQuery(
      `SELECT 1 FROM Orders WHERE order_id = @order_id AND user_id = @user_id`,
      { order_id: { type: sql.Int, value: orderId }, user_id: { type: sql.Int, value: userId } }
    );
    if (!orderCheck.recordset.length) throw new ApiError(404, 'Order not found.');

    const result = await executeQuery(
      `SELECT status, changed_at, notes FROM OrderStatusHistory WHERE order_id = @order_id ORDER BY changed_at ASC`,
      { order_id: { type: sql.Int, value: orderId } }
    );
    return result.recordset;
  }

  async getRecentOrders(userId: number, limit = 5) {
    const result = await executeQuery(
      `SELECT TOP (@limit) o.order_id, o.order_number, o.order_status, o.total_amount, o.created_at,
              (SELECT COUNT(*) FROM OrderItems oi WHERE oi.order_id = o.order_id) as item_count,
              (SELECT TOP 1 oi2.product_name FROM OrderItems oi2 WHERE oi2.order_id = o.order_id) as first_item
       FROM Orders o WHERE o.user_id = @user_id ORDER BY o.created_at DESC`,
      {
        user_id: { type: sql.Int, value: userId },
        limit: { type: sql.Int, value: limit },
      }
    );
    return result.recordset;
  }
}
