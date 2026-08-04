import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

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

/**
 * Placeholder secrets that ship in .env.example or are common copy-paste
 * defaults. Booting with any of these means the signing key is public
 * knowledge, so refuse to start rather than serve forgeable tokens.
 */
const FORBIDDEN_SECRETS = new Set([
  "super_secret_jwt_key_change_me_in_production",
  "change_me_in_production",
  "your_jwt_secret",
  "changeme",
  "secret",
  "jwt_secret",
  "test",
]);

const MIN_SECRET_BYTES = 32;

/**
 * Validate a signing key: non-placeholder and enough entropy to resist
 * offline brute force. Applied to every JWT secret at boot.
 */
const validateSecret = (name: string, value: string): string => {
  if (FORBIDDEN_SECRETS.has(value.trim().toLowerCase())) {
    throw new Error(
      `Configuration Error: ${name} is set to a known placeholder value. ` +
        `Generate a real secret with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
  }
  if (Buffer.byteLength(value, "utf8") < MIN_SECRET_BYTES) {
    throw new Error(
      `Configuration Error: ${name} must be at least ${MIN_SECRET_BYTES} bytes. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
  }
  return value;
};

const JWT_SECRET = validateSecret("JWT_SECRET", process.env.JWT_SECRET as string);

/**
 * Admin and customer tokens are signed with separate keys so a token minted
 * for one trust realm can never be replayed against the other. If
 * JWT_ADMIN_SECRET is unset in development we derive a distinct key from
 * JWT_SECRET; production must supply its own.
 */
let adminSecret = process.env.JWT_ADMIN_SECRET;
if (!adminSecret) {
  if (IS_PRODUCTION) {
    throw new Error(
      "Configuration Error: JWT_ADMIN_SECRET is required in production so that " +
        "admin and customer tokens are signed with independent keys."
    );
  }
  // Development convenience only — deterministic, but distinct from JWT_SECRET.
  adminSecret = require("crypto")
    .createHmac("sha256", JWT_SECRET)
    .update("nexora:admin-realm")
    .digest("base64url");
}
const JWT_ADMIN_SECRET = validateSecret("JWT_ADMIN_SECRET", adminSecret as string);

// CORS_ORIGIN accepts a single origin or a comma-separated list, so the admin
// and customer frontends can run side by side on different ports.
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const corsOrigins = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Rate limits are a security control, so cap the configurable maximum. A
 * misconfigured .env must not be able to disable brute-force protection.
 */
const RATE_LIMIT_CEILING = 1000;
const configuredRateLimit = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const RATE_LIMIT_MAX = Math.min(
  Number.isFinite(configuredRateLimit) && configuredRateLimit > 0 ? configuredRateLimit : 100,
  RATE_LIMIT_CEILING
);

const trustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE === "true";
if (IS_PRODUCTION && trustServerCertificate) {
  throw new Error(
    "Configuration Error: DB_TRUST_SERVER_CERTIFICATE must be false in production. " +
      "Disabling certificate validation exposes the database connection to interception."
  );
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV,
  IS_PRODUCTION,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  CORS_ORIGIN: corsOrigin,
  CORS_ORIGINS: corsOrigins,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  JWT_SECRET,
  JWT_ADMIN_SECRET,
  // Access tokens are short-lived; long-lived sessions are carried by the
  // rotating refresh token, not by the bearer token.
  JWT_EXPIRY: process.env.JWT_EXPIRY || "15m",
  JWT_ISSUER: process.env.JWT_ISSUER || "nexora-api",
  JWT_AUDIENCE_CUSTOMER: "nexora:customer",
  JWT_AUDIENCE_ADMIN: "nexora:admin",
  PAYMENT_GATEWAY: process.env.PAYMENT_GATEWAY || "simulated",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  db: {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    server: process.env.DB_SERVER as string,
    database: process.env.DB_DATABASE as string,
    port: parseInt(process.env.DB_PORT || "1433", 10),
    options: {
      encrypt: true, // Use encryption for security
      trustServerCertificate,
    },
  },
};
