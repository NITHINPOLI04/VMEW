import { create } from 'zustand';
import { getTemplate, updateTemplate } from '../utils/api';
import { useAuthStore } from './authStore';
import { Letterhead, DefaultInfo } from '../types/index';

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
      
      const letterhead = await getTemplate('letterhead', token) as Letterhead | null;
      const defaultInfo = await getTemplate('defaultInfo', token) as DefaultInfo | null;
      
      set({ letterhead, defaultInfo, loading: false });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch templates';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  updateLetterhead: async (letterhead: Letterhead) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const updatedLetterhead = await updateTemplate('letterhead', letterhead, token) as Letterhead;
      
      set({ letterhead: updatedLetterhead, loading: false });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update letterhead';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  updateDefaultInfo: async (defaultInfo: DefaultInfo) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const updatedDefaultInfo = await updateTemplate('defaultInfo', defaultInfo, token) as DefaultInfo;
      
      set({ defaultInfo: updatedDefaultInfo, loading: false });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update default info';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  clearTemplates: () => {
    set({ letterhead: null, defaultInfo: null, error: null });
  },
}));