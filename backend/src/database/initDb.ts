import fs from "fs";
import path from "path";
import { getPool } from "./db";
import { logger } from "../config/logger";
import { env } from "../config/env";

/**
 * Migration files applied on boot, in order.
 *
 * schema.sql is the single, consolidated master schema — every table (admin
 * catalogue/orders, customer account features, product variants) and every
 * security-hardening constraint/index, all in one idempotent pass. seed.sql
 * seeds roles and a safe demo catalog afterward.
 *
 * Both files are written so that running them against an empty database, a
 * partially-migrated database from an older version of this project, or an
 * already-fully-migrated database all converge to the same end state with
 * zero errors and zero data loss — that is what makes it safe to run
 * unattended on every boot, on any machine.
 *
 * database/sample_data.sql is intentionally NOT listed here: it seeds fake
 * customers/orders for demo screenshots and is meant to be run by hand.
 */
const MIGRATIONS: { file: string; description: string }[] = [
  { file: "schema.sql", description: "database schema" },
  { file: "seed.sql", description: "seed data" },
];

/** MSSQL batches are separated by a lone GO; split so each runs on its own. */
const splitBatches = (sql: string): string[] =>
  sql
    .split(/\r?\n\s*GO\s*(?:\r?\n|$)/i)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Schema changes must be a deliberate, reviewable step in production, not
    // a side effect of a process restart. Opt in for a single deploy with
    // RUN_MIGRATIONS=true, then unset it.
    if (env.IS_PRODUCTION && process.env.RUN_MIGRATIONS !== "true") {
      logger.info(
        "Skipping automatic migrations in production. Set RUN_MIGRATIONS=true for one deploy to apply them."
      );
      return;
    }

    logger.info("Checking database initialization...");
    const pool = await getPool();

    for (const { file, description } of MIGRATIONS) {
      const filePath = path.join(__dirname, "../../database", file);

      if (!fs.existsSync(filePath)) {
        logger.warn(`Migration file not found at ${filePath} — skipping.`);
        continue;
      }

      logger.info(`Executing ${description} migration (${file})...`);
      for (const batch of splitBatches(fs.readFileSync(filePath, "utf8"))) {
        await pool.request().query(batch);
      }
      logger.info(`Migration ${file} completed successfully.`);
    }
  } catch (err: any) {
    logger.error(`Database initialization failed: ${err.message}`);
    throw err;
  }
};
