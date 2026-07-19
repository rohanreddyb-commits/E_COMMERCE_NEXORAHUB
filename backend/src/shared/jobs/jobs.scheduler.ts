import cron from 'node-cron';
import { CustomerAuthRepository } from '../../modules/authentication/customer.auth.repository';
import { logger } from '../../config/logger';
import { executeQuery } from '../../database/db';

/**
 * Enterprise Background Job Scheduler using node-cron.
 * Handles recurring system maintenance and automated customer workflows.
 */
export function initBackgroundJobs(): void {
  logger.info('[Scheduler] Initializing background job cron tasks...');

  const authRepo = new CustomerAuthRepository();

  // 1. Session Cleanup — Runs daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('[Cron Job] Running expired session cleanup...');
      const deletedCount = await authRepo.deleteExpiredSessions();
      logger.info(`[Cron Job] Expired session cleanup complete. Removed ${deletedCount} sessions.`);
    } catch (err: any) {
      logger.error(`[Cron Job] Session cleanup failed: ${err.message}`);
    }
  });

  // 2. Unverified OTP / Token Cleanup — Runs daily at 4:00 AM
  cron.schedule('0 4 * * *', async () => {
    try {
      logger.info('[Cron Job] Cleaning expired OTP tokens...');
      await executeQuery(`DELETE FROM PasswordResetTokens WHERE expires_at < GETDATE() OR used = 1`);
      await executeQuery(`DELETE FROM EmailVerifications WHERE expires_at < GETDATE() OR verified = 1`);
      logger.info('[Cron Job] OTP token cleanup complete.');
    } catch (err: any) {
      logger.error(`[Cron Job] OTP token cleanup failed: ${err.message}`);
    }
  });

  // 3. Search Analytics Aggregation — Runs every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('[Cron Job] Aggregating search analytics...');
      await executeQuery(`
        DELETE FROM SearchAnalytics
        WHERE last_searched < DATEADD(DAY, -30, GETDATE()) AND search_count < 3
      `);
      logger.info('[Cron Job] Search analytics maintenance complete.');
    } catch (err: any) {
      logger.error(`[Cron Job] Search analytics job failed: ${err.message}`);
    }
  });

  logger.info('[Scheduler] All background jobs scheduled successfully.');
}
