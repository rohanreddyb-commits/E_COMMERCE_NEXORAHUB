import { Request, Response } from 'express';
import { CustomerReviewService } from './customer.review.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerReviewController {
  private readonly service: CustomerReviewService;
  constructor() { this.service = new CustomerReviewService(); }

  getProductReviews = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getProductReviews(Number(req.params.productId), req.query.page, req.query.limit, req.query.sort as string);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Reviews retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  createReview = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.createReview(req.customer!.userId, Number(req.params.productId), req.body);
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(data, 'Review submitted for approval.', req.requestId));
  });

  updateReview = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.updateReview(Number(req.params.id), req.customer!.userId, req.body);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Review updated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteReview(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Review deleted.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  voteHelpful = asyncHandler(async (req: Request, res: Response) => {
    await this.service.voteHelpful(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Voted as helpful.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getMyReviews(req.customer!.userId, req.query.page, req.query.limit);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Your reviews retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
