export interface Inventory {
  inventory_id: number;
  product_id: number;
  quantity: number;
  low_stock_threshold: number;
  reserved_quantity: number;
  last_restock_date?: Date;
  warehouse_location?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryHistory {
  history_id: number;
  inventory_id: number;
  change_amount: number;
  reason: 'Restock' | 'Sale' | 'Return' | 'Damage' | 'Adjustment';
  notes?: string;
  created_by?: number;
  created_at: Date;
}
