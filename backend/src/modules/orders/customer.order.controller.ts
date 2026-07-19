import { Request, Response } from 'express';
import { CustomerOrderService } from './customer.order.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerOrderController {
  private readonly service: CustomerOrderService;
  constructor() { this.service = new CustomerOrderService(); }

  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getMyOrders(
      req.customer!.userId, req.query.page, req.query.limit, req.query.status as string
    );
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Orders retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getOrderDetails = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getOrderDetails(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Order details retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    await this.service.cancelOrder(Number(req.params.id), req.customer!.userId, req.body.reason || 'Customer requested cancellation');
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Order cancelled successfully.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getOrderTimeline = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getOrderTimeline(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Order timeline retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getRecentOrders(req.customer!.userId, 5);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Recent orders retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
