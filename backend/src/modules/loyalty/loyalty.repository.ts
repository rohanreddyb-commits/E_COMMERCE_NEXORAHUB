import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';

export class LoyaltyRepository {
  async initializeCustomer(userId: number): Promise<void> {
    const query = `
      IF NOT EXISTS (SELECT 1 FROM RewardPoints WHERE user_id = @user_id)
      BEGIN
        INSERT INTO RewardPoints (user_id, points_balance, lifetime_points, tier, created_at, updated_at)
        VALUES (@user_id, 0, 0, 'Bronze', GETDATE(), GETDATE())
      END
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
  }

  async getCustomerLoyalty(userId: number): Promise<{
    points_balance: number;
    lifetime_points: number;
    tier: string;
  } | null> {
    const query = `SELECT points_balance, lifetime_points, tier FROM RewardPoints WHERE user_id = @user_id`;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  async getLoyaltyHistory(
    userId: number,
    offset: number,
    limit: number
  ): Promise<{ data: any[]; total: number }> {
    const countQuery = `SELECT COUNT(*) as total FROM RewardPointsHistory WHERE user_id = @user_id`;
    const dataQuery = `
      SELECT id, user_id, points, type, description, reference_id, reference_type, created_at
      FROM RewardPointsHistory
      WHERE user_id = @user_id
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const params = {
      user_id: { type: sql.Int, value: userId },
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit },
    };
    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params),
    ]);
    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total,
    };
  }

  async addPoints(
    userId: number,
    points: number,
    description: string,
    referenceId?: number,
    referenceType?: string
  ): Promise<void> {
    return runInTransaction(async (transaction) => {
      await transaction.request()
        .input('user_id', sql.Int, userId)
        .input('points', sql.Int, points)
        .query(`
          UPDATE RewardPoints
          SET points_balance = points_balance + @points,
              lifetime_points = lifetime_points + @points,
              updated_at = GETDATE()
          WHERE user_id = @user_id
        `);

      await transaction.request()
        .input('user_id', sql.Int, userId)
        .input('points', sql.Int, points)
        .input('type', sql.VarChar(50), 'earned')
        .input('description', sql.NVarChar(255), description)
        .input('reference_id', sql.Int, referenceId || null)
        .input('reference_type', sql.VarChar(50), referenceType || null)
        .query(`
          INSERT INTO RewardPointsHistory (user_id, points, type, description, reference_id, reference_type, created_at)
          VALUES (@user_id, @points, @type, @description, @reference_id, @reference_type, GETDATE())
        `);

      // Update tier based on lifetime points
      await this.updateTierInTransaction(transaction, userId);
    });
  }

  async redeemPoints(
    userId: number,
    points: number,
    description: string,
    referenceId?: number
  ): Promise<void> {
    return runInTransaction(async (transaction) => {
      const result = await transaction.request()
        .input('user_id', sql.Int, userId)
        .query(`SELECT points_balance FROM RewardPoints WHERE user_id = @user_id`);

      const balance = result.recordset[0]?.points_balance || 0;
      if (balance < points) {
        throw new Error('Insufficient reward points balance.');
      }

      await transaction.request()
        .input('user_id', sql.Int, userId)
        .input('points', sql.Int, points)
        .query(`
          UPDATE RewardPoints
          SET points_balance = points_balance - @points,
              updated_at = GETDATE()
          WHERE user_id = @user_id
        `);

      await transaction.request()
        .input('user_id', sql.Int, userId)
        .input('points', sql.Int, -points)
        .input('description', sql.NVarChar(255), description)
        .input('reference_id', sql.Int, referenceId || null)
        .query(`
          INSERT INTO RewardPointsHistory (user_id, points, type, description, reference_id, reference_type, created_at)
          VALUES (@user_id, @points, 'redeemed', @description, @reference_id, NULL, GETDATE())
        `);
    });
  }

  private async updateTierInTransaction(transaction: sql.Transaction, userId: number): Promise<void> {
    const result = await transaction.request()
      .input('user_id', sql.Int, userId)
      .query(`SELECT lifetime_points FROM RewardPoints WHERE user_id = @user_id`);

    const lifetimePoints = result.recordset[0]?.lifetime_points || 0;
    let tier = 'Bronze';
    if (lifetimePoints >= 10000) tier = 'Platinum';
    else if (lifetimePoints >= 5000) tier = 'Gold';
    else if (lifetimePoints >= 1000) tier = 'Silver';

    await transaction.request()
      .input('user_id', sql.Int, userId)
      .input('tier', sql.VarChar(20), tier)
      .query(`UPDATE RewardPoints SET tier = @tier WHERE user_id = @user_id`);
  }
}
