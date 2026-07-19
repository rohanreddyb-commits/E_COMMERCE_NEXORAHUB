export interface Customer {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Banned';
  created_at: Date;
  last_login?: Date;
  total_orders?: number;
  total_spent?: number;
}
