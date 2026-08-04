import { Response } from 'express';
import { CustomerRepository } from '../repositories/customer.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../shared/audit/audit.service';
import { sessionRegistry } from '../shared/session/session.registry';
import { logger } from '../config/logger';

/** Mirrors the CHECK constraint on Users.status. */
const VALID_STATUSES = ['Active', 'Inactive', 'Banned'] as const;

export class CustomerController {
  private customerRepository: CustomerRepository;
  private auditService: AuditService;

  constructor() {
    this.customerRepository = new CustomerRepository();
    this.auditService = new AuditService();
  }

  getAllCustomers = async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    // Cap the page size — an unbounded limit lets one request pull the whole
    // customer table (names, emails, phone numbers) in a single call.
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const search = req.query.search as string;

    const customers = await this.customerRepository.getCustomers(page, limit, search);
    res.status(200).json(new ApiResponse(200, customers, 'Customers retrieved successfully'));
  };

  updateCustomerStatus = async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(userId) || userId < 1) {
      throw new ApiError(400, 'A valid customer ID is required');
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const success = await this.customerRepository.updateCustomerStatus(userId, status);
    if (!success) {
      throw new ApiError(404, 'Customer not found or failed to update');
    }

    // Deactivating an account must end its live sessions immediately.
    // Without this the customer keeps full API access until their access
    // token expires, which defeats the point of the ban.
    if (status !== 'Active') {
      await this.customerRepository.revokeAllSessions(userId);
      sessionRegistry.invalidateUser(userId);
      logger.warn(`[Customers] Sessions revoked for user_id=${userId} (status -> ${status})`);
    }

    await this.auditService.log({
      userId: req.user!.user_id,
      action: 'customer_status_changed',
      module: 'customers',
      recordId: userId,
      newValues: { status },
      ipAddress: req.ip,
    });

    res.status(200).json(new ApiResponse(200, null, 'Customer status updated successfully'));
  };
}
