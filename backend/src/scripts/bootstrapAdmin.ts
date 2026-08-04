/**
 * One-time first-administrator provisioning.
 *
 *   BOOTSTRAP_ADMIN_EMAIL=you@example.com \
 *   BOOTSTRAP_ADMIN_PASSWORD='<strong password>' \
 *   npm run bootstrap:admin
 *
 * Deliberately NOT wired into application startup: an admin account created
 * automatically on every boot is a permanent default credential (the previous
 * seed.sql behaviour). This runs by operator action, once, and refuses to
 * overwrite an existing account.
 */
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { connectDatabase, executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import { BCRYPT_COST } from '../core/constants/customer.constants';

const SUPER_ADMIN_ROLE = 'Super Admin';
const MIN_PASSWORD_LENGTH = 12;

const fail = (message: string): never => {
  logger.error(`[bootstrap:admin] ${message}`);
  process.exit(1);
};

async function main(): Promise<void> {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('BOOTSTRAP_ADMIN_EMAIL is missing or is not a valid email address.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    fail('BOOTSTRAP_ADMIN_PASSWORD must contain lowercase, uppercase and numeric characters.');
  }

  await connectDatabase();

  const existing = await executeQuery(`SELECT user_id FROM Users WHERE email = @email`, {
    email: { type: sql.NVarChar(255), value: email },
  });
  if (existing.recordset.length > 0) {
    logger.info(`[bootstrap:admin] ${email} already exists — nothing to do.`);
    process.exit(0);
  }

  const roleResult = await executeQuery(`SELECT role_id FROM Roles WHERE name = @name`, {
    name: { type: sql.VarChar(50), value: SUPER_ADMIN_ROLE },
  });
  const role = roleResult.recordset[0];
  if (!role) {
    fail(`Role '${SUPER_ADMIN_ROLE}' not found. Run the schema migrations first.`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const userId = await runInTransaction(async (transaction) => {
    const inserted = await transaction
      .request()
      .input('first_name', sql.NVarChar(100), 'Platform')
      .input('last_name', sql.NVarChar(100), 'Administrator')
      .input('email', sql.NVarChar(255), email)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .query(`INSERT INTO Users (first_name, last_name, email, password_hash, status, is_email_verified, created_at, updated_at)
              OUTPUT inserted.user_id
              VALUES (@first_name, @last_name, @email, @password_hash, 'Active', 1, GETDATE(), GETDATE())`);

    const newId: number = inserted.recordset[0].user_id;

    await transaction
      .request()
      .input('user_id', sql.Int, newId)
      .input('role_id', sql.Int, role.role_id)
      .query(`INSERT INTO UserRoles (user_id, role_id) VALUES (@user_id, @role_id)`);

    await transaction
      .request()
      .input('user_id', sql.Int, newId)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .query(`INSERT INTO PasswordHistory (user_id, password_hash, created_at)
              VALUES (@user_id, @password_hash, GETDATE())`);

    return newId;
  });

  await executeQuery(
    `INSERT INTO AuditLogs (user_id, action, module, record_id, new_values, created_at)
     VALUES (@user_id, 'bootstrap_admin_created', 'authentication', @user_id, @new_values, GETDATE())`,
    {
      user_id: { type: sql.Int, value: userId },
      new_values: {
        type: sql.NVarChar(sql.MAX),
        value: JSON.stringify({ email, role: SUPER_ADMIN_ROLE, env: env.NODE_ENV }),
      },
    }
  );

  // The password is never echoed — the operator already has it.
  logger.info(`[bootstrap:admin] Created Super Admin ${email} (user_id=${userId}).`);
  logger.info('[bootstrap:admin] Clear BOOTSTRAP_ADMIN_PASSWORD from your environment now.');
  process.exit(0);
}

main().catch((err: unknown) => {
  logger.error(`[bootstrap:admin] Failed: ${(err as Error).message}`);
  process.exit(1);
});
