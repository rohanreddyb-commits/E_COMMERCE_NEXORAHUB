import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { CustomerCartRepository } from '../cart/customer.cart.repository';
import { CustomerAddressRepository } from '../address/customer.address.repository';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationService } from '../notifications/notification.service';
import { EmailService } from '../../shared/email/email.service';
import { AuditService } from '../../shared/audit/audit.service';
import { ApiError } from '../../utils/ApiError';
import { formatMoney, generateOrderNumber, calculateDiscount } from '../../common/utils/helpers.util';
import { CANCELLABLE_ORDER_STATUSES, RETURNABLE_ORDER_STATUSES, RETURN_WINDOW_DAYS, POINTS_PER_RUPEE } from '../../core/constants/customer.constants';

const SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 49;
const TAX_RATE = 0.18;

export class CheckoutService {
  private readonly cartRepo: CustomerCartRepository;
  private readonly addressRepo: CustomerAddressRepository;
  private readonly loyaltyService: LoyaltyService;
  private readonly notificationService: NotificationService;
  private readonly emailService: EmailService;
  private readonly auditService: AuditService;

  constructor() {
    this.cartRepo = new CustomerCartRepository();
    this.addressRepo = new CustomerAddressRepository();
    this.loyaltyService = new LoyaltyService();
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
    this.auditService = new AuditService();
  }

  /**
   * Idempotent preview — does NOT create order.
   */
  async previewOrder(userId: number, options: {
    addressId: number;
    couponCode?: string;
    pointsToRedeem?: number;
  }) {
    const [cartItems, address] = await Promise.all([
      this.cartRepo.getActiveCart(userId),
      this.addressRepo.findById(options.addressId, userId),
    ]);

    if (cartItems.length === 0) throw new ApiError(400, 'Your cart is empty.');
    if (!address) throw new ApiError(404, 'Shipping address not found.');

    return this.calculateOrderTotals(cartItems, options.couponCode, options.pointsToRedeem);
  }

  /**
   * Place order — fully transactional with inventory locking.
   */
  async placeOrder(userId: number, userEmail: string, userName: string, options: {
    addressId: number;
    couponCode?: string;
    paymentMethod: string;
    pointsToRedeem?: number;
    idempotencyKey?: string;
    giftMessage?: string;
  }) {
    // Idempotency check
    if (options.idempotencyKey) {
      const existingOrder = await executeQuery(
        `SELECT order_id, order_number FROM Orders WHERE idempotency_key = @key AND user_id = @user_id`,
        {
          key: { type: sql.VarChar(100), value: options.idempotencyKey },
          user_id: { type: sql.Int, value: userId },
        }
      );
      if (existingOrder.recordset.length > 0) {
        const order = existingOrder.recordset[0];
        return { orderId: order.order_id, orderNumber: order.order_number, isIdempotent: true };
      }
    }

    const address = await this.addressRepo.findById(options.addressId, userId);
    if (!address) throw new ApiError(404, 'Shipping address not found.');

    return runInTransaction(async (transaction) => {
      // Lock cart items and validate stock
      const cartItems = await this.cartRepo.getActiveCart(userId);
      if (cartItems.length === 0) throw new ApiError(400, 'Cart is empty.');

      const verifiedItems: {
        productId: number; quantity: number; unitPrice: number; name: string; sku: string;
      }[] = [];

      for (const item of cartItems) {
        const lockResult = await transaction.request()
          .input('productId', sql.Int, item.product_id)
          .query(`SELECT p.product_id, p.price, p.sale_price, p.name, p.sku, p.status,
                         i.quantity as stock_quantity
                  FROM Products p WITH (UPDLOCK, ROWLOCK)
                  LEFT JOIN Inventory i WITH (UPDLOCK) ON p.product_id = i.product_id
                  WHERE p.product_id = @productId`);

        const product = lockResult.recordset[0];
        if (!product) throw new ApiError(400, `Product '${item.name}' no longer exists.`);
        if (product.status !== 'Active') throw new ApiError(400, `Product '${item.name}' is unavailable.`);
        if (product.stock_quantity < item.quantity) {
          throw new ApiError(400, `Insufficient stock for '${item.name}'. Only ${product.stock_quantity} available.`);
        }

        verifiedItems.push({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: formatMoney(product.sale_price ?? product.price),
          name: product.name,
          sku: product.sku,
        });
      }

      const totals = await this.calculateOrderTotals(cartItems, options.couponCode, options.pointsToRedeem);

      // Deduct inventory
      for (const item of verifiedItems) {
        await transaction.request()
          .input('productId', sql.Int, item.productId)
          .input('qty', sql.Int, item.quantity)
          .query(`UPDATE Inventory SET quantity = quantity - @qty, updated_at = GETDATE()
                  WHERE product_id = @productId AND quantity >= @qty`);
      }

      // Resolve coupon ID
      let couponId: number | null = null;
      if (options.couponCode) {
        const couponResult = await transaction.request()
          .input('code', sql.VarChar(50), options.couponCode)
          .query(`SELECT coupon_id FROM Coupons WHERE code = @code`);
        couponId = couponResult.recordset[0]?.coupon_id || null;
        if (couponId) {
          await transaction.request()
            .input('coupon_id', sql.Int, couponId)
            .query(`UPDATE Coupons SET used_count = used_count + 1 WHERE coupon_id = @coupon_id`);
        }
      }

      const orderNumber = generateOrderNumber();

      // Create order
      const orderResult = await transaction.request()
        .input('order_number', sql.VarChar(50), orderNumber)
        .input('user_id', sql.Int, userId)
        .input('shipping_address_id', sql.Int, options.addressId)
        .input('subtotal', sql.Decimal(10, 2), totals.subtotal)
        .input('shipping_fee', sql.Decimal(10, 2), totals.shippingFee)
        .input('tax_amount', sql.Decimal(10, 2), totals.tax)
        .input('discount_amount', sql.Decimal(10, 2), totals.discount)
        .input('total_amount', sql.Decimal(10, 2), totals.total)
        .input('coupon_id', sql.Int, couponId)
        .input('payment_method', sql.VarChar(50), options.paymentMethod)
        .input('notes', sql.NVarChar(sql.MAX), options.giftMessage || null)
        .input('idempotency_key', sql.VarChar(100), options.idempotencyKey || null)
        .query(`INSERT INTO Orders (
          order_number, user_id, shipping_address_id, subtotal, shipping_fee, tax_amount,
          discount_amount, total_amount, coupon_id, order_status, payment_status,
          payment_method, notes, idempotency_key, created_at, updated_at
        ) OUTPUT inserted.order_id, inserted.order_number
        VALUES (
          @order_number, @user_id, @shipping_address_id, @subtotal, @shipping_fee, @tax_amount,
          @discount_amount, @total_amount, @coupon_id, 'Pending', 'Pending',
          @payment_method, @notes, @idempotency_key, GETDATE(), GETDATE()
        )`);

      const orderId: number = orderResult.recordset[0].order_id;

      // Insert order items with product name snapshot
      for (const item of verifiedItems) {
        await transaction.request()
          .input('order_id', sql.Int, orderId)
          .input('product_id', sql.Int, item.productId)
          .input('product_name', sql.NVarChar(255), item.name)
          .input('sku', sql.VarChar(100), item.sku)
          .input('quantity', sql.Int, item.quantity)
          .input('unit_price', sql.Decimal(10, 2), item.unitPrice)
          .input('total_price', sql.Decimal(10, 2), formatMoney(item.unitPrice * item.quantity))
          .query(`INSERT INTO OrderItems (order_id, product_id, product_name, sku, quantity, unit_price, total_price)
                  VALUES (@order_id, @product_id, @product_name, @sku, @quantity, @unit_price, @total_price)`);
      }

      // Record order status history
      await transaction.request()
        .input('order_id', sql.Int, orderId)
        .input('status', sql.VarChar(30), 'Pending')
        .query(`INSERT INTO OrderStatusHistory (order_id, status, changed_at) VALUES (@order_id, @status, GETDATE())`);

      // Clear cart
      await this.cartRepo.clearCart(userId, transaction);

      // Post-transaction async tasks (non-blocking)
      setImmediate(async () => {
        try {
          // Award loyalty points
          await this.loyaltyService.awardOrderPoints(userId, orderId, totals.total);

          // Deduct redeemed points if any
          if (options.pointsToRedeem && options.pointsToRedeem > 0) {
            const loyaltyRepo = new (await import('../loyalty/loyalty.repository')).LoyaltyRepository();
            await loyaltyRepo.redeemPoints(userId, options.pointsToRedeem, `Points redeemed for order #${orderId}`, orderId);
          }

          // Send confirmation email
          this.emailService.sendOrderConfirmation(userEmail, userName, orderNumber, totals.total).catch(() => {});

          // Send in-app notification
          await this.notificationService.createNotification(userId, {
            type: 'order_placed',
            title: 'Order Placed Successfully! 🎉',
            message: `Your order ${orderNumber} has been placed. Total: ₹${totals.total.toFixed(2)}`,
            referenceId: orderId,
          });

          // Audit log
          await this.auditService.log({
            userId,
            action: 'order_placed',
            module: 'checkout',
            recordId: orderId,
            newValues: { orderNumber, total: totals.total },
          });
        } catch (err: any) {
          console.error('[Checkout Post-Order] Error:', err.message);
        }
      });

      return { orderId, orderNumber, totals };
    });
  }

  private async calculateOrderTotals(
    cartItems: any[],
    couponCode?: string,
    pointsToRedeem?: number
  ) {
    const subtotal = formatMoney(
      cartItems.reduce((sum, item) => sum + (item.sale_price ?? item.price) * item.quantity, 0)
    );

    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const couponResult = await executeQuery(
        `SELECT * FROM Coupons WHERE code = @code AND is_active = 1 AND expiry_date > GETDATE()
         AND (usage_limit IS NULL OR used_count < usage_limit)
         AND (start_date IS NULL OR start_date <= GETDATE())`,
        { code: { type: sql.VarChar(50), value: couponCode.toUpperCase() } }
      );
      const coupon = couponResult.recordset[0];
      if (!coupon) throw new ApiError(400, 'Invalid or expired coupon code.');
      if (subtotal < coupon.min_order_amount) {
        throw new ApiError(400, `Minimum order amount for this coupon is ₹${coupon.min_order_amount}.`);
      }
      couponDiscount = calculateDiscount(subtotal, coupon.discount_type, coupon.discount_value, coupon.max_discount_amount);
      appliedCoupon = { code: coupon.code, discount: couponDiscount };
    }

    let pointsDiscount = 0;
    if (pointsToRedeem && pointsToRedeem > 0) {
      const { POINT_VALUE_IN_RUPEES, MAX_REDEEM_PERCENT } = await import('../../core/constants/customer.constants');
      const maxDiscount = subtotal * MAX_REDEEM_PERCENT;
      pointsDiscount = Math.min(pointsToRedeem * POINT_VALUE_IN_RUPEES, maxDiscount);
    }

    const discount = formatMoney(couponDiscount + pointsDiscount);
    const subtotalAfterDiscount = formatMoney(subtotal - discount);
    const shippingFee = subtotalAfterDiscount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const tax = formatMoney(subtotalAfterDiscount * TAX_RATE);
    const total = formatMoney(subtotalAfterDiscount + shippingFee + tax);

    return { subtotal, discount, couponDiscount, pointsDiscount, shippingFee, tax, total, appliedCoupon };
  }
}
