import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { STAFF_ROLES } from '../core/constants/customer.constants';

const isStaff = (roleNames: string[]): boolean =>
  roleNames.some((name) => (STAFF_ROLES as readonly string[]).includes(name));

export class AuthController {
  private authService: AuthService;
  private userRepository: UserRepository;

  constructor() {
    this.authService = new AuthService();
    this.userRepository = new UserRepository();
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await this.authService.login(email, password, ipAddress, userAgent);

    const roleNames = result.user.roles;
    const admin = isStaff(roleNames);

    res.status(200).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.user_id,
        name: `${result.user.first_name} ${result.user.last_name}`,
        email: result.user.email,
        roles: roleNames,
        role: admin ? 'Admin' : 'Customer',
      },
    });
  };

  register = async (req: Request, res: Response) => {
    // Only whitelisted fields are forwarded. Anything else in the body —
    // notably role_id — is discarded before it reaches the service.
    const user = await this.authService.register({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      },
    });
  };

  getMe = async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const user = await this.userRepository.findSafeById(req.user.user_id);
    if (!user) throw new ApiError(404, 'User not found');

    const roles = await this.userRepository.getUserRoles(user.user_id);
    const roleNames = roles.map((r) => r.name);
    const admin = isStaff(roleNames);

    res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        roles: roleNames,
        role: admin ? 'Admin' : 'Customer',
      },
    });
  };
}
