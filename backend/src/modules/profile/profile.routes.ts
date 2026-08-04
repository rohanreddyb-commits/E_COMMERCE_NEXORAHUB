import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { upload, verifyUploadedImages } from '../../middleware/upload';
import { uploadRateLimiter } from '../../common/middleware/rateLimiter.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new ProfileController();

const updateProfileValidation = [
  body('first_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('last_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().isMobilePhone('any'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD.'),
  body('gender').optional().isIn(['Male', 'Female', 'Other', 'Prefer not to say']),
];

router.use(authenticateCustomer);
router.get('/', controller.getProfile);
router.patch('/', updateProfileValidation, validateRequest, controller.updateProfile);
router.post(
  '/avatar',
  uploadRateLimiter,
  upload.single('avatar'),
  verifyUploadedImages,
  controller.uploadAvatar
);
router.delete('/avatar', controller.removeAvatar);

export default router;
