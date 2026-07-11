import { UserRepository } from "../repositories/userRepository";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { BadRequestError, UnauthorizedError, ConflictError } from "../utils/customError";

export class AuthService {
  static async registerUser(name: string, email: string, password: string): Promise<number> {
    // Check if email already registered
    const existingUser = await UserRepository.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("An account with this email address already exists.");
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create user as Customer (role_id = 2)
    const userId = await UserRepository.createUser(name, email, passwordHash, 2);
    return userId;
  }

  static async loginUser(email: string, password: string): Promise<{ token: string; user: any }> {
    // Look up the user
    const user = await UserRepository.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    // Compare credentials
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    // Generate JWT
    const payload = {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      roleId: user.role_id,
    };
    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role_id === 1 ? "Admin" : "Customer",
      },
    };
  }
}
