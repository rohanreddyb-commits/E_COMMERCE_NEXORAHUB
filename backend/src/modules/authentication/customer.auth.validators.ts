import { body, param } from 'express-validator';

const passwordRules = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters.')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.');

export const registerValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 100 }).withMessage('First name cannot exceed 100 characters.')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes.'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 100 }).withMessage('Last name cannot exceed 100 characters.')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes.'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters.'),
  passwordRules,
  body('phone')
    .optional()
    .isMobilePhone('any').withMessage('Please provide a valid phone number.'),
];

export const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

export const refreshValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required.'),
];

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
];

export const verifyOtpValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('otp')
    .notEmpty().withMessage('OTP is required.')
    .isNumeric().withMessage('OTP must be numeric.')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.'),
  body('type')
    .isIn(['password_reset', 'email_verify']).withMessage('Invalid OTP type.'),
];

export const resetPasswordValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('token')
    .notEmpty().withMessage('Reset token is required.'),
  body('newPassword')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.'),
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.'),
];

export const sessionIdParamValidation = [
  param('sessionId')
    .notEmpty().withMessage('Session ID is required.')
    .isUUID().withMessage('Invalid session ID format.'),
];
