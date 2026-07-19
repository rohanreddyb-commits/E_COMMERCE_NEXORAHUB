import sql from "mssql";
import { env } from "../config/env";
import { logger } from "../config/logger";

let pool: sql.ConnectionPool | null = null;
let isConnecting = false;

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
