import { Request, Response } from 'express';
import { BrandRepository } from '../repositories/brand.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export class BrandController {
  private brandRepository: BrandRepository;

  constructor() {
    this.brandRepository = new BrandRepository();
  }

  getAllBrands = async (req: Request, res: Response) => {
    const brands = await this.brandRepository.findAll();
    res.status(200).json(new ApiResponse(200, brands, 'Brands retrieved successfully'));
  };

  getBrandById = async (req: Request, res: Response) => {
    const brand = await this.brandRepository.findById(Number(req.params.id));
    if (!brand) throw new ApiError(404, 'Brand not found');
    res.status(200).json(new ApiResponse(200, brand, 'Brand retrieved successfully'));
  };

  createBrand = async (req: Request, res: Response) => {
    if (!req.body.slug && req.body.name) {
      req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    const brand = await this.brandRepository.create(req.body);
    res.status(201).json(new ApiResponse(201, brand, 'Brand created successfully'));
  };

  updateBrand = async (req: Request, res: Response) => {
    if (!req.body.slug && req.body.name) {
      req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    const brand = await this.brandRepository.update(Number(req.params.id), req.body);
    if (!brand) throw new ApiError(404, 'Brand not found');
    res.status(200).json(new ApiResponse(200, brand, 'Brand updated successfully'));
  };

  deleteBrand = async (req: Request, res: Response) => {
    const success = await this.brandRepository.delete(Number(req.params.id));
    if (!success) throw new ApiError(404, 'Brand not found');
    res.status(200).json(new ApiResponse(200, null, 'Brand deleted successfully'));
  };
}
