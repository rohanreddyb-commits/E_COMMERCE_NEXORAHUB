import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { ApiError } from '../../utils/ApiError';
import { AuditService } from '../../shared/audit/audit.service';

export class CustomerReviewService {
  private readonly auditService = new AuditService();

  async getProductReviews(productId: number, page: unknown, limit: unknown, sort?: string) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 20);

    const validSort: Record<string, string> = {
      recent: 'r.created_at DESC',
      rating_high: 'r.rating DESC',
      rating_low: 'r.rating ASC',
      helpful: 'r.helpful_votes DESC',
    };
    const orderBy = validSort[sort || 'recent'] || validSort.recent;

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM Reviews WHERE product_id = @id AND status = 'Approved'`,
      { id: { type: sql.Int, value: productId } }
    );

    const dataResult = await executeQuery(
      `SELECT r.review_id, r.rating, r.title, r.body, r.helpful_votes, r.created_at,
              r.is_verified_purchase,
              u.first_name + ' ' + LEFT(u.last_name, 1) + '.' as reviewer_name,
              u.avatar_url as reviewer_avatar
       FROM Reviews r
       INNER JOIN Users u ON r.user_id = u.user_id
       WHERE r.product_id = @id AND r.status = 'Approved'
       ORDER BY ${orderBy}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      {
        id: { type: sql.Int, value: productId },
        offset: { type: sql.Int, value: offset },
        limit: { type: sql.Int, value: l },
      }
    );

    const ratingResult = await executeQuery(
      `SELECT rating, COUNT(*) as count FROM Reviews WHERE product_id = @id AND status = 'Approved'
       GROUP BY rating ORDER BY rating DESC`,
      { id: { type: sql.Int, value: productId } }
    );

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    ratingResult.recordset.forEach((r: any) => { ratingBreakdown[r.rating] = r.count; });

    return {
      ...buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l),
      ratingBreakdown,
    };
  }

  async createReview(userId: number, productId: number, data: {
    rating: number; title: string; body: string;
  }) {
    // Check duplicate review
    const existing = await executeQuery(
      `SELECT 1 FROM Reviews WHERE user_id = @user_id AND product_id = @product_id`,
      { user_id: { type: sql.Int, value: userId }, product_id: { type: sql.Int, value: productId } }
    );
    if (existing.recordset.length > 0) throw new ApiError(409, 'You have already reviewed this product.');

    // Check if user purchased this product
    const purchased = await executeQuery(
      `SELECT 1 FROM Orders o
       INNER JOIN OrderItems oi ON o.order_id = oi.order_id
       WHERE o.user_id = @user_id AND oi.product_id = @product_id AND o.order_status = 'Delivered'`,
      { user_id: { type: sql.Int, value: userId }, product_id: { type: sql.Int, value: productId } }
    );
    const isVerifiedPurchase = purchased.recordset.length > 0;

    const result = await executeQuery(
      `INSERT INTO Reviews (user_id, product_id, rating, title, body, status, is_verified_purchase, created_at)
       OUTPUT inserted.review_id
       VALUES (@user_id, @product_id, @rating, @title, @body, 'Pending', @is_verified, GETDATE())`,
      {
        user_id: { type: sql.Int, value: userId },
        product_id: { type: sql.Int, value: productId },
        rating: { type: sql.Int, value: data.rating },
        title: { type: sql.NVarChar(200), value: data.title },
        body: { type: sql.NVarChar(sql.MAX), value: data.body },
        is_verified: { type: sql.Bit, value: isVerifiedPurchase ? 1 : 0 },
      }
    );

    await this.auditService.log({ userId, action: 'review_submitted', module: 'reviews', recordId: productId });
    return { reviewId: result.recordset[0].review_id, isVerifiedPurchase, message: 'Review submitted for approval.' };
  }

  async updateReview(reviewId: number, userId: number, data: { rating?: number; title?: string; body?: string }) {
    const existing = await executeQuery(
      `SELECT * FROM Reviews WHERE review_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: reviewId }, user_id: { type: sql.Int, value: userId } }
    );
    if (!existing.recordset.length) throw new ApiError(404, 'Review not found.');

    const updates: string[] = [];
    const params: Record<string, { type: any; value: any }> = {
      id: { type: sql.Int, value: reviewId },
    };
    if (data.rating !== undefined) { updates.push('rating = @rating'); params.rating = { type: sql.Int, value: data.rating }; }
    if (data.title) { updates.push('title = @title'); params.title = { type: sql.NVarChar(200), value: data.title }; }
    if (data.body) { updates.push('body = @body'); params.body = { type: sql.NVarChar(sql.MAX), value: data.body }; }

    if (updates.length === 0) return existing.recordset[0];

    updates.push(`status = 'Pending'`); // Re-approve after edit
    await executeQuery(`UPDATE Reviews SET ${updates.join(', ')} WHERE review_id = @id`, params);
    return { message: 'Review updated and sent for re-approval.' };
  }

  async deleteReview(reviewId: number, userId: number): Promise<void> {
    const result = await executeQuery(
      `DELETE FROM Reviews WHERE review_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: reviewId }, user_id: { type: sql.Int, value: userId } }
    );
    if (!result.rowsAffected[0]) throw new ApiError(404, 'Review not found.');
  }

  async voteHelpful(reviewId: number, userId: number): Promise<void> {
    // Prevent self-voting
    const isOwner = await executeQuery(
      `SELECT 1 FROM Reviews WHERE review_id = @id AND user_id = @user_id`,
      { id: { type: sql.Int, value: reviewId }, user_id: { type: sql.Int, value: userId } }
    );
    if (isOwner.recordset.length) throw new ApiError(400, 'You cannot vote on your own review.');

    await executeQuery(
      `UPDATE Reviews SET helpful_votes = helpful_votes + 1 WHERE review_id = @id AND status = 'Approved'`,
      { id: { type: sql.Int, value: reviewId } }
    );
  }

  async getMyReviews(userId: number, page: unknown, limit: unknown) {
    const { parsePaginationParams: pp, buildPaginatedResult: bpr } = await import('../../common/utils/pagination.util');
    const { page: p, limit: l, offset } = pp(page, limit, 20);

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM Reviews WHERE user_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );
    const dataResult = await executeQuery(
      `SELECT r.review_id, r.product_id, p.name as product_name, p.slug as product_slug,
              r.rating, r.title, r.body, r.status, r.is_verified_purchase, r.helpful_votes, r.created_at,
              (SELECT TOP 1 pi.image_url FROM ProductImages pi WHERE pi.product_id = p.product_id ORDER BY pi.is_primary DESC) as product_image
       FROM Reviews r INNER JOIN Products p ON r.product_id = p.product_id
       WHERE r.user_id = @user_id ORDER BY r.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { user_id: { type: sql.Int, value: userId }, offset: { type: sql.Int, value: offset }, limit: { type: sql.Int, value: l } }
    );
    return bpr(dataResult.recordset, countResult.recordset[0].total, p, l);
  }
}
