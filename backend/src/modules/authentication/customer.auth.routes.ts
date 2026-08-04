import { Router } from 'express';
import { CustomerAuthController } from './customer.auth.controller';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import {
  authRateLimiter,
  forgotPasswordRateLimiter,
  otpVerifyRateLimiter,
} from '../../common/middleware/rateLimiter.middleware';
import {
  registerValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resetPasswordValidation,
  changePasswordValidation,
  sessionIdParamValidation,
} from './customer.auth.validators';

const router = Router();
const controller = new CustomerAuthController();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/register', authRateLimiter, registerValidation, validateRequest, controller.register);
router.post('/login', authRateLimiter, loginValidation, validateRequest, controller.login);
router.post('/refresh', refreshValidation, validateRequest, controller.refresh);
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPasswordValidation, validateRequest, controller.forgotPassword);
router.post('/verify-otp', otpVerifyRateLimiter, verifyOtpValidation, validateRequest, controller.verifyOtp);
router.post('/reset-password', authRateLimiter, resetPasswordValidation, validateRequest, controller.resetPassword);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(authenticateCustomer);

router.get('/me', controller.getMe);
router.post('/logout', controller.logout);
router.post('/logout-all', controller.logoutAll);
router.patch('/change-password', changePasswordValidation, validateRequest, controller.changePassword);
router.get('/sessions', controller.getSessions);
router.delete('/sessions/:sessionId', sessionIdParamValidation, validateRequest, controller.revokeSession);

// ─── Health Check ─────────────────────────────────────────────────────────────
router.get('/health', (_, res) => res.json({ success: true, module: 'auth', status: 'healthy' }));

export default router;
