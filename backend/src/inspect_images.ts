import { connectDatabase, getPool } from "./database/db";
import { logger } from "./config/logger";

async function main() {
  await connectDatabase();
  const pool = await getPool();
  
  const images = await pool.request().query(`
    SELECT * FROM ProductImages
  `);
  logger.info(`ProductImages: ${JSON.stringify(images.recordset, null, 2)}`);
  
  process.exit(0);
}

main().catch(err => {
  logger.error(err);
  process.exit(1);
});
