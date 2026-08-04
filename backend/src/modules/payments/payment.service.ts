import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { getPaymentGateway } from './gateways/simulated.gateway';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../config/logger';
import { AuditService } from '../../shared/audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';

export class PaymentService {
  private readonly auditService: AuditService;
  private readonly notificationService: NotificationService;

  constructor() {
    this.auditService = new AuditService();
    this.notificationService = new NotificationService();
  }

  async initiatePayment(userId: number, orderId: number) {
    const orderResult = await executeQuery(
      `SELECT order_id, order_number, total_amount, payment_status, payment_method, user_id
       FROM Orders WHERE order_id = @order_id AND user_id = @user_id`,
      { order_id: { type: sql.Int, value: orderId }, user_id: { type: sql.Int, value: userId } }
    );
    const order = orderResult.recordset[0];
    if (!order) throw new ApiError(404, 'Order not found.');
    if (order.payment_status === 'Paid') throw new ApiError(400, 'This order has already been paid.');
    if (order.payment_method === 'COD') {
      return { method: 'COD', message: 'Cash on delivery order confirmed.', orderId };
    }

    const gateway = getPaymentGateway();
    const intent = await gateway.createPaymentIntent(orderId, order.total_amount, 'INR');

    // Store pending transaction
    await executeQuery(
      `INSERT INTO Transactions (order_id, gateway_transaction_id, amount, payment_method, status, created_at)
       VALUES (@order_id, @gateway_order_id, @amount, @method, 'Pending', GETDATE())`,
      {
        order_id: { type: sql.Int, value: orderId },
        gateway_order_id: { type: sql.VarChar(100), value: intent.gatewayOrderId },
        amount: { type: sql.Decimal(10, 2), value: order.total_amount },
        method: { type: sql.VarChar(50), value: gateway.name },
      }
    );

    return { gateway: gateway.name, intent };
  }

  async verifyPayment(userId: number, orderId: number, paymentData: Record<string, string>) {
    const orderResult = await executeQuery(
      `SELECT order_id, total_amount, user_id, order_number, payment_status, payment_method
       FROM Orders WHERE order_id = @order_id AND user_id = @user_id`,
      { order_id: { type: sql.Int, value: orderId }, user_id: { type: sql.Int, value: userId } }
    );
    const order = orderResult.recordset[0];
    if (!order) throw new ApiError(404, 'Order not found.');

    // Replay guard — a settled order must not be re-verified.
    if (order.payment_status === 'Paid') {
      throw new ApiError(400, 'This order has already been paid.');
    }
    if (order.payment_status === 'Refunded') {
      throw new ApiError(400, 'This order has been refunded and cannot be paid.');
    }

    const gateway = getPaymentGateway();
    const verifyResult = await gateway.verifyPayment(paymentData);

    // The gateway is authoritative for the amount. A verified payment whose
    // value does not match the order total is never accepted as settlement —
    // this is what stops a customer paying ₹1 against a ₹10,000 order.
    if (verifyResult.success) {
      const expected = Number(order.total_amount);
      if (!Number.isFinite(verifyResult.amount) || Math.abs(verifyResult.amount - expected) > 0.01) {
        logger.error(
          `[Payments] Amount mismatch on order ${orderId}: expected ${expected}, ` +
            `gateway reported ${verifyResult.amount}. Rejecting.`
        );
        await this.auditService.log({
          userId,
          action: 'payment_amount_mismatch',
          module: 'payments',
          recordId: orderId,
          newValues: { expected, reported: verifyResult.amount },
        });
        throw new ApiError(400, 'Payment amount does not match the order total.');
      }
    } else {
      logger.warn(`[Payments] Verification failed for order ${orderId} (user ${userId}).`);
    }

    const newOrderStatus = verifyResult.success ? 'Confirmed' : 'Pending';
    const newPaymentStatus = verifyResult.success ? 'Paid' : 'Failed';

    // Update order and transaction
    const { runInTransaction } = await import('../../database/db');
    await runInTransaction(async (transaction) => {
      // Guarded update: the WHERE clause re-asserts the unpaid precondition
      // inside the transaction, so two concurrent verifies cannot both settle.
      const updated = await transaction.request()
        .input('order_id', sql.Int, orderId)
        .input('order_status', sql.VarChar(30), newOrderStatus)
        .input('payment_status', sql.VarChar(30), newPaymentStatus)
        .query(`UPDATE Orders SET order_status = @order_status, payment_status = @payment_status, updated_at = GETDATE()
                WHERE order_id = @order_id AND payment_status <> 'Paid'`);

      if (!updated.rowsAffected[0]) {
        throw new ApiError(409, 'This order was settled by a concurrent request.');
      }

      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .input('txn_id', sql.VarChar(100), verifyResult.gatewayTransactionId)
        .input('status', sql.VarChar(30), verifyResult.status)
        .input('raw', sql.NVarChar(sql.MAX), JSON.stringify(verifyResult.rawResponse))
        .query(`
          UPDATE Transactions SET gateway_transaction_id = @txn_id, status = @status, response_json = @raw
          WHERE order_id = @order_id AND status = 'Pending'
        `);

      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .input('status', sql.VarChar(30), newOrderStatus)
        .query(`INSERT INTO OrderStatusHistory (order_id, status, changed_at) VALUES (@order_id, @status, GETDATE())`);
    });

    if (verifyResult.success) {
      await this.notificationService.createNotification(userId, {
        type: 'payment_success',
        title: 'Payment Successful ✅',
        message: `Payment of ₹${order.total_amount} received for order ${order.order_number}.`,
        referenceId: orderId,
      });
    }

    await this.auditService.log({
      userId,
      action: verifyResult.success ? 'payment_success' : 'payment_failed',
      module: 'payments',
      recordId: orderId,
      newValues: { transactionId: verifyResult.gatewayTransactionId, status: verifyResult.status },
    });

    return { success: verifyResult.success, orderStatus: newOrderStatus, paymentStatus: newPaymentStatus };
  }

  async getPaymentHistory(userId: number, page: unknown, limit: unknown) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 20);
    const countQuery = `SELECT COUNT(*) as total FROM Transactions t INNER JOIN Orders o ON t.order_id = o.order_id WHERE o.user_id = @user_id`;
    const dataQuery = `
      SELECT t.transaction_id, t.order_id, o.order_number, t.gateway_transaction_id, t.amount,
             t.payment_method, t.status, t.created_at
      FROM Transactions t
      INNER JOIN Orders o ON t.order_id = o.order_id
      WHERE o.user_id = @user_id
      ORDER BY t.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const params = {
      user_id: { type: sql.Int, value: userId },
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: l },
    };
    const [countResult, dataResult] = await Promise.all([executeQuery(countQuery, params), executeQuery(dataQuery, params)]);
    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }
}
