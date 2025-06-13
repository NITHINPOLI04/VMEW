import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import { InventoryItem } from '../types';

interface InventoryState {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  fetchInventory: (financialYear: string) => Promise<InventoryItem[]>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  clearInventory: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  inventory: [],
  loading: false,
  error: null,
  
  fetchInventory: async (financialYear: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.get(`/api/inventory/${financialYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Inventory API response:', response.data);
      
      const inventory: InventoryItem[] = Array.isArray(response.data)
        ? response.data.map((item: any) => ({
            ...item,
            id: item._id
          }))
        : [];
      
      set({ inventory, loading: false });
      return inventory;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  addInventoryItem: async (item) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post('/api/inventory', item, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newItem = { ...response.data, id: response.data._id } as InventoryItem;
      
      set((state) => ({
        inventory: [...state.inventory, newItem],
        loading: false,
      }));
      
      return newItem;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  updateInventoryItem: async (id, item) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.put(`/api/inventory/${id}`, item, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set((state) => ({
        inventory: state.inventory.map((invItem) => 
          invItem.id === id ? { ...invItem, ...item } : invItem
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  deleteInventoryItem: async (id) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.delete(`/api/inventory/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set((state) => ({
        inventory: state.inventory.filter((item) => item.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  clearInventory: () => {
    set({ inventory: [], error: null });
  },
}));