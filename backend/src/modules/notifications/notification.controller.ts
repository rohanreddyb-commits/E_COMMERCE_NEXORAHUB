import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { successResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class NotificationController {
  private readonly service: NotificationService;
  constructor() { this.service = new NotificationService(); }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getNotifications(req.customer!.userId, req.query.page, req.query.limit, req.query.unread === 'true');
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Notifications retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await this.service.getUnreadCount(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse({ unreadCount: count }, 'Unread count.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markAsRead(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Notification marked as read.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markAllAsRead(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'All notifications marked as read.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteNotification(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Notification deleted.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
