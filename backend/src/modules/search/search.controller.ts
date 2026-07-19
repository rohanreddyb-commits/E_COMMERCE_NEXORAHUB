import { Request, Response } from 'express';
import { SearchService } from './search.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class SearchController {
  private readonly service: SearchService;
  constructor() { this.service = new SearchService(); }

  search = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.search({
      q: req.query.q as string, page: req.query.page, limit: req.query.limit,
      categoryId: req.query.category ? Number(req.query.category) : undefined,
      brandId: req.query.brand ? Number(req.query.brand) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sort: req.query.sort as string, order: req.query.order as string,
      userId: req.customer?.userId,
    });
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Search results.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  autocomplete = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.autocomplete(req.query.q as string);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Autocomplete results.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getTrending = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getTrendingSearches();
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Trending searches.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getSearchHistory(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Search history.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  clearHistory = asyncHandler(async (req: Request, res: Response) => {
    await this.service.clearSearchHistory(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Search history cleared.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
