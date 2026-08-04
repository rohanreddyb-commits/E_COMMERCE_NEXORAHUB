import winston from "winston";
import path from "path";
import fs from "fs";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const isProduction = process.env.NODE_ENV === "production";

/**
 * Redact credentials and tokens before anything is written.
 *
 * Logs outlive requests and are commonly shipped to third-party aggregators,
 * so a secret that reaches a log has effectively been disclosed. Applied to
 * every transport.
 */
const SENSITIVE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Bearer tokens and raw JWTs
  { pattern: /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, replacement: "Bearer [REDACTED]" },
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacement: "[REDACTED_JWT]",
  },
  // key="value" / key: value forms for credential-ish names
  {
    pattern:
      /("?(?:password|passwd|pwd|secret|token|refreshToken|accessToken|authorization|apiKey|api_key|otp|password_hash|signature)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    replacement: '$1"[REDACTED]"',
  },
  // bcrypt hashes appearing anywhere in a message
  { pattern: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, replacement: "[REDACTED_HASH]" },
];

const redact = (value: string): string =>
  SENSITIVE_PATTERNS.reduce(
    (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
    value
  );

const redactFormat = winston.format((info) => {
  if (typeof info.message === "string") {
    info.message = redact(info.message);
  }
  if (typeof (info as any).stack === "string") {
    (info as any).stack = redact((info as any).stack);
  }
  return info;
});

const consoleFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

// Structured, uncoloured output for log shippers and SIEM ingestion.
const fileFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp(),
  winston.format.json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction ? fileFormat : consoleFormat,
  }),
];

/**
 * Durable transports. Console-only logging leaves no forensic record after a
 * restart, so security events could not be reconstructed following an
 * incident. LOG_DIR may point at a mounted volume; a failure to open these
 * files must not stop the application.
 */
const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");
try {
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
    // Dedicated stream for authn/authz events so it can be routed to a SIEM
    // and alerted on independently of application noise.
    new winston.transports.File({
      filename: path.join(logDir, "security.log"),
      level: "warn",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 20,
      tailable: true,
    })
  );
} catch {
  // Read-only filesystem or missing permissions — keep console logging.
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});
