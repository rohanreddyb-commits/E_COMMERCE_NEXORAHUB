import { Request, Response } from 'express';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middlewares/auth.middleware';

export class InventoryController {
  private inventoryRepository: InventoryRepository;

  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  getAllInventory = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const inventory = await this.inventoryRepository.getInventory(page, limit, search);
    res.status(200).json(new ApiResponse(200, inventory, 'Inventory retrieved successfully'));
  };

  adjustInventory = async (req: AuthRequest, res: Response) => {
    const productId = Number(req.params.productId);
    const { changeAmount, reason, notes } = req.body;
    
    if (!changeAmount || !reason) {
      throw new ApiError(400, 'Change amount and reason are required');
    }

    const success = await this.inventoryRepository.adjustInventory(
      productId,
      changeAmount,
      reason,
      notes,
      req.user?.user_id // from AuthRequest
    );

    res.status(200).json(new ApiResponse(200, null, 'Inventory adjusted successfully'));
  };

  getInventoryHistory = async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const history = await this.inventoryRepository.getInventoryHistory(productId);
    res.status(200).json(new ApiResponse(200, history, 'Inventory history retrieved successfully'));
  };
}
