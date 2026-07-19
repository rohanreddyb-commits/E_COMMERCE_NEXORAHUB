import { create } from 'zustand';
import { api } from '../utils/api';

interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    try {
      const response: any = await api.post('/auth/login', credentials);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      set({ 
        user: response.user, 
        token: response.token, 
        isAuthenticated: true 
      });
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      set({ isLoading: false });
    }
  }
}));
