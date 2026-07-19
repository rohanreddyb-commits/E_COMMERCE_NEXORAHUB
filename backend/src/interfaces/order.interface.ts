export interface Order {
  order_id: number;
  order_number: string;
  user_id: number;
  shipping_address_id?: number;
  billing_address_id?: number;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  coupon_id?: number;
  order_status: 'Pending' | 'Confirmed' | 'Processing' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded';
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  payment_method?: string;
  tracking_number?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
