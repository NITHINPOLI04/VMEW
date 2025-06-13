import { create } from 'zustand';
import axios from 'axios';
import { useInvoiceStore } from './invoiceStore';
import { useInventoryStore } from './inventoryStore';
import { useTemplateStore } from './templateStore';

interface AuthState {
  user: { userId: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  
  signup: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post('/api/auth/signup', { email, password });
      const { token, userId, email: userEmail } = response.data;
      localStorage.setItem('token', token);
      set({ 
        user: { userId, email: userEmail }, 
        token,
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message, 
        loading: false 
      });
      throw error;
    }
  },
  
  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, userId, email: userEmail } = response.data;
      localStorage.setItem('token', token);
      set({ 
        user: { userId, email: userEmail }, 
        token,
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message, 
        loading: false 
      });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      set({ loading: true });
      localStorage.removeItem('token');
      useInvoiceStore.getState().clearInvoices();
      useInventoryStore.getState().clearInventory();
      useTemplateStore.getState().clearTemplates();
      set({ 
        user: null, 
        token: null,
        isAuthenticated: false, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  }
}));