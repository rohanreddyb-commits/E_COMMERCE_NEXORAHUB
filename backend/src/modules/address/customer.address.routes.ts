import { Router } from 'express';
import { CustomerAddressController } from './customer.address.controller';
import { authenticateCustomer } from '../../common/middleware/customer.auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../../common/middleware/validate.middleware';

const router = Router();
const controller = new CustomerAddressController();

const addressValidation = [
  body('first_name').trim().notEmpty().withMessage('First name is required.').isLength({ max: 100 }),
  body('last_name').trim().notEmpty().withMessage('Last name is required.').isLength({ max: 100 }),
  body('phone').notEmpty().withMessage('Phone number is required.').isMobilePhone('any'),
  body('street').trim().notEmpty().withMessage('Street address is required.').isLength({ max: 255 }),
  body('city').trim().notEmpty().withMessage('City is required.').isLength({ max: 100 }),
  body('state').trim().notEmpty().withMessage('State is required.').isLength({ max: 100 }),
  body('postal_code').trim().notEmpty().withMessage('Postal code is required.').isLength({ max: 20 }),
  body('country').optional().isLength({ max: 100 }),
  body('type').optional().isIn(['Shipping', 'Billing']).withMessage('Type must be Shipping or Billing.'),
  body('title').optional().isLength({ max: 50 }),
  body('is_default').optional().isBoolean(),
];

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid address ID.')];

router.use(authenticateCustomer);
router.get('/', controller.getAll);
router.post('/', addressValidation, validateRequest, controller.create);
router.get('/:id', idParam, validateRequest, controller.getOne);
router.put('/:id', idParam, addressValidation, validateRequest, controller.update);
router.delete('/:id', idParam, validateRequest, controller.delete);
router.patch('/:id/default', idParam, validateRequest, controller.setDefault);

export default router;
