import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcrypt';

export class UserController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  getAllUsers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const users = await this.userRepository.getAllUsers(page, limit, search);
    res.status(200).json(new ApiResponse(200, users, 'Users retrieved successfully'));
  };

  updateUserRole = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { roleId } = req.body;

    if (!roleId) {
      throw new ApiError(400, 'Role ID is required');
    }

    await this.userRepository.updateUserRole(userId, roleId);
    res.status(200).json(new ApiResponse(200, null, 'User role updated successfully'));
  };

  createUser = async (req: Request, res: Response) => {
    const userData = req.body;
    
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const password_hash = await bcrypt.hash(userData.password || 'TempPassword123!', 10);
    const roleId = userData.roleId || 3; 

    const newUser = await this.userRepository.createUser(
      {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password_hash,
        phone: userData.phone,
        status: userData.status || 'Active'
      },
      roleId
    );

    res.status(201).json(new ApiResponse(201, newUser, 'User created successfully'));
  }
}
