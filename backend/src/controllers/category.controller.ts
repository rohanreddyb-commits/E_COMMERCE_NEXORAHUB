import { Request, Response } from 'express';
import { CategoryRepository } from '../repositories/category.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export class CategoryController {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  getAllCategories = async (req: Request, res: Response) => {
    const categories = await this.categoryRepository.findAll();
    res.status(200).json(new ApiResponse(200, categories, 'Categories retrieved successfully'));
  };

  getCategoryById = async (req: Request, res: Response) => {
    const category = await this.categoryRepository.findById(Number(req.params.id));
    if (!category) throw new ApiError(404, 'Category not found');
    res.status(200).json(new ApiResponse(200, category, 'Category retrieved successfully'));
  };

  createCategory = async (req: Request, res: Response) => {
    // Auto-generate slug from name if not supplied
    if (!req.body.slug && req.body.name) {
      req.body.slug = toSlug(req.body.name);
    }
    const category = await this.categoryRepository.create(req.body);
    res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
  };

  updateCategory = async (req: Request, res: Response) => {
    // Auto-generate slug from name if not supplied
    if (!req.body.slug && req.body.name) {
      req.body.slug = toSlug(req.body.name);
    }
    const category = await this.categoryRepository.update(Number(req.params.id), req.body);
    if (!category) throw new ApiError(404, 'Category not found');
    res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
  };

  deleteCategory = async (req: Request, res: Response) => {
    const success = await this.categoryRepository.delete(Number(req.params.id));
    if (!success) throw new ApiError(404, 'Category not found');
    res.status(200).json(new ApiResponse(200, null, 'Category deleted successfully'));
  };
}
