import { create } from 'zustand';
import { signup, login } from '../utils/api';

/**
 * Decodes a JWT payload without external libraries.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): { exp?: number; userId?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  // Add 30-second buffer so we don't use a token that's about to expire
  return Date.now() >= (payload.exp * 1000) - 30000;
}

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
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      // C4: Check if token has expired
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ isInitializing: false });
        return;
      }
      try {
        const user = JSON.parse(userJson);
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          isInitializing: false 
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
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
    try {
      set({ loading: true, error: null });
      const { token, userId, email: userEmail } = await login(email, password);
      const user = { userId, email: userEmail };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ 
        user, 
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
      localStorage.removeItem('user');
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