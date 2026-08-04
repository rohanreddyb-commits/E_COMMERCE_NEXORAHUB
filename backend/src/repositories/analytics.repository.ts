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

  /**
   * Grouping expressions keyed by period.
   *
   * SQL Server cannot parameterise a GROUP BY expression, so this fragment is
   * interpolated. It is therefore resolved through a fixed map and can only
   * ever be one of these three literals — an unrecognised `period` falls back
   * to 'daily' rather than reaching the query. Same allow-list pattern used
   * for ORDER BY in the product and search services.
   */
  private static readonly SALES_DATE_GROUPING: Record<string, string> = {
    daily: 'CONVERT(date, created_at)',
    monthly: `FORMAT(created_at, 'yyyy-MM')`,
    weekly: `DATEPART(year, created_at) * 100 + DATEPART(iso_week, created_at)`,
  };

  async getSalesData(period: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    const dateFormat =
      AnalyticsRepository.SALES_DATE_GROUPING[period] ??
      AnalyticsRepository.SALES_DATE_GROUPING.daily;

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
