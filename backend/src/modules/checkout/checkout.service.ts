import { executeQuery, runInTransaction } from '../../database/db';
import sql from 'mssql';
import { CustomerCartRepository } from '../cart/customer.cart.repository';
import { CustomerAddressRepository } from '../address/customer.address.repository';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationService } from '../notifications/notification.service';
import { EmailService } from '../../shared/email/email.service';
import { AuditService } from '../../shared/audit/audit.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../config/logger';
import { formatMoney, generateOrderNumber, calculateDiscount } from '../../common/utils/helpers.util';
import {
  POINT_VALUE_IN_RUPEES,
  MAX_REDEEM_PERCENT,
} from '../../core/constants/customer.constants';

const SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 49;
const TAX_RATE = 0.18;

/** The coupon fields pricing depends on — shared by preview and place-order. */
interface CouponPricing {
  coupon_id: number;
  code: string;
  discount_type: 'Percentage' | 'Fixed' | 'Free Shipping';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
}

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
   * Idempotent preview — does NOT create an order.
   *
   * Point redemption is clamped to the customer's real balance here too, so
   * the UI can never display a total the checkout will refuse to honour.
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

    const points = await this.resolveRedeemablePoints(userId, options.pointsToRedeem);
    return this.calculateOrderTotals(cartItems, options.couponCode, points);
  }

  /**
   * Reject a redemption the customer cannot fund.
   *
   * Previously the requested figure was used directly and the balance was only
   * checked afterwards, in a post-commit setImmediate whose rejection was
   * swallowed — so any customer could claim the maximum discount with a zero
   * balance. Validation now happens before anything is priced.
   */
  private async resolveRedeemablePoints(
    userId: number,
    requested?: number
  ): Promise<number> {
    if (!requested || requested <= 0) return 0;
    if (!Number.isInteger(requested)) {
      throw new ApiError(400, 'Points to redeem must be a whole number.');
    }

    const result = await executeQuery(
      `SELECT points_balance FROM RewardPoints WHERE user_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );
    const balance: number = result.recordset[0]?.points_balance ?? 0;

    if (requested > balance) {
      throw new ApiError(
        400,
        `Insufficient reward points. You requested ${requested} but have ${balance} available.`
      );
    }
    return requested;
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
                  INNER JOIN Inventory i WITH (UPDLOCK, ROWLOCK) ON p.product_id = i.product_id
                  WHERE p.product_id = @productId`);

        const product = lockResult.recordset[0];
        // An INNER JOIN means "no row" now covers both a deleted product and a
        // product with no Inventory record. Previously the LEFT JOIN produced
        // stock_quantity = null, and `null < quantity` is false in JS, so
        // unstocked products passed the check and were sold indefinitely.
        if (!product) {
          throw new ApiError(400, `Product '${item.name}' is no longer available for purchase.`);
        }
        if (product.status !== 'Active') throw new ApiError(400, `Product '${item.name}' is unavailable.`);

        const stock = Number(product.stock_quantity);
        if (!Number.isFinite(stock) || stock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for '${item.name}'. Only ${Number.isFinite(stock) ? stock : 0} available.`
          );
        }

        verifiedItems.push({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: formatMoney(product.sale_price ?? product.price),
          name: product.name,
          sku: product.sku,
        });
      }

      // ─── Reward points: claim inside the transaction ───────────────────────
      // The balance is read under UPDLOCK and debited here, so the discount and
      // the deduction either both happen or neither does.
      let redeemedPoints = 0;
      if (options.pointsToRedeem && options.pointsToRedeem > 0) {
        const balanceResult = await transaction.request()
          .input('user_id', sql.Int, userId)
          .query(`SELECT points_balance FROM RewardPoints WITH (UPDLOCK, ROWLOCK)
                  WHERE user_id = @user_id`);

        const balance: number = balanceResult.recordset[0]?.points_balance ?? 0;
        if (options.pointsToRedeem > balance) {
          throw new ApiError(
            400,
            `Insufficient reward points. You requested ${options.pointsToRedeem} but have ${balance} available.`
          );
        }
        redeemedPoints = options.pointsToRedeem;
      }

      // ─── Coupon: atomic claim ──────────────────────────────────────────────
      // A single guarded UPDATE both validates and consumes the coupon. Zero
      // rows affected means it expired or hit its cap between preview and now,
      // which closes the read-then-increment race.
      let couponId: number | null = null;
      let claimedCoupon: any = null;
      if (options.couponCode) {
        const claim = await transaction.request()
          .input('code', sql.VarChar(50), options.couponCode.toUpperCase())
          .query(`UPDATE Coupons WITH (UPDLOCK, ROWLOCK)
                  SET used_count = used_count + 1
                  OUTPUT inserted.coupon_id, inserted.code, inserted.discount_type,
                         inserted.discount_value, inserted.max_discount_amount,
                         inserted.min_order_amount
                  WHERE code = @code
                    AND is_active = 1
                    AND expiry_date > GETDATE()
                    AND (start_date IS NULL OR start_date <= GETDATE())
                    AND (usage_limit IS NULL OR used_count < usage_limit)`);

        claimedCoupon = claim.recordset[0];
        if (!claimedCoupon) {
          throw new ApiError(400, 'This coupon is invalid, expired, or fully redeemed.');
        }
        couponId = claimedCoupon.coupon_id;
      }

      // Totals are computed from the coupon row we actually claimed, not from
      // a separate unsynchronised read.
      const totals = this.computeTotals(cartItems, claimedCoupon, redeemedPoints);

      // ─── Deduct inventory, asserting the row count ─────────────────────────
      for (const item of verifiedItems) {
        const deduct = await transaction.request()
          .input('productId', sql.Int, item.productId)
          .input('qty', sql.Int, item.quantity)
          .query(`UPDATE Inventory SET quantity = quantity - @qty, updated_at = GETDATE()
                  WHERE product_id = @productId AND quantity >= @qty`);

        // Without this assertion a lost update silently ships unstocked goods.
        if (!deduct.rowsAffected[0]) {
          throw new ApiError(400, `Insufficient stock for '${item.name}'. Please review your cart.`);
        }
      }

      // ─── Debit reward points ───────────────────────────────────────────────
      if (redeemedPoints > 0) {
        const debit = await transaction.request()
          .input('user_id', sql.Int, userId)
          .input('points', sql.Int, redeemedPoints)
          .query(`UPDATE RewardPoints SET points_balance = points_balance - @points,
                         updated_at = GETDATE()
                  WHERE user_id = @user_id AND points_balance >= @points`);

        if (!debit.rowsAffected[0]) {
          throw new ApiError(400, 'Insufficient reward points balance.');
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

      // ─── Per-customer coupon ledger ────────────────────────────────────────
      // UQ_CouponRedemptions_Coupon_User enforces one redemption per customer
      // at the database level, which no amount of concurrency can bypass.
      if (couponId) {
        try {
          await transaction.request()
            .input('coupon_id', sql.Int, couponId)
            .input('user_id', sql.Int, userId)
            .input('order_id', sql.Int, orderId)
            .query(`INSERT INTO CouponRedemptions (coupon_id, user_id, order_id, redeemed_at)
                    VALUES (@coupon_id, @user_id, @order_id, GETDATE())`);
        } catch (err: any) {
          // 2627/2601 = unique constraint violation.
          if (err?.number === 2627 || err?.number === 2601) {
            throw new ApiError(400, 'You have already used this coupon.');
          }
          throw err;
        }
      }

      // ─── Reward-point ledger entry (balance was debited above) ─────────────
      if (redeemedPoints > 0) {
        await transaction.request()
          .input('user_id', sql.Int, userId)
          .input('points', sql.Int, -redeemedPoints)
          .input('description', sql.NVarChar(255), `Points redeemed for order ${orderNumber}`)
          .input('reference_id', sql.Int, orderId)
          .query(`INSERT INTO RewardPointsHistory
                    (user_id, points, type, description, reference_id, reference_type, created_at)
                  VALUES (@user_id, @points, 'redeemed', @description, @reference_id, 'order', GETDATE())`);
      }

      // Clear cart
      await this.cartRepo.clearCart(userId, transaction);

      // ─── Post-commit side effects ──────────────────────────────────────────
      // Notifications and email only. Nothing here changes financial state:
      // every balance, stock level and coupon count was settled inside the
      // transaction above, so a failure at this point cannot leave the order
      // in an inconsistent or under-charged state.
      setImmediate(async () => {
        try {
          await this.loyaltyService.awardOrderPoints(userId, orderId, totals.total);

          this.emailService
            .sendOrderConfirmation(userEmail, userName, orderNumber, totals.total)
            .catch((err: Error) =>
              logger.warn(`[Checkout] Order confirmation email failed: ${err.message}`)
            );

          await this.notificationService.createNotification(userId, {
            type: 'order_placed',
            title: 'Order Placed Successfully! 🎉',
            message: `Your order ${orderNumber} has been placed. Total: ₹${totals.total.toFixed(2)}`,
            referenceId: orderId,
          });

          await this.auditService.log({
            userId,
            action: 'order_placed',
            module: 'checkout',
            recordId: orderId,
            newValues: {
              orderNumber,
              total: totals.total,
              couponId,
              pointsRedeemed: redeemedPoints,
            },
          });
        } catch (err: any) {
          logger.error(
            `[Checkout] Post-order side effects failed for order ${orderId}: ${err.message}`
          );
        }
      });

      return { orderId, orderNumber, totals };
    });
  }

  /**
   * Preview pricing. Reads the coupon without consuming it; placeOrder uses
   * computeTotals() against the coupon row it atomically claimed, so the two
   * paths share one pricing implementation and cannot drift.
   */
  private async calculateOrderTotals(
    cartItems: any[],
    couponCode?: string,
    pointsToRedeem?: number
  ) {
    let coupon: CouponPricing | null = null;

    if (couponCode) {
      const couponResult = await executeQuery(
        `SELECT coupon_id, code, discount_type, discount_value, max_discount_amount, min_order_amount
         FROM Coupons WHERE code = @code AND is_active = 1 AND expiry_date > GETDATE()
         AND (usage_limit IS NULL OR used_count < usage_limit)
         AND (start_date IS NULL OR start_date <= GETDATE())`,
        { code: { type: sql.VarChar(50), value: couponCode.toUpperCase() } }
      );
      coupon = couponResult.recordset[0] || null;
      if (!coupon) throw new ApiError(400, 'Invalid or expired coupon code.');
    }

    return this.computeTotals(cartItems, coupon, pointsToRedeem ?? 0);
  }

  /**
   * Single source of truth for order pricing. Pure — no I/O — so the numbers
   * quoted at preview are produced by exactly the same code that prices the
   * committed order.
   *
   * Prices always come from the joined product row, never from the client.
   */
  private computeTotals(
    cartItems: any[],
    coupon: CouponPricing | null,
    pointsToRedeem: number
  ) {
    const subtotal = formatMoney(
      cartItems.reduce((sum, item) => sum + (item.sale_price ?? item.price) * item.quantity, 0)
    );

    let couponDiscount = 0;
    let appliedCoupon: { code: string; discount: number } | null = null;

    if (coupon) {
      if (subtotal < Number(coupon.min_order_amount ?? 0)) {
        throw new ApiError(
          400,
          `Minimum order amount for this coupon is ₹${coupon.min_order_amount}.`
        );
      }
      couponDiscount = calculateDiscount(
        subtotal,
        coupon.discount_type,
        Number(coupon.discount_value),
        coupon.max_discount_amount === null ? null : Number(coupon.max_discount_amount)
      );
      appliedCoupon = { code: coupon.code, discount: couponDiscount };
    }

    // Point value is capped at MAX_REDEEM_PERCENT of subtotal. The caller is
    // responsible for having verified the customer holds these points.
    let pointsDiscount = 0;
    if (pointsToRedeem > 0) {
      const maxDiscount = subtotal * MAX_REDEEM_PERCENT;
      pointsDiscount = formatMoney(Math.min(pointsToRedeem * POINT_VALUE_IN_RUPEES, maxDiscount));
    }

    // Discounts can never exceed the subtotal, so a total can never go
    // negative and a refund can never exceed what was charged.
    const discount = formatMoney(Math.min(couponDiscount + pointsDiscount, subtotal));
    const subtotalAfterDiscount = formatMoney(Math.max(subtotal - discount, 0));
    const shippingFee = subtotalAfterDiscount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const tax = formatMoney(subtotalAfterDiscount * TAX_RATE);
    const total = formatMoney(subtotalAfterDiscount + shippingFee + tax);

    return {
      subtotal,
      discount,
      couponDiscount,
      pointsDiscount,
      pointsRedeemed: pointsToRedeem,
      shippingFee,
      tax,
      total,
      appliedCoupon,
    };
  }
}
