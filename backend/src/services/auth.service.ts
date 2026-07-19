import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status !== 'Active') {
      throw new ApiError(403, 'User account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const roles = await this.userRepository.getUserRoles(user.user_id);
    const permissions = await this.userRepository.getUserPermissions(user.user_id);

    const token = jwt.sign(
      { userId: user.user_id, roles, permissions },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'] }
    );

    await this.userRepository.updateLastLogin(user.user_id);

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

  async register(userData: any) {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const roleId = userData.role_id || 3; // default to customer role (assuming 3 is Customer)

    const newUser = await this.userRepository.createUser(
      {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password_hash,
        phone: userData.phone,
      },
      roleId
    );

    return newUser;
  }
}
