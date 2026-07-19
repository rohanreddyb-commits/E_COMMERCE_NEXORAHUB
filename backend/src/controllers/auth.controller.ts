import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/ApiError';

export class AuthController {
  private authService: AuthService;
  private userRepository: UserRepository;

  constructor() {
    this.authService = new AuthService();
    this.userRepository = new UserRepository();
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    
    const roleNames = result.user.roles;
    const isAdmin = roleNames.includes('Super Admin') || roleNames.includes('Admin');

    res.status(200).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.user_id,
        name: `${result.user.first_name} ${result.user.last_name}`,
        email: result.user.email,
        role: isAdmin ? 'Admin' : 'Customer',
        role_id: isAdmin ? 1 : 2
      }
    });
  };

  register = async (req: Request, res: Response) => {
    const user = await this.authService.register(req.body);
    res.status(201).json({
      success: true,
      user
    });
  };

  getMe = async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    
    const user = await this.userRepository.findById(req.user.user_id);
    if (!user) throw new ApiError(404, 'User not found');

    const roles = await this.userRepository.getUserRoles(user.user_id);
    const roleNames = roles.map(r => r.name);
    const isAdmin = roleNames.includes('Super Admin') || roleNames.includes('Admin');

    res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: isAdmin ? 'Admin' : 'Customer',
        role_id: isAdmin ? 1 : 2
      }
    });
  };
}
