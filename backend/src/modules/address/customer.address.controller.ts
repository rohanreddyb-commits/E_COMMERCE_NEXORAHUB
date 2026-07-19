import { Request, Response } from 'express';
import { CustomerAddressService } from './customer.address.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerAddressController {
  private readonly service: CustomerAddressService;
  constructor() { this.service = new CustomerAddressService(); }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getAddresses(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Addresses retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getAddress(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Address retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.createAddress(req.customer!.userId, req.body);
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(data, 'Address created.', req.requestId));
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.updateAddress(Number(req.params.id), req.customer!.userId, req.body);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Address updated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteAddress(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Address deleted.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  setDefault = asyncHandler(async (req: Request, res: Response) => {
    await this.service.setDefault(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Default address updated.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
