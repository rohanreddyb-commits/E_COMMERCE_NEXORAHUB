import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../../core/constants/customer.constants';

/**
 * Strict rate limiter for auth endpoints (login, register, OTP).
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

/**
 * Very strict limiter for password reset / forgot password.
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.FORGOT_PASSWORD.windowMs,
  max: RATE_LIMITS.FORGOT_PASSWORD.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General customer API rate limiter.
 */
export const customerApiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.windowMs,
  max: RATE_LIMITS.API.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please slow down.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for search endpoints.
 */
export const searchRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many search requests. Please slow down.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for checkout to prevent abuse.
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.CHECKOUT.windowMs,
  max: RATE_LIMITS.CHECKOUT.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many checkout attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
