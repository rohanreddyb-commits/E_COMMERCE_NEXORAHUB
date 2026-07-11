import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const requiredEnvVars = [
  "JWT_SECRET",
  "DB_USER",
  "DB_PASSWORD",
  "DB_SERVER",
  "DB_DATABASE",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Configuration Error: Missing required environment variables: ${missingEnvVars.join(
      ", "
    )}`
  );
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRY: process.env.JWT_EXPIRY || "1h",
  db: {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    server: process.env.DB_SERVER as string,
    database: process.env.DB_DATABASE as string,
    port: parseInt(process.env.DB_PORT || "1433", 10),
    options: {
      encrypt: true, // Use encryption for security
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    },
  },
};
