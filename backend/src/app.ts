import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import { connectDatabase } from "./database/db";
import { initializeDatabase } from "./database/initDb";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import addressRoutes from "./routes/addressRoutes";
import cartRoutes from "./routes/cartRoutes";
import couponRoutes from "./routes/couponRoutes";
import orderRoutes from "./routes/orderRoutes";
import adminRoutes from "./routes/adminRoutes";

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Compress response bodies
app.use(compression());

// Parse incoming JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve product uploads statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Centralized Request Logger
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date(),
    environment: env.NODE_ENV,
  });
});

// Mounting API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Global Error Handler
app.use(errorHandler);

// Bootstrap Server & DB Connection
const startServer = async () => {
  try {
    // Attempt database connection pool establishment on boot
    await connectDatabase();
    
    // Auto-migrate schema and seed lookups
    await initializeDatabase();

    app.listen(env.PORT, () => {
      logger.info(`Server successfully running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });
  } catch (err: any) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
