import { Request, Response } from 'express';
import { CustomerSupportService } from './customer.support.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerSupportController {
  private readonly service = new CustomerSupportService();

  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.createTicket(req.customer!.userId, req.body);
    return res.status(HTTP_STATUS.CREATED).json(createdResponse(data, 'Ticket created.', req.requestId));
  });

  getMyTickets = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getMyTickets(req.customer!.userId, req.query.page, req.query.limit, req.query.status as string);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Tickets retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  getTicketDetail = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getTicketDetail(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Ticket details retrieved.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  replyToTicket = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.replyToTicket(Number(req.params.id), req.customer!.userId, req.body.message);
    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Reply sent.', HTTP_STATUS.OK, undefined, req.requestId));
  });

  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    await this.service.closeTicket(Number(req.params.id), req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Ticket closed.', HTTP_STATUS.OK, undefined, req.requestId));
  });
}
