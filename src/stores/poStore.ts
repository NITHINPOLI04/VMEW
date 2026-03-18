import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { PurchaseOrderFormData, PurchaseOrder } from '../types/index';
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from '../utils/api';

interface POState {
    purchaseOrders: PurchaseOrder[];
    loading: boolean;
    error: string | null;
    fetchPOs: (year: string) => Promise<PurchaseOrder[]>;
    fetchPO: (id: string) => Promise<PurchaseOrder>;
    createPO: (po: PurchaseOrderFormData) => Promise<PurchaseOrder>;
    updatePO: (id: string, po: PurchaseOrderFormData) => Promise<PurchaseOrder>;
    deletePO: (id: string) => Promise<void>;
    clearPOs: () => void;
}

export const usePOStore = create<POState>((set) => ({
    purchaseOrders: [],
    loading: false,
    error: null,

    fetchPOs: async (year: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const purchaseOrders = await getPurchaseOrders(year, token);
            set({ purchaseOrders, loading: false });
            return purchaseOrders;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchPO: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const po = await getPurchaseOrderById(id, token);
            set({ loading: false });
            return po;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    createPO: async (poData: PurchaseOrderFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const newPO = await createPurchaseOrder(poData, token);
            set((state) => ({
                purchaseOrders: [...state.purchaseOrders, newPO],
                loading: false,
            }));
            return newPO;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updatePO: async (id: string, poData: PurchaseOrderFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const updatedPO = await updatePurchaseOrder(id, poData, token);
            set((state) => ({
                purchaseOrders: state.purchaseOrders.map((p) => (p._id === id ? updatedPO : p)),
                loading: false,
            }));
            return updatedPO;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deletePO: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            await deletePurchaseOrder(id, token);
            set((state) => ({
                purchaseOrders: state.purchaseOrders.filter((p) => p._id !== id),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    clearPOs: () => {
        set({ purchaseOrders: [], error: null });
    },
}));
