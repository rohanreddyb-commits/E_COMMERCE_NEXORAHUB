import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { ApiError } from '../../utils/ApiError';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { AuditService } from '../../shared/audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

export class CustomerSupportService {
  private readonly auditService = new AuditService();
  private readonly notificationService = new NotificationService();

  async createTicket(userId: number, data: {
    subject: string;
    category: string;
    priority?: string;
    message: string;
    orderId?: number;
  }) {
    const result = await executeQuery(
      `INSERT INTO SupportTickets (user_id, order_id, subject, category, priority, status, created_at, updated_at)
       OUTPUT inserted.ticket_id
       VALUES (@user_id, @order_id, @subject, @category, @priority, 'Open', GETDATE(), GETDATE())`,
      {
        user_id: { type: sql.Int, value: userId },
        order_id: { type: sql.Int, value: data.orderId || null },
        subject: { type: sql.NVarChar(200), value: data.subject },
        category: { type: sql.VarChar(50), value: data.category },
        priority: { type: sql.VarChar(20), value: data.priority || 'Medium' },
      }
    );

    const ticketId = result.recordset[0].ticket_id;

    // First message in ticket
    await executeQuery(
      `INSERT INTO SupportMessages (ticket_id, sender_id, sender_type, message, created_at)
       VALUES (@ticket_id, @sender_id, 'Customer', @message, GETDATE())`,
      {
        ticket_id: { type: sql.Int, value: ticketId },
        sender_id: { type: sql.Int, value: userId },
        message: { type: sql.NVarChar(sql.MAX), value: data.message },
      }
    );

    await this.auditService.log({ userId, action: 'support_ticket_created', module: 'support', recordId: ticketId });

    return { ticketId, status: 'Open', message: 'Support ticket created successfully.' };
  }

  async getMyTickets(userId: number, page: unknown, limit: unknown, status?: string) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 20);

    let where = `WHERE user_id = @user_id`;
    const params: Record<string, { type: any; value: any }> = {
      user_id: { type: sql.Int, value: userId },
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: l },
    };

    if (status) {
      where += ` AND status = @status`;
      params.status = { type: sql.VarChar(20), value: status };
    }

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM SupportTickets ${where}`,
      params
    );

    const dataResult = await executeQuery(
      `SELECT ticket_id, subject, category, priority, status, created_at, updated_at,
              (SELECT COUNT(*) FROM SupportMessages sm WHERE sm.ticket_id = st.ticket_id) as message_count
       FROM SupportTickets st
       ${where}
       ORDER BY updated_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }

  async getTicketDetail(ticketId: number, userId: number) {
    const ticketResult = await executeQuery(
      `SELECT st.*, o.order_number
       FROM SupportTickets st
       LEFT JOIN Orders o ON st.order_id = o.order_id
       WHERE st.ticket_id = @ticket_id AND st.user_id = @user_id`,
      { ticket_id: { type: sql.Int, value: ticketId }, user_id: { type: sql.Int, value: userId } }
    );

    const ticket = ticketResult.recordset[0];
    if (!ticket) throw new ApiError(404, 'Ticket not found.');

    const messagesResult = await executeQuery(
      `SELECT sm.message_id, sm.sender_id, sm.sender_type, sm.message, sm.attachment_url, sm.created_at,
              CASE WHEN sm.sender_type = 'Customer' THEN u.first_name + ' ' + u.last_name ELSE 'Support Team' END as sender_name
       FROM SupportMessages sm
       LEFT JOIN Users u ON sm.sender_id = u.user_id
       WHERE sm.ticket_id = @ticket_id
       ORDER BY sm.created_at ASC`,
      { ticket_id: { type: sql.Int, value: ticketId } }
    );

    return { ticket, messages: messagesResult.recordset };
  }

  async replyToTicket(ticketId: number, userId: number, message: string) {
    const ticketCheck = await executeQuery(
      `SELECT status FROM SupportTickets WHERE ticket_id = @ticket_id AND user_id = @user_id`,
      { ticket_id: { type: sql.Int, value: ticketId }, user_id: { type: sql.Int, value: userId } }
    );

    const ticket = ticketCheck.recordset[0];
    if (!ticket) throw new ApiError(404, 'Ticket not found.');
    if (ticket.status === 'Closed') throw new ApiError(400, 'Cannot reply to a closed ticket.');

    await executeQuery(
      `INSERT INTO SupportMessages (ticket_id, sender_id, sender_type, message, created_at)
       VALUES (@ticket_id, @sender_id, 'Customer', @message, GETDATE())`,
      {
        ticket_id: { type: sql.Int, value: ticketId },
        sender_id: { type: sql.Int, value: userId },
        message: { type: sql.NVarChar(sql.MAX), value: message },
      }
    );

    // Re-open ticket if it was resolved
    await executeQuery(
      `UPDATE SupportTickets SET status = 'In Progress', updated_at = GETDATE() WHERE ticket_id = @ticket_id`,
      { ticket_id: { type: sql.Int, value: ticketId } }
    );

    return { message: 'Reply sent.' };
  }

  async closeTicket(ticketId: number, userId: number): Promise<void> {
    const result = await executeQuery(
      `UPDATE SupportTickets SET status = 'Closed', updated_at = GETDATE() WHERE ticket_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: ticketId }, user_id: { type: sql.Int, value: userId } }
    );
    if (!result.rowsAffected[0]) throw new ApiError(404, 'Ticket not found.');
  }
}
