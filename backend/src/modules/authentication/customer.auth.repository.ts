import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { hashToken } from '../../common/utils/crypto.util';
import { sessionRegistry } from '../../shared/session/session.registry';

export interface CustomerSession {
  session_id: string;
  user_id: number;
  refresh_token_hash: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: Date;
  created_at: Date;
  last_used_at: Date;
}

export interface PasswordResetRecord {
  id: number;
  user_id: number;
  otp_hash: string;
  token_hash: string | null;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export class CustomerAuthRepository {
  // ─── Session Management ────────────────────────────────────────────────────

  async createSession(
    userId: number,
    sessionId: string,
    refreshToken: string,
    deviceInfo: {
      deviceName?: string;
      deviceType?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    expiresAt: Date
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const query = `
      INSERT INTO CustomerSessions (
        session_id, user_id, refresh_token_hash, device_name, device_type,
        ip_address, user_agent, is_active, expires_at, created_at, last_used_at
      )
      VALUES (
        @session_id, @user_id, @refresh_token_hash, @device_name, @device_type,
        @ip_address, @user_agent, 1, @expires_at, GETDATE(), GETDATE()
      )
    `;
    await executeQuery(query, {
      session_id: { type: sql.VarChar(100), value: sessionId },
      user_id: { type: sql.Int, value: userId },
      refresh_token_hash: { type: sql.VarChar(255), value: tokenHash },
      device_name: { type: sql.NVarChar(100), value: deviceInfo.deviceName || null },
      device_type: { type: sql.NVarChar(50), value: deviceInfo.deviceType || null },
      ip_address: { type: sql.VarChar(45), value: deviceInfo.ipAddress || null },
      user_agent: { type: sql.NVarChar(500), value: deviceInfo.userAgent || null },
      expires_at: { type: sql.DateTime, value: expiresAt },
    });
  }

  async findSessionById(sessionId: string): Promise<CustomerSession | null> {
    const query = `
      SELECT * FROM CustomerSessions
      WHERE session_id = @session_id AND is_active = 1 AND expires_at > GETDATE()
    `;
    const result = await executeQuery(query, {
      session_id: { type: sql.VarChar(100), value: sessionId },
    });
    return result.recordset[0] || null;
  }

  async findSessionByToken(refreshToken: string): Promise<CustomerSession | null> {
    const tokenHash = hashToken(refreshToken);
    const query = `
      SELECT * FROM CustomerSessions
      WHERE refresh_token_hash = @token_hash AND is_active = 1 AND expires_at > GETDATE()
    `;
    const result = await executeQuery(query, {
      token_hash: { type: sql.VarChar(255), value: tokenHash },
    });
    return result.recordset[0] || null;
  }

  async rotateSession(
    sessionId: string,
    newRefreshToken: string,
    newExpiresAt: Date
  ): Promise<void> {
    const newHash = hashToken(newRefreshToken);
    const query = `
      UPDATE CustomerSessions
      SET refresh_token_hash = @new_hash, expires_at = @expires_at, last_used_at = GETDATE()
      WHERE session_id = @session_id AND is_active = 1
    `;
    await executeQuery(query, {
      session_id: { type: sql.VarChar(100), value: sessionId },
      new_hash: { type: sql.VarChar(255), value: newHash },
      expires_at: { type: sql.DateTime, value: newExpiresAt },
    });
  }

  /**
   * Revocation must invalidate the session cache as well as the row, or the
   * access token keeps working until the cache TTL lapses.
   */
  async revokeSession(sessionId: string): Promise<void> {
    const query = `
      UPDATE CustomerSessions SET is_active = 0
      WHERE session_id = @session_id
    `;
    await executeQuery(query, {
      session_id: { type: sql.VarChar(100), value: sessionId },
    });
    sessionRegistry.invalidate(sessionId);
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    const query = `
      UPDATE CustomerSessions SET is_active = 0
      WHERE user_id = @user_id
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    sessionRegistry.invalidateUser(userId);
  }

  async getUserActiveSessions(userId: number): Promise<CustomerSession[]> {
    const query = `
      SELECT session_id, user_id, device_name, device_type, ip_address,
             user_agent, is_active, expires_at, created_at, last_used_at
      FROM CustomerSessions
      WHERE user_id = @user_id AND is_active = 1 AND expires_at > GETDATE()
      ORDER BY last_used_at DESC
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset;
  }

  // ─── Password Reset / OTP ──────────────────────────────────────────────────

  async upsertPasswordReset(
    userId: number,
    otpHash: string,
    expiresAt: Date
  ): Promise<void> {
    const query = `
      MERGE PasswordResetTokens AS target
      USING (SELECT @user_id AS user_id) AS source ON target.user_id = source.user_id AND target.used = 0
      WHEN MATCHED THEN
        UPDATE SET otp_hash = @otp_hash, token_hash = NULL, expires_at = @expires_at, used = 0, created_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (user_id, otp_hash, expires_at, used, created_at)
        VALUES (@user_id, @otp_hash, @expires_at, 0, GETDATE());
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      otp_hash: { type: sql.VarChar(255), value: otpHash },
      expires_at: { type: sql.DateTime, value: expiresAt },
    });
  }

  async findPasswordReset(userId: number): Promise<PasswordResetRecord | null> {
    const query = `
      SELECT * FROM PasswordResetTokens
      WHERE user_id = @user_id AND used = 0 AND expires_at > GETDATE()
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  async markPasswordResetOtpVerified(userId: number, tokenHash: string): Promise<void> {
    const query = `
      UPDATE PasswordResetTokens
      SET token_hash = @token_hash
      WHERE user_id = @user_id AND used = 0 AND expires_at > GETDATE()
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      token_hash: { type: sql.VarChar(255), value: tokenHash },
    });
  }

  async findByResetToken(tokenHash: string): Promise<PasswordResetRecord | null> {
    const query = `
      SELECT * FROM PasswordResetTokens
      WHERE token_hash = @token_hash AND used = 0 AND expires_at > GETDATE()
    `;
    const result = await executeQuery(query, {
      token_hash: { type: sql.VarChar(255), value: tokenHash },
    });
    return result.recordset[0] || null;
  }

  /**
   * Record a wrong OTP guess and return the running total. The caller
   * invalidates the record once MAX_OTP_ATTEMPTS is reached, which bounds a
   * distributed brute force against the 6-digit keyspace.
   */
  async incrementPasswordResetAttempts(userId: number): Promise<number> {
    const result = await executeQuery(
      `UPDATE PasswordResetTokens
       SET attempts = attempts + 1
       OUTPUT inserted.attempts
       WHERE user_id = @user_id AND used = 0 AND expires_at > GETDATE()`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset[0]?.attempts ?? 0;
  }

  async incrementEmailVerificationAttempts(userId: number): Promise<number> {
    const result = await executeQuery(
      `UPDATE EmailVerifications
       SET attempts = attempts + 1
       OUTPUT inserted.attempts
       WHERE user_id = @user_id AND verified = 0 AND expires_at > GETDATE()`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset[0]?.attempts ?? 0;
  }

  /** Force-expire an email verification OTP after too many wrong guesses. */
  async expireEmailVerification(userId: number): Promise<void> {
    await executeQuery(
      `UPDATE EmailVerifications SET expires_at = GETDATE()
       WHERE user_id = @user_id AND verified = 0`,
      { user_id: { type: sql.Int, value: userId } }
    );
  }

  async markPasswordResetUsed(userId: number): Promise<void> {
    const query = `
      UPDATE PasswordResetTokens SET used = 1
      WHERE user_id = @user_id AND used = 0
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
  }

  // ─── Email Verification ────────────────────────────────────────────────────

  async upsertEmailVerification(userId: number, otpHash: string, expiresAt: Date): Promise<void> {
    const query = `
      MERGE EmailVerifications AS target
      USING (SELECT @user_id AS user_id) AS source ON target.user_id = source.user_id AND target.verified = 0
      WHEN MATCHED THEN
        UPDATE SET otp_hash = @otp_hash, expires_at = @expires_at, created_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (user_id, otp_hash, expires_at, verified, created_at)
        VALUES (@user_id, @otp_hash, @expires_at, 0, GETDATE());
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      otp_hash: { type: sql.VarChar(255), value: otpHash },
      expires_at: { type: sql.DateTime, value: expiresAt },
    });
  }

  async findEmailVerification(userId: number): Promise<{ otp_hash: string; expires_at: Date } | null> {
    const query = `
      SELECT otp_hash, expires_at FROM EmailVerifications
      WHERE user_id = @user_id AND verified = 0 AND expires_at > GETDATE()
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  async markEmailVerified(userId: number): Promise<void> {
    return runInTransaction(async (transaction) => {
      await transaction.request()
        .input('user_id', sql.Int, userId)
        .query(`UPDATE Users SET is_email_verified = 1 WHERE user_id = @user_id`);
      await transaction.request()
        .input('user_id', sql.Int, userId)
        .query(`UPDATE EmailVerifications SET verified = 1 WHERE user_id = @user_id`);
    });
  }

  // ─── Login History ─────────────────────────────────────────────────────────

  async recordLoginAttempt(
    userId: number,
    ipAddress: string,
    userAgent: string,
    success: boolean
  ): Promise<void> {
    const query = `
      INSERT INTO LoginHistory (user_id, ip_address, user_agent, success, attempted_at)
      VALUES (@user_id, @ip_address, @user_agent, @success, GETDATE())
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      ip_address: { type: sql.VarChar(45), value: ipAddress },
      user_agent: { type: sql.NVarChar(500), value: userAgent },
      success: { type: sql.Bit, value: success ? 1 : 0 },
    });
  }

  async countRecentFailedAttempts(userId: number, windowMinutes = 30): Promise<number> {
    const query = `
      SELECT COUNT(*) as cnt FROM LoginHistory
      WHERE user_id = @user_id AND success = 0
        AND attempted_at > DATEADD(MINUTE, -@window, GETDATE())
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      window: { type: sql.Int, value: windowMinutes },
    });
    return result.recordset[0].cnt || 0;
  }

  // ─── Account Locking ───────────────────────────────────────────────────────

  async lockAccount(userId: number, lockedUntil: Date): Promise<void> {
    const query = `
      UPDATE Users SET locked_until = @locked_until WHERE user_id = @user_id
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      locked_until: { type: sql.DateTime, value: lockedUntil },
    });
  }

  async isAccountLocked(userId: number): Promise<boolean> {
    const query = `
      SELECT locked_until FROM Users WHERE user_id = @user_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    const user = result.recordset[0];
    if (!user || !user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  async unlockAccount(userId: number): Promise<void> {
    const query = `
      UPDATE Users SET locked_until = NULL WHERE user_id = @user_id
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
  }

  // ─── Password History ─────────────────────────────────────────────────────

  async addPasswordHistory(userId: number, passwordHash: string): Promise<void> {
    const query = `
      INSERT INTO PasswordHistory (user_id, password_hash, created_at)
      VALUES (@user_id, @password_hash, GETDATE())
    `;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      password_hash: { type: sql.VarChar(255), value: passwordHash },
    });
  }

  async getRecentPasswordHashes(userId: number, count = 5): Promise<string[]> {
    const query = `
      SELECT TOP (@count) password_hash FROM PasswordHistory
      WHERE user_id = @user_id
      ORDER BY created_at DESC
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      count: { type: sql.Int, value: count },
    });
    return result.recordset.map((r: any) => r.password_hash);
  }

  // ─── Cleanup Jobs ─────────────────────────────────────────────────────────

  async deleteExpiredSessions(): Promise<number> {
    const query = `
      DELETE FROM CustomerSessions WHERE expires_at < GETDATE() OR is_active = 0
    `;
    const result = await executeQuery(query);
    return result.rowsAffected[0];
  }
}
