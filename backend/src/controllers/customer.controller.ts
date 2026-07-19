import { Request, Response } from 'express';
import { CustomerRepository } from '../repositories/customer.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export class CustomerController {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  getAllCustomers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const customers = await this.customerRepository.getCustomers(page, limit, search);
    res.status(200).json(new ApiResponse(200, customers, 'Customers retrieved successfully'));
  };

  updateCustomerStatus = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    const success = await this.customerRepository.updateCustomerStatus(userId, status);
    if (!success) {
      throw new ApiError(404, 'Customer not found or failed to update');
    }

    res.status(200).json(new ApiResponse(200, null, 'Customer status updated successfully'));
  };
}
