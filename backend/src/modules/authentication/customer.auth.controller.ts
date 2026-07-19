import { Request, Response, NextFunction } from 'express';
import { CustomerAuthService } from './customer.auth.service';
import { successResponse, createdResponse } from '../../common/utils/response.util';
import { HTTP_STATUS } from '../../core/constants/customer.constants';
import { asyncHandler } from '../../utils/asyncHandler';

export class CustomerAuthController {
  private readonly authService: CustomerAuthService;

  constructor() {
    this.authService = new CustomerAuthService();
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    return res.status(HTTP_STATUS.CREATED).json(
      createdResponse(result, 'Registration successful. Please verify your email.', req.requestId)
    );
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.login(req.body, ipAddress, userAgent);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(result, 'Login successful.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await this.authService.refreshTokens(refreshToken);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(tokens, 'Token refreshed.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.customer?.sessionId;
    if (sessionId) await this.authService.logout(sessionId);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'Logged out successfully.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.logoutAll(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'All sessions revoked.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await this.authService.forgotPassword(email);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(result, result.message, HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, type } = req.body;
    const result = await this.authService.verifyOtp(email, otp, type);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(result, result.message, HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body;
    await this.authService.resetPassword(email, token, newPassword);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'Password reset successfully. Please login.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.changePassword(
      req.customer!.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'Password changed successfully. Please login again.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = await this.authService.getActiveSessions(req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(sessions, 'Active sessions retrieved.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.revokeSession(req.params.sessionId, req.customer!.userId);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'Session revoked.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const customer = req.customer!;
    return res.status(HTTP_STATUS.OK).json(
      successResponse({
        id: customer.userId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        roles: customer.roles,
      }, 'Profile retrieved.', HTTP_STATUS.OK, undefined, req.requestId)
    );
  });
}
