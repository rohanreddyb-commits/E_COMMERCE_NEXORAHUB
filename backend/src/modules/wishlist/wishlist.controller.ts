import { Request, Response } from 'express';
import { WishlistService } from './wishlist.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomerCartService } from '../cart/customer.cart.service';

export class WishlistController {
  private readonly service: WishlistService;
  private readonly cartService: CustomerCartService;
  constructor() {
    this.service = new WishlistService();
    this.cartService = new CustomerCartService();
  }

  getWishlist = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getWishlist(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Wishlist retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  addToWishlist = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.body;
    await this.service.addToWishlist(req.customer!.userId, Number(productId));
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(null, 'Product added to wishlist.', req.requestId));
  });

  removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
    await this.service.removeFromWishlist(req.customer!.userId, Number(req.params.productId));
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Product removed from wishlist.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  moveToCart = asyncHandler(async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const quantity = req.body.quantity || 1;
    // Add to cart first, then remove from wishlist
    await this.cartService.addItem(req.customer!.userId, productId, quantity);
    await this.service.moveToCart(req.customer!.userId, productId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Product moved to cart.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
