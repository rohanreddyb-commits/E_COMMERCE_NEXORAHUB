import { executeQuery } from '../database/db';
import sql from 'mssql';

export class AnalyticsRepository {
  async getDashboardMetrics(): Promise<any> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM Orders) as total_orders,
        (SELECT ISNULL(SUM(total_amount), 0) FROM Orders) as total_revenue,
        (SELECT COUNT(DISTINCT u.user_id) FROM Users u JOIN UserRoles ur ON u.user_id = ur.user_id JOIN Roles r ON ur.role_id = r.role_id WHERE r.name = 'Customer') as total_customers,
        (SELECT COUNT(*) FROM Products) as total_products
    `;
    const result = await executeQuery(query);
    return result.recordset[0];
  }

  async getSalesData(period: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    let dateFormat = '';
    
    // Simplistic date grouping for SQL Server
    if (period === 'daily') {
      dateFormat = 'CONVERT(date, created_at)';
    } else if (period === 'monthly') {
      dateFormat = `FORMAT(created_at, 'yyyy-MM')`;
    } else {
      // Weekly (Year-Week)
      dateFormat = `DATEPART(year, created_at) * 100 + DATEPART(iso_week, created_at)`;
    }

    const query = `
      SELECT 
        ${dateFormat} as label,
        SUM(total_amount) as revenue,
        COUNT(order_id) as orders
      FROM Orders
      WHERE created_at >= DATEADD(day, -30, GETDATE())
      GROUP BY ${dateFormat}
      ORDER BY label ASC
    `;
    const result = await executeQuery(query);
    return result.recordset;
  }
}
