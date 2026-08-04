import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../../repositories/user.repository';
import { CustomerAuthRepository } from './customer.auth.repository';
import { EmailService } from '../../shared/email/email.service';
import { AuditService } from '../../shared/audit/audit.service';
import { LoyaltyRepository } from '../loyalty/loyalty.repository';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  AuthTokens,
  CustomerAuthPayload,
} from './dto/auth.dto';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  generateOTP,
  hashToken,
  generateSecureToken,
  constantTimeEquals,
} from '../../common/utils/crypto.util';
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS,
  OTP_EXPIRY_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
  BCRYPT_COST,
  GENERIC_LOGIN_FAILURE,
  MAX_OTP_ATTEMPTS,
} from '../../core/constants/customer.constants';

/**
 * A syntactically valid bcrypt hash that matches nothing. Compared against
 * when the email is unknown so the "no such user" path costs roughly the same
 * as a real verification and cannot be distinguished by response time.
 */
const DUMMY_BCRYPT_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6.HFHhBnEjKGZ4nBcXfvTPMwvVLLnLa';

const CUSTOMER_ROLE_NAME = 'Customer';

/**
 * Convert a jsonwebtoken expiry string ("15m", "24h", "7d", "900") to seconds
 * so the client is told the token's real lifetime.
 */
export const parseExpiryToSeconds = (expiry: string): number => {
  const match = /^(\d+)\s*([smhd])?$/.exec(String(expiry).trim());
  if (!match) return 15 * 60;
  const value = parseInt(match[1], 10);
  const unit = match[2] ?? 's';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return value * multiplier;
};

export class CustomerAuthService {
  private readonly userRepo: UserRepository;
  private readonly authRepo: CustomerAuthRepository;
  private readonly emailService: EmailService;
  private readonly auditService: AuditService;
  private readonly loyaltyRepo: LoyaltyRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.authRepo = new CustomerAuthRepository();
    this.emailService = new EmailService();
    this.auditService = new AuditService();
    this.loyaltyRepo = new LoyaltyRepository();
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string; email: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    // Resolved by name — Roles.role_id is an IDENTITY column, so its numeric
    // value is not a contract that application code should hardcode.
    const customerRole = await this.userRepo.findRoleByName(CUSTOMER_ROLE_NAME);
    if (!customerRole) {
      logger.error(`[Auth] Role '${CUSTOMER_ROLE_NAME}' is missing from the Roles table.`);
      throw new ApiError(500, 'Registration is temporarily unavailable.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const newUser = await this.userRepo.createUser(
      {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        password_hash: passwordHash,
        phone: dto.phone,
        status: 'Active',
      },
      customerRole.role_id
    );

    // Initialize loyalty account
    await this.loyaltyRepo.initializeCustomer(newUser.user_id);

    // Send email verification OTP
    const otp = generateOTP(6);
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.authRepo.upsertEmailVerification(newUser.user_id, otpHash, expiresAt);

    // Send OTP email (non-blocking)
    this.emailService.sendEmailVerification(dto.email, dto.first_name, otp).catch((err) => {
      logger.warn(`[Auth] Failed to send verification email: ${err.message}`);
    });

    // Apply a referral code if one was supplied. processReferralCode rejects
    // self-referral and unknown codes; it was previously never invoked, so the
    // referral programme silently did nothing.
    if (dto.referralCode) {
      try {
        const { CustomerReferralService } = await import('../referrals/customer.referral.service');
        await new CustomerReferralService().processReferralCode(
          newUser.user_id,
          dto.referralCode
        );
      } catch (err: any) {
        // A bad referral code must not fail an otherwise valid registration.
        logger.warn(`[Auth] Referral code processing failed: ${err.message}`);
      }
    }

    await this.auditService.log({
      userId: newUser.user_id,
      action: 'customer_register',
      module: 'authentication',
      recordId: newUser.user_id,
    });

    return {
      message: 'Registration successful. Please verify your email.',
      email: dto.email,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(dto.email);

    // Every failure below returns the same message and status. Previously the
    // response distinguished "unknown email" (generic) from "wrong password"
    // (which disclosed the remaining-attempt count) and from locked/inactive
    // states, giving an account-existence oracle and letting an attacker pace
    // a password spray to stay just under the lockout threshold.
    if (!user) {
      // Spend comparable time to a real bcrypt compare so response timing does
      // not become the next oracle.
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      logger.warn(`[Auth] Login attempt for unknown email from IP ${ipAddress}`);
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    const isLocked = await this.authRepo.isAccountLocked(user.user_id);
    if (isLocked) {
      await this.authRepo.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      logger.warn(`[Auth] Login attempt on locked account user_id=${user.user_id} from IP ${ipAddress}`);
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    if (user.status !== 'Active') {
      await this.authRepo.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      logger.warn(
        `[Auth] Login attempt on ${user.status} account user_id=${user.user_id} from IP ${ipAddress}`
      );
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      await this.authRepo.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      const failedCount = await this.authRepo.countRecentFailedAttempts(user.user_id, 30);

      if (failedCount >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000);
        await this.authRepo.lockAccount(user.user_id, lockedUntil);
        await this.auditService.log({
          userId: user.user_id,
          action: 'account_locked',
          module: 'authentication',
          ipAddress,
          newValues: { reason: 'max_failed_login_attempts', failedCount },
        });
        logger.warn(`[Auth] Account locked user_id=${user.user_id} after ${failedCount} failures`);
      }

      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    // Unverified accounts may exist on an address the owner does not control,
    // so they must not be able to transact.
    if (!(user as any).is_email_verified) {
      await this.authRepo.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      throw new ApiError(
        403,
        'Please verify your email address before signing in. Check your inbox for the verification code.'
      );
    }

    // Success — unlock account if needed
    await this.authRepo.unlockAccount(user.user_id);
    await this.authRepo.recordLoginAttempt(user.user_id, ipAddress, userAgent, true);
    await this.userRepo.updateLastLogin(user.user_id);

    const roles = await this.userRepo.getUserRoles(user.user_id);
    const permissions = await this.userRepo.getUserPermissions(user.user_id);
    const loyaltyInfo = await this.loyaltyRepo.getCustomerLoyalty(user.user_id);

    const sessionId = uuidv4();
    const tokens = await this.generateTokenPair(user, roles, permissions, sessionId);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.authRepo.createSession(
      user.user_id,
      sessionId,
      tokens.refreshToken,
      {
        deviceName: dto.deviceInfo?.deviceName,
        deviceType: dto.deviceInfo?.deviceType,
        ipAddress,
        userAgent,
      },
      expiresAt
    );

    await this.auditService.log({
      userId: user.user_id,
      action: 'customer_login',
      module: 'authentication',
      ipAddress,
    });

    return {
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || null,
        avatar: (user as any).avatar_url || null,
        isEmailVerified: !!(user as any).is_email_verified,
        roles: roles.map((r) => r.name),
        loyaltyTier: loyaltyInfo?.tier || 'Bronze',
        rewardPoints: loyaltyInfo?.points_balance || 0,
      },
      tokens,
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const session = await this.authRepo.findSessionByToken(refreshToken);
    if (!session) {
      throw new ApiError(401, 'Invalid or expired refresh token.');
    }

    const user = await this.userRepo.findById(session.user_id);
    if (!user || user.status !== 'Active') {
      await this.authRepo.revokeSession(session.session_id);
      throw new ApiError(401, 'Session invalidated.');
    }

    const roles = await this.userRepo.getUserRoles(user.user_id);
    const permissions = await this.userRepo.getUserPermissions(user.user_id);

    const newTokens = await this.generateTokenPair(user, roles, permissions, session.session_id);

    // Rotate refresh token
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.authRepo.rotateSession(session.session_id, newTokens.refreshToken, newExpiresAt);

    return newTokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<void> {
    await this.authRepo.revokeSession(sessionId);
  }

  async logoutAll(userId: number): Promise<void> {
    await this.authRepo.revokeAllUserSessions(userId);
    await this.auditService.log({
      userId,
      action: 'customer_logout_all',
      module: 'authentication',
    });
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(email);
    // Always return same message to prevent user enumeration
    const safeMessage = 'If an account with this email exists, you will receive a password reset OTP.';

    if (!user) return { message: safeMessage };

    const otp = generateOTP(6);
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.authRepo.upsertPasswordReset(user.user_id, otpHash, expiresAt);

    this.emailService.sendPasswordResetOtp(email, user.first_name, otp).catch((err) => {
      logger.warn(`[Auth] Failed to send password reset email: ${err.message}`);
    });

    return { message: safeMessage };
  }

  // ─── Verify OTP ───────────────────────────────────────────────────────────

  /**
   * Verify a 6-digit OTP.
   *
   * IP rate limiting alone leaves only a million-guess keyspace open to a
   * distributed attacker, so each OTP record also carries its own attempt
   * counter and is destroyed after MAX_OTP_ATTEMPTS wrong guesses. Comparison
   * is constant-time to avoid leaking a prefix match.
   */
  async verifyOtp(
    email: string,
    otp: string,
    type: 'password_reset' | 'email_verify'
  ): Promise<{ token?: string; message: string }> {
    const user = await this.userRepo.findByEmail(email);
    // Uniform message — do not reveal whether the address is registered.
    const invalid = () => new ApiError(400, 'Invalid or expired OTP.');
    if (!user) throw invalid();

    const otpHash = hashToken(otp);

    if (type === 'password_reset') {
      const record = await this.authRepo.findPasswordReset(user.user_id);
      if (!record) throw invalid();

      if (!constantTimeEquals(record.otp_hash, otpHash)) {
        const attempts = await this.authRepo.incrementPasswordResetAttempts(user.user_id);
        if (attempts >= MAX_OTP_ATTEMPTS) {
          await this.authRepo.markPasswordResetUsed(user.user_id);
          logger.warn(
            `[Auth] Password-reset OTP invalidated for user_id=${user.user_id} after ${attempts} failed attempts`
          );
        }
        throw invalid();
      }

      const resetToken = generateSecureToken(32);
      const tokenHash = hashToken(resetToken);
      await this.authRepo.markPasswordResetOtpVerified(user.user_id, tokenHash);

      return {
        token: resetToken,
        message: 'OTP verified. Use the token to reset your password.',
      };
    }

    const record = await this.authRepo.findEmailVerification(user.user_id);
    if (!record) throw invalid();

    if (!constantTimeEquals(record.otp_hash, otpHash)) {
      const attempts = await this.authRepo.incrementEmailVerificationAttempts(user.user_id);
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await this.authRepo.expireEmailVerification(user.user_id);
        logger.warn(
          `[Auth] Email-verification OTP invalidated for user_id=${user.user_id} after ${attempts} failed attempts`
        );
      }
      throw invalid();
    }

    await this.authRepo.markEmailVerified(user.user_id);
    return { message: 'Email verified successfully.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new ApiError(400, 'Invalid request.');

    const tokenHash = hashToken(token);
    const record = await this.authRepo.findByResetToken(tokenHash);
    if (!record || record.user_id !== user.user_id) {
      throw new ApiError(400, 'Invalid or expired reset token.');
    }

    const recentHashes = await this.authRepo.getRecentPasswordHashes(user.user_id, 3);
    for (const hash of recentHashes) {
      const isSame = await bcrypt.compare(newPassword, hash);
      if (isSame) {
        throw new ApiError(400, 'New password cannot be the same as a recently used password.');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password, store in history, mark reset as used, revoke all sessions
    const { executeQuery: eq } = await import('../../database/db');
    const sqlModule = await import('mssql');
    await eq(`UPDATE Users SET password_hash = @hash WHERE user_id = @uid`, {
      hash: { type: sqlModule.default.VarChar(255), value: newHash },
      uid: { type: sqlModule.default.Int, value: user.user_id },
    });

    await this.authRepo.addPasswordHistory(user.user_id, newHash);
    await this.authRepo.markPasswordResetUsed(user.user_id);
    await this.authRepo.revokeAllUserSessions(user.user_id);

    await this.auditService.log({
      userId: user.user_id,
      action: 'customer_reset_password',
      module: 'authentication',
    });
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new ApiError(404, 'User not found.');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new ApiError(400, 'Current password is incorrect.');

    const isSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isSame) throw new ApiError(400, 'New password must be different from current password.');

    const newHash = await bcrypt.hash(newPassword, 12);

    const { executeQuery: eq } = await import('../../database/db');
    const sqlModule = await import('mssql');
    await eq(`UPDATE Users SET password_hash = @hash WHERE user_id = @uid`, {
      hash: { type: sqlModule.default.VarChar(255), value: newHash },
      uid: { type: sqlModule.default.Int, value: userId },
    });

    await this.authRepo.addPasswordHistory(userId, newHash);
    await this.auditService.log({
      userId,
      action: 'customer_change_password',
      module: 'authentication',
    });
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async getActiveSessions(userId: number) {
    const sessions = await this.authRepo.getUserActiveSessions(userId);
    return sessions.map((s) => ({
      sessionId: s.session_id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      ipAddress: s.ip_address,
      lastUsed: s.last_used_at,
      createdAt: s.created_at,
    }));
  }

  async revokeSession(sessionId: string, userId: number): Promise<void> {
    const session = await this.authRepo.findSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      throw new ApiError(404, 'Session not found.');
    }
    await this.authRepo.revokeSession(sessionId);
  }

  // ─── Token Generation ─────────────────────────────────────────────────────

  private async generateTokenPair(
    user: any,
    roles: any[],
    permissions: string[],
    sessionId: string
  ): Promise<AuthTokens> {
    const payload: CustomerAuthPayload = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: roles.map((r) => r.name),
      permissions,
      sessionId,
    };

    // typ + audience + issuer pin this token to the customer realm. It is
    // signed with JWT_SECRET; admin tokens use the separate JWT_ADMIN_SECRET,
    // so neither realm's tokens are interchangeable.
    const accessToken = jwt.sign({ ...payload, typ: 'customer' }, env.JWT_SECRET, {
      expiresIn: (env.JWT_EXPIRY || ACCESS_TOKEN_EXPIRY) as jwt.SignOptions['expiresIn'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE_CUSTOMER,
    });

    const refreshToken = generateSecureToken(48);

    return {
      accessToken,
      refreshToken,
      // Report the real configured lifetime rather than a hardcoded 15 min, so
      // the client's refresh scheduling matches the token it actually holds.
      expiresIn: parseExpiryToSeconds(env.JWT_EXPIRY || ACCESS_TOKEN_EXPIRY),
    };
  }
}
