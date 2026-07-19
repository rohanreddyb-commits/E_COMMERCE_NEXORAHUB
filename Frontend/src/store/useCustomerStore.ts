import { create } from 'zustand';
import { api } from '../utils/api';

interface CustomerState {
  customers: any[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchCustomers: (page?: number, limit?: number, search?: string) => Promise<void>;
  updateCustomerStatus: (id: number, status: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchCustomers: async (page = 1, limit = 10, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response: any = await api.get(`/customers?${queryParams}`);
      set({ 
        customers: response.data.data, 
        total: response.data.total,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateCustomerStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/customers/${id}/status`, { status });
      set((state) => ({
        customers: state.customers.map(customer => 
          customer.user_id === id ? { ...customer, status } : customer
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
