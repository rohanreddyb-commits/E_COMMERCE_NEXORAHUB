import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../common/middleware/validate.middleware';
import { authRateLimiter } from '../common/middleware/rateLimiter.middleware';

const router = Router();
const authController = new AuthController();

/**
 * Registration here is self-service and always creates a Customer.
 * Staff accounts are provisioned via POST /api/users (Super Admin only) or
 * the one-time `npm run bootstrap:admin` script.
 *
 * The validation chain doubles as the mass-assignment guard: the controller
 * forwards a fixed field whitelist, so an injected `role_id` never reaches
 * the service layer.
 */
const registerValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 100 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name can only contain letters, spaces, hyphens, and apostrophes."),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 100 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name can only contain letters, spaces, hyphens, and apostrophes."),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 255 }),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
    ),
  body('phone').optional().isMobilePhone('any'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  validateRequest,
  asyncHandler(authController.login)
);
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  validateRequest,
  asyncHandler(authController.register)
);
router.get('/me', authenticate, asyncHandler(authController.getMe));

export default router;
