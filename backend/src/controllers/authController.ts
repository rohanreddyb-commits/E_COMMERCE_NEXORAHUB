import { Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserRepository } from "../repositories/userRepository";
import { NotFoundError } from "../utils/customError";

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const userId = await AuthService.registerUser(name, email, password);

      res.status(201).json({
        success: true,
        message: "Registration successful. You can now log in.",
        userId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful.",
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new NotFoundError("User not found.");
      }

      const user = await UserRepository.getUserById(req.user.userId);
      if (!user) {
        throw new NotFoundError("User not found in system.");
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role_id === 1 ? "Admin" : "Customer",
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
