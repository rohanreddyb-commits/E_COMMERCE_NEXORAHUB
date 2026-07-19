import { Request, Response } from 'express';
import { CustomerReturnService } from './customer.return.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerReturnController {
  private readonly service = new CustomerReturnService();

  requestReturn = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.requestReturn(req.customer!.userId, {
      orderId: Number(req.body.orderId),
      orderItemId: Number(req.body.orderItemId),
      reason: req.body.reason,
      description: req.body.description,
    });
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(data, 'Return request created.', req.requestId));
  });

  getMyReturns = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getMyReturns(req.customer!.userId, req.query.page, req.query.limit);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Returns retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getReturnDetail = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getReturnDetail(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Return details retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
