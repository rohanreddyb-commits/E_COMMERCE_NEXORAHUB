import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { ApiError } from '../../utils/ApiError';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { RETURNABLE_ORDER_STATUSES, RETURN_WINDOW_DAYS } from '../../core/constants/customer.constants';
import { AuditService } from '../../shared/audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

export class CustomerReturnService {
  private readonly auditService = new AuditService();
  private readonly notificationService = new NotificationService();

  async requestReturn(userId: number, data: {
    orderId: number;
    orderItemId: number;
    reason: string;
    description?: string;
  }) {
    // 1. Check order eligibility
    const orderResult = await executeQuery(
      `SELECT order_id, order_status, created_at, updated_at FROM Orders
       WHERE order_id = @order_id AND user_id = @user_id`,
      {
        order_id: { type: sql.Int, value: data.orderId },
        user_id: { type: sql.Int, value: userId },
      }
    );
    const order = orderResult.recordset[0];
    if (!order) throw new ApiError(404, 'Order not found.');
    if (!RETURNABLE_ORDER_STATUSES.includes(order.order_status as any)) {
      throw new ApiError(400, `Returns can only be requested for delivered orders. Current status: ${order.order_status}`);
    }

    // Check return window
    const deliveredDate = new Date(order.updated_at || order.created_at);
    const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new ApiError(400, `Return window expired. Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`);
    }

    // Check existing return
    const existing = await executeQuery(
      `SELECT 1 FROM ReturnRequests WHERE order_item_id = @item_id AND status <> 'Rejected'`,
      { item_id: { type: sql.Int, value: data.orderItemId } }
    );
    if (existing.recordset.length > 0) {
      throw new ApiError(409, 'A return request for this item has already been submitted.');
    }

    // Get item refund amount
    const itemResult = await executeQuery(
      `SELECT total_price FROM OrderItems WHERE order_item_id = @item_id AND order_id = @order_id`,
      { item_id: { type: sql.Int, value: data.orderItemId }, order_id: { type: sql.Int, value: data.orderId } }
    );
    const item = itemResult.recordset[0];
    if (!item) throw new ApiError(404, 'Order item not found.');

    const returnResult = await executeQuery(
      `INSERT INTO ReturnRequests (user_id, order_id, order_item_id, reason, description, refund_amount, status, created_at)
       OUTPUT inserted.return_id
       VALUES (@user_id, @order_id, @order_item_id, @reason, @description, @refund_amount, 'Requested', GETDATE())`,
      {
        user_id: { type: sql.Int, value: userId },
        order_id: { type: sql.Int, value: data.orderId },
        order_item_id: { type: sql.Int, value: data.orderItemId },
        reason: { type: sql.NVarChar(200), value: data.reason },
        description: { type: sql.NVarChar(sql.MAX), value: data.description || null },
        refund_amount: { type: sql.Decimal(10, 2), value: item.total_price },
      }
    );

    const returnId = returnResult.recordset[0].return_id;

    await this.notificationService.createNotification(userId, {
      type: 'return_requested',
      title: 'Return Request Received 📦',
      message: `Your return request for Order #${data.orderId} has been submitted and is under review.`,
      referenceId: returnId,
    });

    await this.auditService.log({ userId, action: 'return_requested', module: 'returns', recordId: returnId });

    return { returnId, status: 'Requested', refundAmount: item.total_price, message: 'Return request submitted successfully.' };
  }

  async getMyReturns(userId: number, page: unknown, limit: unknown) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 20);

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM ReturnRequests WHERE user_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );

    const dataResult = await executeQuery(
      `SELECT r.return_id, r.order_id, o.order_number, r.reason, r.description,
              r.refund_amount, r.status, r.created_at,
              oi.product_name, oi.unit_price, oi.quantity
       FROM ReturnRequests r
       INNER JOIN Orders o ON r.order_id = o.order_id
       INNER JOIN OrderItems oi ON r.order_item_id = oi.order_item_id
       WHERE r.user_id = @user_id
       ORDER BY r.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { user_id: { type: sql.Int, value: userId }, offset: { type: sql.Int, value: offset }, limit: { type: sql.Int, value: l } }
    );

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }

  async getReturnDetail(returnId: number, userId: number) {
    const result = await executeQuery(
      `SELECT r.*, o.order_number, oi.product_name, oi.sku, oi.unit_price, oi.quantity
       FROM ReturnRequests r
       INNER JOIN Orders o ON r.order_id = o.order_id
       INNER JOIN OrderItems oi ON r.order_item_id = oi.order_item_id
       WHERE r.return_id = @id AND r.user_id = @user_id`,
      { id: { type: sql.Int, value: returnId }, user_id: { type: sql.Int, value: userId } }
    );

    const record = result.recordset[0];
    if (!record) throw new ApiError(404, 'Return request not found.');
    return record;
  }
}
