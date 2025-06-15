import { create } from 'zustand';
import { signup, login } from '../utils/api';

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
      const { token, userId, email: userEmail } = await signup(email, password);
      localStorage.setItem('token', token);
      set({ 
        user: { userId, email: userEmail }, 
        token,
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign up';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { token, userId, email: userEmail } = await login(email, password);
      localStorage.setItem('token', token);
      set({ 
        user: { userId, email: userEmail }, 
        token,
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to log in';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  logout: async () => {
    try {
      set({ loading: true, error: null });
      localStorage.removeItem('token');
      set({ 
        user: null, 
        token: null,
        isAuthenticated: false, 
        loading: false 
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to log out';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  }
}));