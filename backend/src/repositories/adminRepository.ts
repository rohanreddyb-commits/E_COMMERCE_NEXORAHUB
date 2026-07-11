import { executeQuery } from "../database/db";

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

export class AdminRepository {
  static async getDashboardStats(): Promise<DashboardStats> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM Products) as total_products,
        (SELECT COUNT(*) FROM Orders) as total_orders,
        (SELECT COUNT(*) FROM Users WHERE role_id = 2) as total_customers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM Orders WHERE payment_status = 'Success' AND order_status != 'Cancelled') as total_revenue;
    `;

    const result = await executeQuery(query);
    const row = result.recordset[0];

    return {
      totalProducts: row.total_products || 0,
      totalOrders: row.total_orders || 0,
      totalCustomers: row.total_customers || 0,
      totalRevenue: Number(row.total_revenue || 0),
    };
  }
}
