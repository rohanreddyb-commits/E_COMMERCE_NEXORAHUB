import crypto from 'crypto';

/**
 * Generate a cryptographically secure numeric OTP.
 */
export function generateOTP(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const otp = (randomNumber % (max - min + 1)) + min;
  return String(otp);
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
 * Compare a plain token with its hash.
 */
export function verifyTokenHash(plain: string, hash: string): boolean {
  const computed = hashToken(plain);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}
