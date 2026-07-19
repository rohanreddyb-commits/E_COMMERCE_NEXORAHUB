import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class PaymentController {
  private readonly service: PaymentService;
  constructor() { this.service = new PaymentService(); }

  initiatePayment = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.initiatePayment(req.customer!.userId, Number(req.body.orderId));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Payment initiated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.verifyPayment(req.customer!.userId, Number(req.body.orderId), req.body);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, data.success ? 'Payment verified.' : 'Payment failed.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getPaymentHistory(req.customer!.userId, req.query.page, req.query.limit);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Payment history retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
