import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import { Letterhead, DefaultInfo } from '../types';

interface TemplateState {
  letterhead: Letterhead | null;
  defaultInfo: DefaultInfo | null;
  loading: boolean;
  error: string | null;
  fetchTemplateData: () => Promise<void>;
  updateLetterhead: (letterhead: Letterhead) => Promise<void>;
  updateDefaultInfo: (defaultInfo: DefaultInfo) => Promise<void>;
  clearTemplates: () => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  letterhead: null,
  defaultInfo: null,
  loading: true,
  error: null,
  
  fetchTemplateData: async () => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const letterheadResponse = await axios.get('/api/templates/letterhead', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const letterhead = letterheadResponse.data;
      
      const defaultInfoResponse = await axios.get('/api/templates/defaultInfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const defaultInfo = defaultInfoResponse.data;
      
      set({ letterhead, defaultInfo, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
    }
  },
  
  updateLetterhead: async (letterhead: Letterhead) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.put('/api/templates/letterhead', letterhead, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ letterhead, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  updateDefaultInfo: async (defaultInfo: DefaultInfo) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.put('/api/templates/defaultInfo', defaultInfo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ defaultInfo, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  clearTemplates: () => {
    set({ letterhead: null, defaultInfo: null, error: null });
  },
}));

// Initialize template data
useTemplateStore.getState().fetchTemplateData();