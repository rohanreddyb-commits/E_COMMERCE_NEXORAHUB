import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { logger } from '../../config/logger';

interface AuditEntry {
  userId?: number;
  action: string;
  module: string;
  recordId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Centralized audit service for writing to AuditLogs table.
 * Fire-and-forget — never throws (to not interrupt business flow).
 */
export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO AuditLogs (user_id, action, module, record_id, old_values, new_values, ip_address, created_at)
        VALUES (@user_id, @action, @module, @record_id, @old_values, @new_values, @ip_address, GETDATE())
      `;
      await executeQuery(query, {
        user_id: { type: sql.Int, value: entry.userId || null },
        action: { type: sql.VarChar(100), value: entry.action },
        module: { type: sql.VarChar(100), value: entry.module },
        record_id: { type: sql.Int, value: entry.recordId || null },
        old_values: { type: sql.NVarChar(sql.MAX), value: entry.oldValues ? JSON.stringify(entry.oldValues) : null },
        new_values: { type: sql.NVarChar(sql.MAX), value: entry.newValues ? JSON.stringify(entry.newValues) : null },
        ip_address: { type: sql.VarChar(45), value: entry.ipAddress || null },
      });
    } catch (err: any) {
      // Never throw — audit failures should not break business operations
      logger.error(`[AuditService] Failed to write audit log: ${err.message}`);
    }
  }
}
