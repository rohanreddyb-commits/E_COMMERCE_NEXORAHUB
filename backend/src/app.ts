import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { connectDatabase } from './database/db';
import { initializeDatabase } from './database/initDb';

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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', (req, res, next) => {
  const fullUrl = `${req.protocol}://${req.get('host')}/uploads${req.url}`;
  console.log(`[Static File Request] URL: ${fullUrl}, File path requested: ${path.join(process.cwd(), 'uploads', req.url)}`);
  next();
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    environment: env.NODE_ENV,
  });
});

// Admin API Routes (Untouched for backward compatibility)
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

// Global Error Handler
app.use(errorHandler);

const startServer = async () => {
  try {
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

startServer();

export default app;
