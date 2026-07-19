import { CustomerAuthPayload } from '../../modules/authentication/dto/auth.dto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
      customer?: CustomerAuthPayload;
      startTime?: number;
    }
  }
}

export {};
