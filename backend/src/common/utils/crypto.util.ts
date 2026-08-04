import crypto from 'crypto';

/**
 * Generate a cryptographically secure numeric OTP.
 *
 * Uses rejection sampling rather than `random % range`, which biases the
 * low end of the range whenever 2^32 is not an exact multiple of it.
 */
export function generateOTP(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const range = max - min + 1;

  // Largest multiple of `range` that fits in 32 bits. Values at or above this
  // are discarded so every outcome is equally likely.
  const limit = Math.floor(0xffffffff / range) * range;

  let randomNumber: number;
  do {
    randomNumber = crypto.randomBytes(4).readUInt32BE(0);
  } while (randomNumber >= limit);

  return String((randomNumber % range) + min);
}

/**
 * Hash a token/OTP using SHA-256 for secure storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token string.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a referral code from a user ID.
 */
export function generateReferralCode(userId: number): string {
  const base = `NEXORA${userId.toString(36).toUpperCase().padStart(4, '0')}`;
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${base}${random}`;
}

/**
 * Constant-time string comparison for secrets and their hashes.
 *
 * crypto.timingSafeEqual throws on a length mismatch, which would itself leak
 * length information and crash the request. Both sides are hashed to a fixed
 * width first, so any pair of inputs compares in constant time.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Compare a plain token with its stored hash in constant time.
 */
export function verifyTokenHash(plain: string, hash: string): boolean {
  return constantTimeEquals(hashToken(plain), hash);
}
