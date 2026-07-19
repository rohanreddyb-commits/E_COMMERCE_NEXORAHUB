import { Request, Response } from 'express';
import { CustomerCouponService } from './customer.coupon.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerCouponController {
  private readonly service: CustomerCouponService;
  constructor() { this.service = new CustomerCouponService(); }

  getAvailable = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getAvailableCoupons();
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Available coupons retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  validate = asyncHandler(async (req: Request, res: Response) => {
    const { code, subtotal } = req.body;
    const data = await this.service.validateCoupon(code, Number(subtotal));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, data.message, HTTP_STATUS.OK, undefined, req.requestId));
  });
}
