import { Request, Response } from 'express';
import { RecommendationService } from './recommendation.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class RecommendationController {
  private readonly service: RecommendationService;
  constructor() { this.service = new RecommendationService(); }

  getPersonalized = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getPersonalizedRecommendations(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Personalized recommendations retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getFrequentlyBoughtTogether = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getFrequentlyBoughtTogether(Number(req.params.productId));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Frequently bought together products retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
