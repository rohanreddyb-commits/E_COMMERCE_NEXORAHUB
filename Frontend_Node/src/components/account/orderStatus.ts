import type { OrderStatus } from '@/types/api';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

/** Badge colouring per backend ORDER_STATUS value. */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  Pending: 'warning',
  Confirmed: 'accent',
  Processing: 'accent',
  Packed: 'accent',
  Shipped: 'accent',
  'Out for Delivery': 'accent',
  Delivered: 'success',
  Cancelled: 'danger',
  Returned: 'danger',
  Refunded: 'neutral',
};

export const ORDER_STATUS_ICON: Record<OrderStatus, string> = {
  Pending: 'schedule',
  Confirmed: 'task_alt',
  Processing: 'conveyor_belt',
  Packed: 'inventory_2',
  Shipped: 'local_shipping',
  'Out for Delivery': 'delivery_truck_speed',
  Delivered: 'check_circle',
  Cancelled: 'cancel',
  Returned: 'assignment_return',
  Refunded: 'currency_exchange',
};

/** Statuses the customer can filter by, in fulfilment order. */
export const FILTERABLE_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
];

/** Mirrors CANCELLABLE_ORDER_STATUSES in the backend constants. */
export const CANCELLABLE: OrderStatus[] = ['Pending', 'Confirmed', 'Processing'];

export const isCancellable = (status: OrderStatus): boolean => CANCELLABLE.includes(status);
