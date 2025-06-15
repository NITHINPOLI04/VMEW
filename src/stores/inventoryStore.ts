import { create } from 'zustand';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../utils/api';
import { useAuthStore } from './authStore';
import { InventoryItem } from '../types/index';

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
      
      const inventory = await getInventory(financialYear, token);
      
      set({ inventory, loading: false });
      return inventory;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch inventory';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  addInventoryItem: async (item) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const newItem = await createInventoryItem(item, token);
      
      set((state) => ({
        inventory: [...state.inventory, newItem],
        loading: false,
      }));
      
      return newItem;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add inventory item';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  updateInventoryItem: async (id, item) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const updatedItem = await updateInventoryItem(id, item, token);
      
      set((state) => ({
        inventory: state.inventory.map((invItem) => 
          invItem.id === id ? updatedItem : invItem
        ),
        loading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update inventory item';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  deleteInventoryItem: async (id) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await deleteInventoryItem(id, token);
      
      set((state) => ({
        inventory: state.inventory.filter((item) => item.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete inventory item';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  clearInventory: () => {
    set({ inventory: [], error: null });
  },
}));