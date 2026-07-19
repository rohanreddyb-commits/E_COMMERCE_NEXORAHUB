import { Request, Response } from 'express';
import { ReviewRepository } from '../repositories/review.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export class ReviewController {
  private reviewRepository: ReviewRepository;

  constructor() {
    this.reviewRepository = new ReviewRepository();
  }

  getAllReviews = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const reviews = await this.reviewRepository.getReviews(page, limit, search, status);
    res.status(200).json(new ApiResponse(200, reviews, 'Reviews retrieved successfully'));
  };

  updateReviewStatus = async (req: Request, res: Response) => {
    const reviewId = Number(req.params.id);
    const { status } = req.body; // Approved, Rejected

    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    const success = await this.reviewRepository.updateReviewStatus(reviewId, status);
    if (!success) {
      throw new ApiError(404, 'Review not found or failed to update');
    }

    res.status(200).json(new ApiResponse(200, null, 'Review status updated successfully'));
  };
}
