export interface Review {
  review_id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title?: string;
  comment?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: Date;
  updated_at: Date;
  customer_name?: string;
  product_name?: string;
}
