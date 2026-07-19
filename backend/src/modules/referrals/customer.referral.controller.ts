import { Request, Response } from 'express';
import { CustomerReferralService } from './customer.referral.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerReferralController {
  private readonly service = new CustomerReferralService();

  getCode = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getMyReferralCode(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Referral code retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getReferralStats(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Referral statistics retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getReferralHistory(req.customer!.userId, req.query.page, req.query.limit);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Referral history retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
