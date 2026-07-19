import { executeQuery } from '../database/db';
import sql from 'mssql';
import { Customer } from '../interfaces/customer.interface';

export class CustomerRepository {
  async getCustomers(page = 1, limit = 10, search?: string): Promise<{ data: Customer[]; total: number }> {
    const offset = (page - 1) * limit;
    
    // In our schema, role_id 3 is typically 'Customer'
    let countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total 
      FROM Users u
      JOIN UserRoles ur ON u.user_id = ur.user_id
      JOIN Roles r ON ur.role_id = r.role_id
      WHERE r.name = 'Customer'
    `;
    
    let dataQuery = `
      SELECT 
        u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at, u.last_login,
        COUNT(DISTINCT o.order_id) as total_orders,
        ISNULL(SUM(o.total_amount), 0) as total_spent
      FROM Users u
      JOIN UserRoles ur ON u.user_id = ur.user_id
      JOIN Roles r ON ur.role_id = r.role_id
      LEFT JOIN Orders o ON u.user_id = o.user_id
      WHERE r.name = 'Customer'
    `;
    
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };

    if (search) {
      countQuery += ` AND (u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search)`;
      dataQuery += ` AND (u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search)`;
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }

    dataQuery += ` 
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at, u.last_login
      ORDER BY u.created_at DESC 
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async updateCustomerStatus(userId: number, status: string): Promise<boolean> {
    const query = `UPDATE Users SET status = @status, updated_at = GETDATE() WHERE user_id = @userId`;
    const result = await executeQuery(query, {
      userId: { type: sql.Int, value: userId },
      status: { type: sql.VarChar, value: status }
    });
    return result.rowsAffected[0] > 0;
  }
}
