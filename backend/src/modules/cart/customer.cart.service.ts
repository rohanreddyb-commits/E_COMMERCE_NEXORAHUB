import { CustomerCartRepository } from './customer.cart.repository';
import { ApiError } from '../../utils/ApiError';
import { MAX_CART_ITEMS } from '../../core/constants/customer.constants';
import { formatMoney, calculateDiscount } from '../../common/utils/helpers.util';
import { executeQuery } from '../../database/db';
import sql from 'mssql';

const SHIPPING_THRESHOLD = 500; // Free shipping above ₹500
const SHIPPING_FEE = 49;        // ₹49 shipping below threshold
const TAX_RATE = 0.18;          // 18% GST

export class CustomerCartService {
  private readonly repo: CustomerCartRepository;
  constructor() { this.repo = new CustomerCartRepository(); }

  async getCart(userId: number) {
    const items = await this.repo.getActiveCart(userId);
    return this.buildCartResponse(items, null);
  }

  async addItem(userId: number, productId: number, quantity: number) {
    // Validate product
    const productResult = await executeQuery(
      `SELECT product_id, price, sale_price, status FROM Products WHERE product_id = @id`,
      { id: { type: sql.Int, value: productId } }
    );
    const product = productResult.recordset[0];
    if (!product) throw new ApiError(404, 'Product not found.');
    if (product.status !== 'Active') throw new ApiError(400, 'This product is currently unavailable.');

    // Check stock
    const stockResult = await executeQuery(
      `SELECT quantity FROM Inventory WHERE product_id = @id`,
      { id: { type: sql.Int, value: productId } }
    );
    const stockQuantity = stockResult.recordset[0]?.quantity || 0;

    // Check existing cart item
    const existing = await this.repo.getItemByUserAndProduct(userId, productId, false);
    const newQty = existing ? existing.quantity + quantity : quantity;

    if (newQty > stockQuantity) {
      throw new ApiError(400, `Only ${stockQuantity} units available. You have ${existing?.quantity || 0} in cart.`);
    }

    // Check cart item limit
    if (!existing) {
      const count = await this.repo.countActiveItems(userId);
      if (count >= MAX_CART_ITEMS) {
        throw new ApiError(400, `Cart limit reached (max ${MAX_CART_ITEMS} items).`);
      }
      await this.repo.addItem(userId, productId, quantity);
    } else {
      await this.repo.updateQuantity(existing.cart_item_id, newQty);
    }

    return this.getCart(userId);
  }

  async updateItem(cartItemId: number, userId: number, quantity: number) {
    const item = await this.repo.getItemById(cartItemId);
    if (!item || item.user_id !== userId) throw new ApiError(404, 'Cart item not found.');
    if (item.saved_for_later) throw new ApiError(400, 'Item is saved for later, not in active cart.');

    if (quantity > item.stock_quantity) {
      throw new ApiError(400, `Only ${item.stock_quantity} units available.`);
    }

    await this.repo.updateQuantity(cartItemId, quantity);
    return this.getCart(userId);
  }

  async removeItem(cartItemId: number, userId: number) {
    const item = await this.repo.getItemById(cartItemId);
    if (!item || item.user_id !== userId) throw new ApiError(404, 'Cart item not found.');
    await this.repo.deleteItem(cartItemId);
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    await this.repo.clearCart(userId);
  }

  async saveForLater(cartItemId: number, userId: number) {
    const item = await this.repo.getItemById(cartItemId);
    if (!item || item.user_id !== userId) throw new ApiError(404, 'Cart item not found.');
    await this.repo.saveForLater(cartItemId, userId);
    return { message: 'Item saved for later.' };
  }

  async getSavedForLater(userId: number) {
    return this.repo.getSavedForLater(userId);
  }

  async moveToCartFromSaved(cartItemId: number, userId: number) {
    const item = await this.repo.getItemById(cartItemId);
    if (!item || item.user_id !== userId) throw new ApiError(404, 'Item not found.');
    if (!item.saved_for_later) throw new ApiError(400, 'Item is already in cart.');

    // Check stock availability before moving back
    if (item.quantity > item.stock_quantity) {
      throw new ApiError(400, `Only ${item.stock_quantity} units available.`);
    }

    await this.repo.moveToCart(cartItemId, userId);
    return this.getCart(userId);
  }

  async applyCoupon(userId: number, couponCode: string) {
    // Validate coupon
    const couponResult = await executeQuery(
      `SELECT * FROM Coupons WHERE code = @code AND is_active = 1 AND expiry_date > GETDATE()
       AND (start_date IS NULL OR start_date <= GETDATE())
       AND (usage_limit IS NULL OR used_count < usage_limit)`,
      { code: { type: sql.VarChar(50), value: couponCode } }
    );
    const coupon = couponResult.recordset[0];
    if (!coupon) throw new ApiError(404, 'Invalid or expired coupon code.');

    const items = await this.repo.getActiveCart(userId);
    if (items.length === 0) throw new ApiError(400, 'Cart is empty.');

    const subtotal = items.reduce((sum, item) => {
      const price = item.sale_price || item.price;
      return sum + price * item.quantity;
    }, 0);

    if (subtotal < coupon.min_order_amount) {
      throw new ApiError(400, `Minimum order amount for this coupon is ₹${coupon.min_order_amount}.`);
    }

    const discount = calculateDiscount(subtotal, coupon.discount_type, coupon.discount_value, coupon.max_discount_amount);
    return {
      couponCode: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount: discount,
      message: `Coupon applied! You save ₹${discount.toFixed(2)}.`,
    };
  }

  private buildCartResponse(items: any[], coupon: any) {
    const subtotal = items.reduce((sum, item) => {
      const price = item.sale_price ?? item.price;
      return sum + formatMoney(price * item.quantity);
    }, 0);

    const discountAmount = coupon ? coupon.discountAmount : 0;
    const subtotalAfterDiscount = formatMoney(subtotal - discountAmount);
    const shippingFee = subtotalAfterDiscount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const taxAmount = formatMoney(subtotalAfterDiscount * TAX_RATE);
    const total = formatMoney(subtotalAfterDiscount + shippingFee + taxAmount);

    return {
      items: items.map((item) => ({
        cartItemId: item.cart_item_id,
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          name: item.name,
          slug: item.slug,
          price: item.price,
          salePrice: item.sale_price,
          effectivePrice: item.sale_price ?? item.price,
          brandName: item.brand_name,
          primaryImage: item.primary_image,
          stockQuantity: item.stock_quantity,
          isAvailable: item.product_status === 'Active' && item.stock_quantity >= item.quantity,
        },
        lineTotal: formatMoney((item.sale_price ?? item.price) * item.quantity),
      })),
      summary: {
        itemCount: items.length,
        subtotal: formatMoney(subtotal),
        discount: formatMoney(discountAmount),
        shippingFee,
        tax: taxAmount,
        total,
        freeShippingMessage: shippingFee > 0
          ? `Add ₹${formatMoney(SHIPPING_THRESHOLD - subtotalAfterDiscount)} more for free shipping!`
          : 'You have free shipping!',
      },
      coupon: coupon || null,
    };
  }
}
