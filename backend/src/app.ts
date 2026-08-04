import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { connectDatabase } from './database/db';
import { initializeDatabase } from './database/initDb';
import { requestIdMiddleware } from './common/middleware/requestId.middleware';
import { assertPaymentGatewayConfigured } from './modules/payments/gateways/simulated.gateway';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import brandRoutes from './routes/brand.routes';
import orderRoutes from './routes/order.routes';
import inventoryRoutes from './routes/inventory.routes';
import customerRoutes from './routes/customer.routes';
import reviewRoutes from './routes/review.routes';
import analyticsRoutes from './routes/analytics.routes';
import userRoutes from './routes/user.routes';
import couponRoutes from './routes/coupon.routes';

import v1CustomerRouter from './core/routes/v1.router';
import { initBackgroundJobs } from './shared/jobs/jobs.scheduler';

const app = express();

/**
 * Trust exactly one reverse proxy hop so req.ip reflects the real client.
 * Without this the rate limiters key every request behind a load balancer to
 * the same address; with a blanket `true` a client could spoof X-Forwarded-For
 * and bypass them entirely.
 */
app.set('trust proxy', 1);

// Do not advertise the server technology.
app.disable('x-powered-by');

app.use(
  helmet({
    // API responses are JSON; a restrictive CSP costs nothing and blocks
    // rendering of any content that is reflected into an error page.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    // /uploads is consumed cross-origin by both frontends.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, Postman, server-to-server) which send
      // no Origin header. Browsers always send one for cross-origin requests,
      // so this does not weaken the allow-list for the threats CORS addresses.
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      logger.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
      return callback(new Error('Origin is not permitted by CORS policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
);

app.use(compression());

// Explicit body ceilings — do not rely on the framework default.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Correlation IDs on every request, not just the customer V1 tree, so an
// error response's requestId always resolves to a log line.
app.use(requestIdMiddleware);

/**
 * Uploaded files.
 *
 * `dotfiles: deny` and `index: false` prevent directory listing and hidden
 * file access, and nosniff + a download disposition stop the browser from
 * ever executing a stored file as active content.
 */
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    dotfiles: 'deny',
    index: false,
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

/**
 * Liveness probe. Deliberately minimal: the previous version returned
 * NODE_ENV, which is deployment reconnaissance for an unauthenticated caller.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
  });
});

// Admin API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/coupons', couponRoutes);

// NexoraHub Enterprise Customer V1 API Router Mount
app.use('/api/v1/customer', v1CustomerRouter);

// Unmatched routes stay on the JSON error contract.
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

const startServer = async () => {
  try {
    // Fail the deploy, not the first customer checkout, if the payment
    // gateway is misconfigured (e.g. the simulator selected in production).
    assertPaymentGatewayConfigured();

    await connectDatabase();
    await initializeDatabase();

    // Initialize Customer Backend Background Jobs Scheduler
    initBackgroundJobs();

    app.listen(env.PORT, () => {
      logger.info(`Server successfully running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });
  } catch (err: any) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

/**
 * An unhandled rejection or uncaught exception leaves the process in an
 * unknown state; continuing to serve requests from it is a security risk.
 * Log and exit so the supervisor restarts cleanly.
 */
process.on('unhandledRejection', (reason: unknown) => {
  logger.error(`Unhandled promise rejection: ${(reason as Error)?.message ?? reason}`);
});
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});

startServer();

export default app;
