import { OrderRepository, OrderDB } from "../repositories/orderRepository";
import { CartRepository } from "../repositories/cartRepository";
import { ProductRepository } from "../repositories/productRepository";
import { AddressService } from "./addressService";
import { CouponService } from "./couponService";
import sql from "mssql";
import { runInTransaction } from "../database/db";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/customError";

export class OrderService {
  static async placeOrder(
    userId: number,
    addressId: number,
    couponCode: string | null,
    paymentMethod: string
  ): Promise<{ orderId: number; transactionId: string; totalAmount: number }> {
    // 1. Validate shipping address ownership and existence
    await AddressService.getAddressById(addressId, userId);

    // 2. Perform the checkout steps inside a database transaction block
    return runInTransaction(async (transaction) => {
      // 2.1 Fetch items inside the user's cart
      const cartItems = await CartRepository.getCartByUser(userId);
      if (cartItems.length === 0) {
        throw new BadRequestError("Cannot place order. Your shopping cart is empty.");
      }

      let subtotal = 0;
      const verifiedItems: { productId: number; quantity: number; unitPrice: number; newStock: number }[] = [];

      // 2.2 Verify stock levels and calculate prices
      for (const item of cartItems) {
        // Query product details with UPDLOCK to lock rows during transactional edits
        const query = `
          SELECT product_id, price, stock_quantity, status 
          FROM Products WITH (UPDLOCK) 
          WHERE product_id = @productId;
        `;
        const result = await transaction.request()
          .input("productId", sql.Int(), item.product_id)
          .query(query);

        if (result.recordset.length === 0) {
          throw new NotFoundError(`Product '${item.name}' no longer exists.`);
        }

        const product = result.recordset[0];

        if (product.status !== "Active") {
          throw new BadRequestError(`Product '${item.name}' is no longer active and cannot be purchased.`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for '${item.name}'. Only ${product.stock_quantity} units available.`
          );
        }

        const unitPrice = Number(product.price);
        subtotal += unitPrice * item.quantity;

        verifiedItems.push({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice,
          newStock: product.stock_quantity - item.quantity,
        });
      }

      // 2.3 Process and validate Coupon discount
      let discountAmount = 0;
      let appliedCouponCode = null;

      if (couponCode) {
        try {
          const validatedCoupon = await CouponService.validateCoupon(couponCode, subtotal);
          discountAmount = validatedCoupon.calculatedDiscount;
          appliedCouponCode = validatedCoupon.code;
        } catch (err: any) {
          throw new BadRequestError(`Coupon application failed: ${err.message}`);
        }
      }

      const totalAmount = Number((subtotal - discountAmount).toFixed(2));
      const orderStatus = "Paid"; // Order transitions directly to Paid after simulated checkout
      const paymentStatus = "Success";

      // 2.4 Deduct product inventory
      for (const item of verifiedItems) {
        await ProductRepository.updateStock(item.productId, item.newStock, transaction);
      }

      // 2.5 Insert Order record
      const orderId = await OrderRepository.createOrder(
        userId,
        addressId,
        subtotal,
        discountAmount,
        totalAmount,
        appliedCouponCode,
        orderStatus,
        paymentStatus,
        transaction
      );

      // 2.6 Insert OrderItems records
      for (const item of verifiedItems) {
        await OrderRepository.createOrderItem(
          orderId,
          item.productId,
          item.quantity,
          item.unitPrice,
          Number((item.unitPrice * item.quantity).toFixed(2)),
          transaction
        );
      }

      // 2.7 Payment simulation log insertion
      const transactionId = `TXN_SIM_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
      await OrderRepository.createPayment(
        orderId,
        transactionId,
        totalAmount,
        paymentMethod || "Simulated Card",
        paymentStatus,
        transaction
      );

      // 2.8 Empty user cart database records
      await CartRepository.clearCart(userId, transaction);

      return {
        orderId,
        transactionId,
        totalAmount,
      };
    });
  }

  static async getCustomerOrders(userId: number): Promise<OrderDB[]> {
    return OrderRepository.getOrdersByUser(userId);
  }

  static async getOrderDetails(orderId: number, userId: number, roleId: number): Promise<any> {
    const order = await OrderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found.`);
    }

    // Role-based check: Customers can only view their own orders
    if (roleId !== 1 && order.user_id !== userId) {
      throw new ForbiddenError("Access denied. You do not own this order.");
    }

    const items = await OrderRepository.getOrderItems(orderId);
    const payment = await OrderRepository.getPaymentInfo(orderId);
    const address = order.shipping_address_id
      ? await AddressService.getAddressById(order.shipping_address_id, order.user_id)
      : null;

    return {
      ...order,
      address,
      items: items.map((i) => ({
        itemId: i.order_item_id,
        productId: i.product_id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })),
      payment: payment ? {
        transactionId: payment.transaction_id,
        method: payment.payment_method,
        status: payment.payment_status,
        date: payment.created_at,
      } : null,
    };
  }

  // --- Admin Order Management Services ---

  static async getAdminOrders(): Promise<any[]> {
    return OrderRepository.getAllOrders();
  }

  static async updateOrderStatus(
    orderId: number,
    orderStatus: "Pending" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled",
    paymentStatus: "Pending" | "Success" | "Failed"
  ): Promise<void> {
    const order = await OrderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found.`);
    }

    const success = await OrderRepository.updateOrderStatus(orderId, orderStatus, paymentStatus);
    if (!success) {
      throw new BadRequestError("Failed to update order status.");
    }
  }
}
