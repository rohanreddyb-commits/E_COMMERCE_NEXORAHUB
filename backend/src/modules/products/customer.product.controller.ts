import { Request, Response } from 'express';
import { CustomerProductService } from './customer.product.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';

export class CustomerProductController {
  private readonly service: CustomerProductService;
  constructor() { this.service = new CustomerProductService(); }

  getProducts = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getProducts({
      page: req.query.page, limit: req.query.limit,
      search: req.query.search as string,
      categoryId: req.query.category ? Number(req.query.category) : undefined,
      brandId: req.query.brand ? Number(req.query.brand) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'ASC' | 'DESC',
      isFeatured: req.query.featured === 'true',
      onSale: req.query.onSale === 'true',
    });
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Products retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getProductDetail = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.service.getProductDetail(Number(req.params.id), req.customer?.userId);
    if (!product) throw new ApiError(404, 'Product not found.');
    return res.status(HTTP_STATUS.OK).json(successResponse(product, 'Product retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getFeaturedProducts();
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Featured products retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getNewArrivals();
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'New arrivals retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getRelatedProducts(Number(req.params.id));
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Related products retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getBestSellers = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getBestSellers();
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Best sellers retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getRecentlyViewed(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Recently viewed products retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
