import { Request, Response } from 'express';
import { ProfileService } from './profile.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class ProfileController {
  private readonly service: ProfileService;
  constructor() { this.service = new ProfileService(); }

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getProfile(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Profile retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.updateProfile(req.customer!.userId, req.body);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Profile updated successfully.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new (await import('../../utils/ApiError')).ApiError(400, 'No file uploaded.');
    const data = await this.service.updateAvatar(req.customer!.userId, req.file.filename);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Avatar updated.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  removeAvatar = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.removeAvatar(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Avatar removed.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
