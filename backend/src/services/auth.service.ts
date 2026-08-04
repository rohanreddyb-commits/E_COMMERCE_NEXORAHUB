import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { CustomerAuthRepository } from '../modules/authentication/customer.auth.repository';
import { AuditService } from '../shared/audit/audit.service';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SafeUser } from '../interfaces/user.interface';
import {
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
  BCRYPT_COST,
  GENERIC_LOGIN_FAILURE,
} from '../core/constants/customer.constants';

/**
 * Role assigned to every self-service registration. Staff roles are granted
 * only through POST /api/users, which requires Super Admin.
 *
 * Resolved by NAME at runtime — IDENTITY ordering in Roles is not a contract.
 */
const SELF_SERVICE_ROLE_NAME = 'Customer';

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private authRepository: CustomerAuthRepository;
  private auditService: AuditService;

  constructor() {
    this.userRepository = new UserRepository();
    this.authRepository = new CustomerAuthRepository();
    this.auditService = new AuditService();
  }

  async login(email: string, password: string, ipAddress = '', userAgent = '') {
    const user = await this.userRepository.findByEmail(email);

    // Uniform failure response regardless of whether the account exists, is
    // locked, or the password is wrong — no enumeration oracle. Details go to
    // the log and the audit trail, never to the client.
    if (!user) {
      // Equalise timing against the bcrypt.compare on the success path so the
      // response time does not reveal whether the account exists.
      await bcrypt.compare(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
      logger.warn(`[Auth] Failed admin login for unknown email from IP ${ipAddress}`);
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    if (await this.authRepository.isAccountLocked(user.user_id)) {
      await this.authRepository.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      logger.warn(`[Auth] Login attempt on locked account user_id=${user.user_id} from IP ${ipAddress}`);
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    if (user.status !== 'Active') {
      await this.authRepository.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      logger.warn(`[Auth] Login attempt on ${user.status} account user_id=${user.user_id} from IP ${ipAddress}`);
      throw new ApiError(401, GENERIC_LOGIN_FAILURE);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.authRepository.recordLoginAttempt(user.user_id, ipAddress, userAgent, false);
      const failedCount = await this.authRepository.countRecentFailedAttempts(user.user_id, 30);

      if (failedCount >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000);
        await this.authRepository.lockAccount(user.user_id, lockedUntil);
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

    await this.authRepository.unlockAccount(user.user_id);
    await this.authRepository.recordLoginAttempt(user.user_id, ipAddress, userAgent, true);

    const roles = await this.userRepository.getUserRoles(user.user_id);
    const permissions = await this.userRepository.getUserPermissions(user.user_id);

    // Admin tokens are signed with a dedicated key and carry an explicit
    // audience + token type, so they can never be replayed as customer tokens.
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        roles: roles.map((r) => r.name),
        permissions,
        typ: 'admin',
      },
      env.JWT_ADMIN_SECRET,
      {
        expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE_ADMIN,
      }
    );

    await this.userRepository.updateLastLogin(user.user_id);

    await this.auditService.log({
      userId: user.user_id,
      action: 'admin_login',
      module: 'authentication',
      ipAddress,
    });

    return {
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: roles.map((r) => r.name),
        permissions,
      },
      token,
    };
  }

  /**
   * Self-service registration. The role is fixed to Customer and is NOT
   * derived from the request body — accepting a client-supplied role_id here
   * previously allowed anonymous callers to mint Super Admin accounts.
   */
  async register(userData: RegisterInput): Promise<SafeUser> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const customerRole = await this.userRepository.findRoleByName(SELF_SERVICE_ROLE_NAME);
    if (!customerRole) {
      logger.error(`[Auth] Role '${SELF_SERVICE_ROLE_NAME}' is missing from the Roles table.`);
      throw new ApiError(500, 'Registration is temporarily unavailable.');
    }

    const password_hash = await bcrypt.hash(userData.password, BCRYPT_COST);

    // createUser projects an explicit column list, so password_hash is not
    // present on the returned object.
    const newUser = await this.userRepository.createUser(
      {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password_hash,
        phone: userData.phone,
      },
      customerRole.role_id
    );

    await this.auditService.log({
      userId: newUser.user_id,
      action: 'user_register',
      module: 'authentication',
      recordId: newUser.user_id,
    });

    return newUser;
  }
}
