import sql from "mssql";
import { env } from "../config/env";
import { logger } from "../config/logger";

let pool: sql.ConnectionPool | null = null;
let isConnecting = false;

/** Matches a plain SQL Server identifier — letters, digits, underscore. */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Ensure the target database exists before the application pool ever tries
 * to connect to it.
 *
 * mssql's ConnectionPool config pins `database: env.db.database` up front,
 * so on a brand-new SQL Server instance — the exact case this project needs
 * to support ("works on another computer") — that connection fails outright
 * before a single query can run, including the `CREATE DATABASE` statement
 * inside schema.sql. The fix is to connect to the server-level `master`
 * database first, create the target database there if it is missing, then
 * let the normal pool connect to it.
 *
 * env.db.database comes from server-side configuration (.env), not user
 * input, but CREATE DATABASE cannot be parameterised, so the name is still
 * validated against a safe-identifier pattern before being interpolated.
 */
const ensureDatabaseExists = async (): Promise<void> => {
  const dbName = env.db.database;
  if (!SAFE_IDENTIFIER.test(dbName)) {
    throw new Error(
      `Configuration Error: DB_DATABASE ("${dbName}") is not a valid SQL Server identifier.`
    );
  }

  const masterConfig: sql.config = {
    user: env.db.user,
    password: env.db.password,
    server: env.db.server,
    database: "master",
    port: env.db.port,
    options: {
      encrypt: env.db.options.encrypt,
      trustServerCertificate: env.db.options.trustServerCertificate,
      enableArithAbort: true,
    },
    connectionTimeout: 10000,
  };

  const masterPool = new sql.ConnectionPool(masterConfig);
  try {
    await masterPool.connect();
    const exists = await masterPool
      .request()
      .input("dbName", sql.NVarChar, dbName)
      .query("SELECT 1 AS found FROM sys.databases WHERE name = @dbName");

    if (exists.recordset.length === 0) {
      logger.info(`Database "${dbName}" does not exist — creating it.`);
      await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
      logger.info(`Database "${dbName}" created.`);
    }
  } catch (err: any) {
    // Azure SQL Database or constrained database users may restrict connecting to master.
    // Log a warning and proceed directly to connecting to the target database.
    logger.warn(`Could not verify database presence via master pool (${err.message}) — proceeding to target database connection.`);
  } finally {
    try {
      await masterPool.close();
    } catch {
      // Ignore pool close errors on master
    }
  }
};

export const connectDatabase = async (retries = 5, delay = 5000): Promise<sql.ConnectionPool> => {
  if (pool && pool.connected) {
    return pool;
  }

  if (isConnecting) {
    // Wait for the existing connection attempt to complete
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (pool && pool.connected) return pool;
  }

  isConnecting = true;
  const config: sql.config = {
    user: env.db.user,
    password: env.db.password,
    server: env.db.server,
    database: env.db.database,
    port: env.db.port,
    options: {
      encrypt: env.db.options.encrypt,
      trustServerCertificate: env.db.options.trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: 15,
      min: 2,
      idleTimeoutMillis: 30000,
    },
  };

  for (let i = 0; i < retries; i++) {
    try {
      logger.info(`Attempting to connect to MSSQL Server (Attempt ${i + 1}/${retries})...`);

      // Runs on every attempt (cheap no-op once the database exists) so a
      // database dropped or missing mid-run is also recovered from.
      await ensureDatabaseExists();

      pool = await new sql.ConnectionPool(config).connect();
      logger.info("Successfully connected to MSSQL Server connection pool.");
      isConnecting = false;
      return pool;
    } catch (err: any) {
      logger.error(`Failed to connect to MSSQL: ${err.message}`);
      if (i < retries - 1) {
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  isConnecting = false;
  throw new Error("Could not connect to MSSQL Server database after max retries.");
};

export const getPool = async (): Promise<sql.ConnectionPool> => {
  if (!pool || !pool.connected) {
    return connectDatabase();
  }
  return pool;
};

/**
 * Execute a query with parameters safely to prevent SQL injection.
 */
export const executeQuery = async (
  query: string,
  params: Record<string, { type: any; value: any }> = {}
): Promise<sql.IResult<any>> => {
  const connectionPool = await getPool();
  const request = connectionPool.request();

  for (const [key, param] of Object.entries(params)) {
    request.input(key, param.type, param.value);
  }

  return request.query(query);
};

/**
 * Execute business operations inside a transaction block.
 * Automatically handles transaction commit and rollbacks.
 */
export const runInTransaction = async <T>(
  actions: (transaction: sql.Transaction) => Promise<T>
): Promise<T> => {
  const connectionPool = await getPool();
  const transaction = new sql.Transaction(connectionPool);

  try {
    await transaction.begin();
    const result = await actions(transaction);
    await transaction.commit();
    return result;
  } catch (err) {
    logger.error("Transaction failed, rolling back alterations...");
    try {
      await transaction.rollback();
    } catch (rollbackErr: any) {
      logger.error(`Rollback error: ${rollbackErr.message}`);
    }
    throw err;
  }
};
