import rateLimit, { Options } from 'express-rate-limit';
import { Request } from 'express';
import { RATE_LIMITS } from '../../core/constants/customer.constants';
import { logger } from '../../config/logger';

/**
 * Key on the framework-resolved client IP.
 *
 * `req.ip` already honours the `trust proxy` setting configured in app.ts (a
 * single hop), so a client cannot widen its own bucket by injecting extra
 * X-Forwarded-For entries.
 *
 * IPv6 addresses are collapsed to their /64 prefix: a single v6 allocation
 * routinely grants 2^64 addresses, so keying on the full address would let an
 * attacker rotate for free and never trip a limit.
 */
const normalizeIp = (ip: string): string => {
  if (!ip.includes(':')) return ip; // IPv4

  // Strip an IPv4-mapped prefix (::ffff:1.2.3.4) before deciding.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];

  // Expand :: so the first four hextets can be taken reliably.
  const [head, tail = ''] = ip.split('::');
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = tail ? tail.split(':').filter(Boolean) : [];
  const missing = 8 - headParts.length - tailParts.length;
  const full = ip.includes('::')
    ? [...headParts, ...Array(Math.max(missing, 0)).fill('0'), ...tailParts]
    : ip.split(':');

  return `${full.slice(0, 4).join(':')}::/64`;
};

const keyByIp = (req: Request): string => normalizeIp(req.ip ?? 'unknown');

const buildMessage = (message: string) => ({
  success: false,
  statusCode: 429,
  message,
});

/** Shared behaviour: log every trip so bursts are visible in security.log. */
const onLimitReached = (label: string): Partial<Options> => ({
  handler: (req, res, _next, options) => {
    logger.warn(
      `[RateLimit] ${label} limit reached for IP ${req.ip} on ${req.method} ${req.originalUrl}`
    );
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict limiter for auth endpoints (login, register, OTP).
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: buildMessage('Too many authentication attempts. Please try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
  // Do not let a successful sign-in refill the bucket for failed attempts.
  skipSuccessfulRequests: false,
  ...onLimitReached('auth'),
});

/**
 * Very strict limiter for password reset / forgot password.
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.FORGOT_PASSWORD.windowMs,
  max: RATE_LIMITS.FORGOT_PASSWORD.max,
  message: buildMessage('Too many password reset attempts. Please try again in 1 hour.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
  ...onLimitReached('forgot-password'),
});

/**
 * OTP verification. Tighter than the general auth limiter because the
 * keyspace is only six digits; paired with the per-record attempt counter in
 * CustomerAuthService.verifyOtp, which invalidates the OTP after
 * MAX_OTP_ATTEMPTS wrong guesses regardless of source IP.
 */
export const otpVerifyRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.OTP_VERIFY.windowMs,
  max: RATE_LIMITS.OTP_VERIFY.max,
  message: buildMessage('Too many verification attempts. Please request a new code.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
  ...onLimitReached('otp-verify'),
});

/**
 * General customer API rate limiter.
 */
export const customerApiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.windowMs,
  max: RATE_LIMITS.API.max,
  message: buildMessage('Too many requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
});

/**
 * Rate limiter for search endpoints.
 */
export const searchRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  message: buildMessage('Too many search requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
});

/**
 * Rate limiter for checkout to prevent abuse.
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.CHECKOUT.windowMs,
  max: RATE_LIMITS.CHECKOUT.max,
  message: buildMessage('Too many checkout attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
  ...onLimitReached('checkout'),
});

/**
 * Limiter for authenticated write endpoints that create durable content
 * (reviews, support tickets, returns) — bounds spam and storage abuse.
 */
export const contentWriteRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.CONTENT_WRITE.windowMs,
  max: RATE_LIMITS.CONTENT_WRITE.max,
  message: buildMessage('You are submitting too quickly. Please wait a moment.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
});

/**
 * Limiter for file uploads — each request can write up to 5 MB to disk.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.UPLOAD.windowMs,
  max: RATE_LIMITS.UPLOAD.max,
  message: buildMessage('Too many uploads. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIp,
  ...onLimitReached('upload'),
});
