import { Response, NextFunction } from "express";
import { CartService } from "../services/cartService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/customError";

export class CartController {
  static async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const items = await CartService.getCart(userId);

      // Return items array inside JSON as specified in API Design (Section 6.3)
      res.status(200).json({
        success: true,
        items: items.map((item) => ({
          cartItemId: item.cart_item_id,
          productId: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: Number(((item.price || 0) * item.quantity).toFixed(2)),
          stockQuantity: item.stock_quantity,
          primaryImage: item.primary_image,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  static async addItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { productId, quantity } = req.body;

      await CartService.addItemToCart(userId, parseInt(productId, 10), parseInt(quantity, 10));

      res.status(200).json({
        success: true,
        message: "Item added to cart successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const cartItemId = parseInt(req.params.id, 10);
      if (isNaN(cartItemId)) {
        throw new BadRequestError("Invalid cart item ID.");
      }

      const { quantity } = req.body;
      await CartService.updateItemQuantity(userId, cartItemId, parseInt(quantity, 10));

      res.status(200).json({
        success: true,
        message: "Cart item updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const cartItemId = parseInt(req.params.id, 10);
      if (isNaN(cartItemId)) {
        throw new BadRequestError("Invalid cart item ID.");
      }

      await CartService.removeItemFromCart(userId, cartItemId);

      res.status(200).json({
        success: true,
        message: "Item removed from cart successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}
