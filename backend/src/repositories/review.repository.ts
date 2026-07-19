import { executeQuery } from '../database/db';
import sql from 'mssql';
import { Review } from '../interfaces/review.interface';

export class ReviewRepository {
  async getReviews(page = 1, limit = 10, search?: string, status?: string): Promise<{ data: Review[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let countQuery = `SELECT COUNT(*) as total FROM Reviews r`;
    let dataQuery = `
      SELECT r.*, 
             u.first_name + ' ' + u.last_name as customer_name,
             p.name as product_name
      FROM Reviews r
      JOIN Users u ON r.user_id = u.user_id
      JOIN Products p ON r.product_id = p.product_id
    `;
    
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };
    
    const conditions = [];

    if (search) {
      conditions.push(`(u.first_name LIKE @search OR p.name LIKE @search OR r.title LIKE @search)`);
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }
    
    if (status) {
      conditions.push(`r.status = @status`);
      params.status = { type: sql.VarChar, value: status };
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ` + conditions.join(' AND ');
      countQuery += whereClause;
      dataQuery += whereClause;
    }

    dataQuery += ` ORDER BY r.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async updateReviewStatus(reviewId: number, status: string): Promise<boolean> {
    const query = `UPDATE Reviews SET status = @status, updated_at = GETDATE() WHERE review_id = @reviewId`;
    const result = await executeQuery(query, {
      reviewId: { type: sql.Int, value: reviewId },
      status: { type: sql.VarChar, value: status }
    });
    return result.rowsAffected[0] > 0;
  }
}
