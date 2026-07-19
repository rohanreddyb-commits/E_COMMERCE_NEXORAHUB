import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';

export class ProfileRepository {
  async findById(userId: number): Promise<any | null> {
    const query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
             u.status, u.created_at, u.last_login,
             ISNULL(u.avatar_url, NULL) as avatar_url,
             ISNULL(u.date_of_birth, NULL) as date_of_birth,
             ISNULL(u.gender, NULL) as gender,
             ISNULL(u.is_email_verified, 0) as is_email_verified,
             rp.points_balance, rp.tier
      FROM Users u
      LEFT JOIN RewardPoints rp ON u.user_id = rp.user_id
      WHERE u.user_id = @user_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  async update(userId: number, data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
  }): Promise<any> {
    const updates: string[] = [];
    const request: Record<string, { type: any; value: any }> = {
      user_id: { type: sql.Int, value: userId },
    };

    if (data.first_name !== undefined) {
      updates.push('first_name = @first_name');
      request.first_name = { type: sql.NVarChar(100), value: data.first_name };
    }
    if (data.last_name !== undefined) {
      updates.push('last_name = @last_name');
      request.last_name = { type: sql.NVarChar(100), value: data.last_name };
    }
    if (data.phone !== undefined) {
      updates.push('phone = @phone');
      request.phone = { type: sql.VarChar(20), value: data.phone || null };
    }
    if (data.date_of_birth !== undefined) {
      updates.push('date_of_birth = @date_of_birth');
      request.date_of_birth = { type: sql.Date, value: data.date_of_birth || null };
    }
    if (data.gender !== undefined) {
      updates.push('gender = @gender');
      request.gender = { type: sql.VarChar(10), value: data.gender || null };
    }

    if (updates.length === 0) return this.findById(userId);

    const query = `UPDATE Users SET ${updates.join(', ')}, updated_at = GETDATE() WHERE user_id = @user_id`;
    await executeQuery(query, request);
    return this.findById(userId);
  }

  async updateAvatar(userId: number, avatarUrl: string | null): Promise<void> {
    await executeQuery(
      `UPDATE Users SET avatar_url = @avatar_url, updated_at = GETDATE() WHERE user_id = @user_id`,
      {
        user_id: { type: sql.Int, value: userId },
        avatar_url: { type: sql.NVarChar(500), value: avatarUrl },
      }
    );
  }
}
