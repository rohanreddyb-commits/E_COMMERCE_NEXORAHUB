import fs from "fs";
import path from "path";
import { getPool } from "./db";
import { logger } from "../config/logger";

export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info("Checking database initialization...");
    const pool = await getPool();

    // 1. Read and run schema.sql
    const schemaPath = path.join(__dirname, "../../database/schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      logger.info("Executing database schema migration...");
      
      // Split by GO (case-insensitive, on its own line with optional comments/whitespace)
      const batches = schemaSql
        .split(/\r?\n\s*GO\s*(?:\r?\n|$)/i)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      for (const batch of batches) {
        await pool.request().query(batch);
      }
      logger.info("Database schema migration completed successfully.");
    } else {
      logger.warn(`Schema file not found at ${schemaPath}`);
    }

    // 2. Read and run seed.sql
    const seedPath = path.join(__dirname, "../../database/seed.sql");
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, "utf8");
      logger.info("Executing database seed data migration...");
      
      const batches = seedSql
        .split(/\r?\n\s*GO\s*(?:\r?\n|$)/i)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      for (const batch of batches) {
        await pool.request().query(batch);
      }
      logger.info("Database seed data migration completed successfully.");
    } else {
      logger.warn(`Seed file not found at ${seedPath}`);
    }
  } catch (err: any) {
    logger.error(`Database initialization failed: ${err.message}`);
    throw err;
  }
};
