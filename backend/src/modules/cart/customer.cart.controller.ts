import { Request, Response } from 'express';
import { CustomerCartService } from './customer.cart.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerCartController {
  private readonly service: CustomerCartService;
  constructor() { this.service = new CustomerCartService(); }

  getCart = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getCart(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Cart retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity = 1 } = req.body;
    const data = await this.service.addItem(req.customer!.userId, Number(productId), Number(quantity));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Item added to cart.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.updateItem(Number(req.params.id), req.customer!.userId, Number(req.body.quantity));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Cart updated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.removeItem(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Item removed from cart.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    await this.service.clearCart(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Cart cleared.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  saveForLater = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.saveForLater(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Item saved for later.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getSaved = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getSavedForLater(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Saved items retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  moveToCart = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.moveToCartFromSaved(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Item moved to cart.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.applyCoupon(req.customer!.userId, req.body.couponCode);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Coupon applied.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
