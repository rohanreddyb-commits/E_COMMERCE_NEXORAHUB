import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../shared/audit/audit.service';
import { BCRYPT_COST } from '../core/constants/customer.constants';
import { logger } from '../config/logger';

export class UserController {
  private userRepository: UserRepository;
  private auditService: AuditService;

  constructor() {
    this.userRepository = new UserRepository();
    this.auditService = new AuditService();
  }

  getAllUsers = async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const search = req.query.search as string;

    const users = await this.userRepository.getAllUsers(page, limit, search);
    res.status(200).json(new ApiResponse(200, users, 'Users retrieved successfully'));
  };

  /**
   * Role mutation is a privilege boundary:
   *  - the route is restricted to Super Admin (see routes/user.routes.ts),
   *  - the target role must exist in the Roles table,
   *  - operators cannot change their own role (no self-escalation, and no
   *    accidental self-lockout),
   *  - every change is written to AuditLogs with the before/after value.
   */
  updateUserRole = async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const roleId = Number(req.body.roleId);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new ApiError(400, 'A valid user ID is required');
    }
    if (!Number.isInteger(roleId) || roleId < 1) {
      throw new ApiError(400, 'A valid role ID is required');
    }
    if (userId === req.user!.user_id) {
      throw new ApiError(403, 'You cannot change your own role.');
    }

    const targetUser = await this.userRepository.findSafeById(userId);
    if (!targetUser) throw new ApiError(404, 'User not found');

    const role = await this.userRepository.findRoleById(roleId);
    if (!role) throw new ApiError(400, 'The specified role does not exist');

    const previousRoles = (await this.userRepository.getUserRoles(userId)).map((r) => r.name);

    await this.userRepository.updateUserRole(userId, roleId);

    await this.auditService.log({
      userId: req.user!.user_id,
      action: 'user_role_changed',
      module: 'users',
      recordId: userId,
      oldValues: { roles: previousRoles },
      newValues: { roles: [role.name], targetEmail: targetUser.email },
      ipAddress: req.ip,
    });
    logger.warn(
      `[Users] Role change by user_id=${req.user!.user_id}: target=${userId} ` +
        `${previousRoles.join(',') || 'none'} -> ${role.name}`
    );

    res.status(200).json(new ApiResponse(200, null, 'User role updated successfully'));
  };

  /**
   * Staff provisioning. The role is validated against the Roles table and a
   * cryptographically random activation password is generated when none is
   * supplied — there is no shared default credential.
   */
  createUser = async (req: AuthRequest, res: Response) => {
    const { first_name, last_name, email, phone, status, roleId } = req.body;

    if (!email || !first_name || !last_name) {
      throw new ApiError(400, 'First name, last name and email are required');
    }
    if (!Number.isInteger(Number(roleId)) || Number(roleId) < 1) {
      throw new ApiError(400, 'A valid role ID is required');
    }

    const role = await this.userRepository.findRoleById(Number(roleId));
    if (!role) throw new ApiError(400, 'The specified role does not exist');

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // No shared default credential. When the operator supplies no password we
    // mint a random one that is never returned; the account is activated
    // through the standard forgot-password flow.
    const suppliedPassword = typeof req.body.password === 'string' ? req.body.password : '';
    if (suppliedPassword && suppliedPassword.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    const provisionalPassword = suppliedPassword || crypto.randomBytes(32).toString('base64url');
    const password_hash = await bcrypt.hash(provisionalPassword, BCRYPT_COST);

    // createUser projects an explicit column list — no password_hash returned.
    const newUser = await this.userRepository.createUser(
      {
        first_name,
        last_name,
        email,
        password_hash,
        phone,
        status: status || 'Active',
      },
      role.role_id
    );

    await this.auditService.log({
      userId: req.user!.user_id,
      action: 'user_created',
      module: 'users',
      recordId: newUser.user_id,
      newValues: { email: newUser.email, role: role.name },
      ipAddress: req.ip,
    });

    res.status(201).json(
      new ApiResponse(
        201,
        { ...newUser, activationRequired: !suppliedPassword },
        suppliedPassword
          ? 'User created successfully'
          : 'User created. Ask them to use "Forgot password" to set their credentials.'
      )
    );
  };
}
