import { create } from 'zustand';
import { api } from '../utils/api';

interface Product {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  sku: string;
  status: string;
  category_id: number;
  created_at: string;
}

interface ProductState {
  products: Product[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchProducts: (page?: number, limit?: number, search?: string) => Promise<void>;
  createProduct: (data: any) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchProducts: async (page = 1, limit = 10, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response: any = await api.get(`/products?${queryParams}`);
      set({ 
        products: response.data?.data || [], 
        total: response.data?.total || 0,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/products', data);
      set({ isLoading: false });
      // Fetch again to update list
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/products/${id}`);
      set((state) => ({
        products: state.products.filter(p => p.product_id !== id),
        total: state.total - 1,
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
