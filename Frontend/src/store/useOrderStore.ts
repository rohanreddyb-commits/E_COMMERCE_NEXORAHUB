import { create } from 'zustand';
import { api } from '../utils/api';

interface OrderState {
  orders: any[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchOrders: (page?: number, limit?: number, search?: string) => Promise<void>;
  updateOrderStatus: (id: number, status: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchOrders: async (page = 1, limit = 10, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response: any = await api.get(`/orders?${queryParams}`);
      set({ 
        orders: response.data.data, 
        total: response.data.total,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/orders/${id}/status`, { status });
      set((state) => ({
        orders: state.orders.map(order => 
          order.order_id === id ? { ...order, order_status: status } : order
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
