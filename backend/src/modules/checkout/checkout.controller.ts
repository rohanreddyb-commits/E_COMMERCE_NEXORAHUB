import { Request, Response } from 'express';
import { CheckoutService } from './checkout.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CheckoutController {
  private readonly service: CheckoutService;
  constructor() { this.service = new CheckoutService(); }

  previewOrder = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.previewOrder(req.customer!.userId, {
      addressId: Number(req.body.addressId),
      couponCode: req.body.couponCode,
      pointsToRedeem: req.body.pointsToRedeem ? Number(req.body.pointsToRedeem) : undefined,
    });
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Order preview calculated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  placeOrder = asyncHandler(async (req: Request, res: Response) => {
    const customer = req.customer!;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    const data = await this.service.placeOrder(
      customer.userId,
      customer.email,
      `${customer.firstName} ${customer.lastName}`,
      {
        addressId: Number(req.body.addressId),
        couponCode: req.body.couponCode,
        paymentMethod: req.body.paymentMethod || 'COD',
        pointsToRedeem: req.body.pointsToRedeem ? Number(req.body.pointsToRedeem) : undefined,
        idempotencyKey: idempotencyKey || undefined,
        giftMessage: req.body.giftMessage,
      }
    );
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(data, 'Order placed successfully!', req.requestId));
  });
}
