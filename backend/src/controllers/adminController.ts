import { Response, NextFunction } from "express";
import { AdminService } from "../services/adminService";
import { AuthenticatedRequest } from "../middleware/auth";

export class AdminController {
  static async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      
      res.status(200).json({
        success: true,
        stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
