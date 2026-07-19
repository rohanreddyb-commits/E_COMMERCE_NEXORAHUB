import { Request, Response } from 'express';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { ApiResponse } from '../utils/ApiResponse';

export class AnalyticsController {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  getDashboardMetrics = async (req: Request, res: Response) => {
    const metrics = await this.analyticsRepository.getDashboardMetrics();
    res.status(200).json(new ApiResponse(200, metrics, 'Dashboard metrics retrieved successfully'));
  };

  getSalesData = async (req: Request, res: Response) => {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const data = await this.analyticsRepository.getSalesData(period);
    res.status(200).json(new ApiResponse(200, data, 'Sales data retrieved successfully'));
  };
}
