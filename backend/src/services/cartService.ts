import { CartRepository, CartItemDB } from "../repositories/cartRepository";
import { ProductRepository } from "../repositories/productRepository";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/customError";

export class CartService {
  static async getCart(userId: number): Promise<CartItemDB[]> {
    return CartRepository.getCartByUser(userId);
  }

  static async addItemToCart(userId: number, productId: number, quantity: number): Promise<void> {
    // 1. Verify product exists and check stock
    const product = await ProductRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} not found.`);
    }

    if (product.status !== "Active") {
      throw new BadRequestError("This product is currently unavailable.");
    }

    // 2. Check if item already exists in user's cart
    const existingItem = await CartRepository.getCartItemByUserAndProduct(userId, productId);
    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    // Verify aggregate quantity doesn't exceed stock limit
    if (newQuantity > product.stock_quantity) {
      throw new BadRequestError(
        `Cannot add quantity. Only ${product.stock_quantity} units are available in stock (you already have ${
          existingItem ? existingItem.quantity : 0
        } in your cart).`
      );
    }

    // 3. Create or update record
    if (existingItem) {
      await CartRepository.updateCartItemQuantity(existingItem.cart_item_id, newQuantity);
    } else {
      await CartRepository.createCartItem(userId, productId, quantity);
    }
  }

  static async updateItemQuantity(userId: number, cartItemId: number, quantity: number): Promise<void> {
    // 1. Verify cart item exists and check ownership
    const cartItem = await CartRepository.getCartItemById(cartItemId);
    if (!cartItem) {
      throw new NotFoundError("Cart item not found.");
    }

    if (cartItem.user_id !== userId) {
      throw new ForbiddenError("Access denied. You do not own this cart item.");
    }

    // 2. Check product stock limit
    const product = await ProductRepository.getProductById(cartItem.product_id);
    if (!product) {
      throw new NotFoundError("Product linked to cart item no longer exists.");
    }

    if (quantity > product.stock_quantity) {
      throw new BadRequestError(`Only ${product.stock_quantity} units are available in stock.`);
    }

    // 3. Update quantity
    const success = await CartRepository.updateCartItemQuantity(cartItemId, quantity);
    if (!success) {
      throw new BadRequestError("Failed to update cart item quantity.");
    }
  }

  static async removeItemFromCart(userId: number, cartItemId: number): Promise<void> {
    // 1. Verify cart item exists and check ownership
    const cartItem = await CartRepository.getCartItemById(cartItemId);
    if (!cartItem) {
      throw new NotFoundError("Cart item not found.");
    }

    if (cartItem.user_id !== userId) {
      throw new ForbiddenError("Access denied. You do not own this cart item.");
    }

    // 2. Delete item
    const success = await CartRepository.deleteCartItem(cartItemId);
    if (!success) {
      throw new BadRequestError("Failed to remove item from cart.");
    }
  }
}
