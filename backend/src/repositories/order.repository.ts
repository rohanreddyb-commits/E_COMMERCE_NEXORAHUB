import { executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import { Order, OrderItem } from '../interfaces/order.interface';

export class OrderRepository {
  async findAll(page = 1, limit = 10, search?: string): Promise<{ data: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM Orders o
      JOIN Users u ON o.user_id = u.user_id
    `;
    let dataQuery = `
      SELECT o.*, u.first_name + ' ' + u.last_name as customer_name
      FROM Orders o
      JOIN Users u ON o.user_id = u.user_id
    `;
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };

    if (search) {
      countQuery += ` WHERE o.order_number LIKE @search OR u.first_name LIKE @search OR u.last_name LIKE @search`;
      dataQuery += ` WHERE o.order_number LIKE @search OR u.first_name LIKE @search OR u.last_name LIKE @search`;
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }

    dataQuery += ` ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async findById(id: number): Promise<any | null> {
    const orderQuery = `
      SELECT o.*, u.first_name + ' ' + u.last_name as customer_name,
             sa.title as address_title, sa.street, sa.city, sa.state, sa.postal_code, sa.country, sa.phone
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.user_id
      LEFT JOIN Addresses sa ON o.shipping_address_id = sa.address_id
      WHERE o.order_id = @id
    `;
    const itemsQuery = `
      SELECT oi.*, p.name as product_name, p.sku
      FROM OrderItems oi
      LEFT JOIN Products p ON oi.product_id = p.product_id
      WHERE oi.order_id = @id
    `;
    const paymentQuery = `
      SELECT transaction_id, order_id, gateway_transaction_id, amount, payment_method, status as payment_status, created_at
      FROM Transactions WHERE order_id = @id
    `;

    const [orderResult, itemsResult, paymentResult] = await Promise.all([
      executeQuery(orderQuery, { id: { type: sql.Int, value: id } }),
      executeQuery(itemsQuery, { id: { type: sql.Int, value: id } }),
      executeQuery(paymentQuery, { id: { type: sql.Int, value: id } })
    ]);

    const order = orderResult.recordset[0];
    if (!order) return null;

    return {
      order_id: order.order_id,
      user_id: order.user_id,
      shipping_address_id: order.shipping_address_id,
      billing_address_id: order.billing_address_id,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      coupon_code: order.coupon_code || null,
      order_status: order.order_status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      customerName: order.customer_name,
      address: {
        title: order.address_title || 'Home',
        street: order.street || '',
        city: order.city || '',
        state: order.state || '',
        postal_code: order.postal_code || '',
        country: order.country || '',
        phone: order.phone || ''
      },
      items: itemsResult.recordset.map((item: any) => ({
        itemId: item.order_item_id,
        productId: item.product_id,
        name: item.product_name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      })),
      payment: paymentResult.recordset[0] ? {
        transactionId: paymentResult.recordset[0].gateway_transaction_id,
        method: paymentResult.recordset[0].payment_method,
        status: paymentResult.recordset[0].payment_status,
        date: paymentResult.recordset[0].created_at
      } : null
    };
  }

  async updateStatus(id: number, orderStatus: string, paymentStatus: string): Promise<boolean> {
    const query = `
      UPDATE Orders 
      SET order_status = @orderStatus, 
          payment_status = @paymentStatus, 
          updated_at = GETDATE() 
      WHERE order_id = @id
    `;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
      orderStatus: { type: sql.VarChar, value: orderStatus },
      paymentStatus: { type: sql.VarChar, value: paymentStatus }
    });
    return result.rowsAffected[0] > 0;
  }
}
