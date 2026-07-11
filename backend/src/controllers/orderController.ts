import { Response, NextFunction } from "express";
import { OrderService } from "../services/orderService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/customError";

export class OrderController {
  static async placeOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { addressId, couponCode, paymentMethod } = req.body;

      const result = await OrderService.placeOrder(
        userId,
        parseInt(addressId, 10),
        couponCode || null,
        paymentMethod
      );

      res.status(201).json({
        success: true,
        message: "Order placed successfully.",
        orderId: result.orderId,
        transactionId: result.transactionId,
        total: result.totalAmount,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const orders = await OrderService.getCustomerOrders(userId);

      res.status(200).json({
        success: true,
        orders: orders.map((o) => ({
          orderId: o.order_id,
          total: o.total_amount,
          status: o.order_status,
          date: o.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, roleId } = req.user!;
      const orderId = parseInt(req.params.id, 10);
      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID.");
      }

      const order = await OrderService.getOrderDetails(orderId, userId, roleId);
      res.status(200).json({
        success: true,
        order,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Order Management Handlers ---

  static async getAdminOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await OrderService.getAdminOrders();
      res.status(200).json({
        success: true,
        orders: orders.map((o) => ({
          orderId: o.order_id,
          customerName: o.customer_name,
          total: o.total_amount,
          orderStatus: o.order_status,
          paymentStatus: o.payment_status,
          date: o.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID.");
      }

      const { orderStatus, paymentStatus } = req.body;
      await OrderService.updateOrderStatus(orderId, orderStatus, paymentStatus);

      res.status(200).json({
        success: true,
        message: "Order updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}
