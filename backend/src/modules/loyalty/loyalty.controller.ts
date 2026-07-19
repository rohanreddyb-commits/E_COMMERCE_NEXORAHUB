import { Request, Response } from 'express';
import { LoyaltyService } from './loyalty.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class LoyaltyController {
  private readonly service: LoyaltyService;
  constructor() { this.service = new LoyaltyService(); }

  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getLoyaltyDashboard(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Loyalty dashboard retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getHistory(req.customer!.userId, req.query.page, req.query.limit);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Points history retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
