import { AdminRepository, DashboardStats } from "../repositories/adminRepository";

export class AdminService {
  static async getDashboardStats(): Promise<DashboardStats> {
    return AdminRepository.getDashboardStats();
  }
}
