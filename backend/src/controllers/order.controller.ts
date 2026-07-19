import { Request, Response } from 'express';
import { OrderRepository } from '../repositories/order.repository';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export class OrderController {
  private orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  getAllOrders = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const orders = await this.orderRepository.findAll(page, limit, search);
    
    // Format response to match the frontend expectations
    // Frontend expects: { success: true, orders: [...] }
    const formattedOrders = orders.data.map((order: any) => ({
      orderId: order.order_id,
      customerName: order.customer_name || `Customer #${order.user_id}`,
      total: order.total_amount,
      orderStatus: order.order_status,
      paymentStatus: order.payment_status,
      date: order.created_at
    }));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
      total: orders.total
    });
  };

  getOrderById = async (req: Request, res: Response) => {
    const order = await this.orderRepository.findById(Number(req.params.id));
    if (!order) throw new ApiError(404, 'Order not found');
    res.status(200).json({
      success: true,
      order
    });
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    const { orderStatus, paymentStatus } = req.body;
    const success = await this.orderRepository.updateStatus(
      Number(req.params.id),
      orderStatus,
      paymentStatus
    );
    if (!success) throw new ApiError(404, 'Order not found');
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully'
    });
  };
}
