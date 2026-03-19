import { create } from 'zustand';
import { signup, login } from '../utils/api';

interface AuthState {
  user: { userId: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isInitializing: boolean;
  error: string | null;
  checkAuth: () => void;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  isInitializing: true,
  error: null,

  checkAuth: () => {
    const token = sessionStorage.getItem('token');
    const userJson = sessionStorage.getItem('user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          isInitializing: false 
        });
      } catch (error) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        set({ isInitializing: false });
      }
    } else {
      set({ isInitializing: false });
    }
  },
  
  signup: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { token, userId, email: userEmail } = await signup(email, password);
      const user = { userId, email: userEmail };
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      set({ 
        user, 
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
    for (let i = 0; i < 3; i++) {
      try {
        set({ loading: true, error: null });
        const { token, userId, email: userEmail } = await login(email, password);
        const user = { userId, email: userEmail };
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        set({ 
          user, 
          token,
          isAuthenticated: true, 
          loading: false 
        });
        return; // Exit on success
      } catch (error: any) {
        if (i === 2) {
          const errorMessage = error.message || 'Failed to log in after retries';
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // 2, 4, 6 seconds
      }
    }
  },
  
  logout: async () => {
    try {
      set({ loading: true, error: null });
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
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