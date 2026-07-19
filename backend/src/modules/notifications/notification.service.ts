import { executeQuery } from '../../database/db';
import sql from 'mssql';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  referenceId?: number;
  imageUrl?: string;
  actionUrl?: string;
}

export class NotificationService {
  async createNotification(userId: number, payload: NotificationPayload): Promise<void> {
    try {
      await executeQuery(
        `INSERT INTO Notifications (user_id, type, title, message, reference_id, image_url, action_url, is_read, created_at)
         VALUES (@user_id, @type, @title, @message, @reference_id, @image_url, @action_url, 0, GETDATE())`,
        {
          user_id: { type: sql.Int, value: userId },
          type: { type: sql.VarChar(50), value: payload.type },
          title: { type: sql.NVarChar(200), value: payload.title },
          message: { type: sql.NVarChar(sql.MAX), value: payload.message },
          reference_id: { type: sql.Int, value: payload.referenceId || null },
          image_url: { type: sql.NVarChar(500), value: payload.imageUrl || null },
          action_url: { type: sql.NVarChar(500), value: payload.actionUrl || null },
        }
      );
    } catch (err: any) {
      // Non-critical — don't throw
      console.error('[NotificationService] Failed to create notification:', err.message);
    }
  }

  async getNotifications(userId: number, page: unknown, limit: unknown, unreadOnly?: boolean) {
    const { parsePaginationParams, buildPaginatedResult } = await import('../../common/utils/pagination.util');
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 50);

    let where = `WHERE user_id = @user_id`;
    if (unreadOnly) where += ` AND is_read = 0`;

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM Notifications ${where}`,
      { user_id: { type: sql.Int, value: userId } }
    );

    const dataResult = await executeQuery(
      `SELECT notification_id, type, title, message, reference_id, image_url, action_url, is_read, created_at
       FROM Notifications ${where}
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { user_id: { type: sql.Int, value: userId }, offset: { type: sql.Int, value: offset }, limit: { type: sql.Int, value: l } }
    );

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await executeQuery(
      `SELECT COUNT(*) as cnt FROM Notifications WHERE user_id = @user_id AND is_read = 0`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset[0].cnt;
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await executeQuery(
      `UPDATE Notifications SET is_read = 1 WHERE notification_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: notificationId }, user_id: { type: sql.Int, value: userId } }
    );
  }

  async markAllAsRead(userId: number): Promise<void> {
    await executeQuery(
      `UPDATE Notifications SET is_read = 1 WHERE user_id = @user_id AND is_read = 0`,
      { user_id: { type: sql.Int, value: userId } }
    );
  }

  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    await executeQuery(
      `DELETE FROM Notifications WHERE notification_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: notificationId }, user_id: { type: sql.Int, value: userId } }
    );
  }
}
