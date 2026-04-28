import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { DeliveryChallanFormData, DeliveryChallan } from '../types/index';
import { getDCs, getDCById, createDCApi, updateDCApi, deleteDCApi } from '../utils/api';

interface DCState {
    deliveryChallans: DeliveryChallan[];
    loading: boolean;
    error: string | null;
    fetchDCs: (year: string) => Promise<DeliveryChallan[]>;
    fetchDC: (id: string) => Promise<DeliveryChallan>;
    createDC: (dc: DeliveryChallanFormData) => Promise<DeliveryChallan>;
    updateDC: (id: string, dc: DeliveryChallanFormData) => Promise<void>;
    deleteDC: (id: string) => Promise<void>;
    clearDCs: () => void;
}

export const useDCStore = create<DCState>((set) => ({
    deliveryChallans: [],
    loading: false,
    error: null,

    fetchDCs: async (year: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const deliveryChallans = await getDCs(year, token);
            set({ deliveryChallans, loading: false });
            return deliveryChallans;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchDC: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const dc = await getDCById(id, token);
            set({ loading: false });
            return dc;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    createDC: async (dcData: DeliveryChallanFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const newDC = await createDCApi(dcData, token);
            set((state) => ({
                deliveryChallans: [...state.deliveryChallans, newDC],
                loading: false,
            }));
            return newDC;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateDC: async (id: string, dcData: DeliveryChallanFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const updatedDC = await updateDCApi(id, dcData, token);
            set((state) => ({
                deliveryChallans: state.deliveryChallans.map((d) => (d._id === id ? updatedDC : d)),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteDC: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            await deleteDCApi(id, token);
            set((state) => ({
                deliveryChallans: state.deliveryChallans.filter((d) => d._id !== id),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    clearDCs: () => {
        set({ deliveryChallans: [], error: null });
    },
}));
