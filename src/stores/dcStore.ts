import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { DeliveryChallanFormData, DeliveryChallan } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

const getHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

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

            const response = await fetch(`${API_URL}/dc/${year}`, {
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to fetch delivery challans');
            const deliveryChallans = await response.json();

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

            const response = await fetch(`${API_URL}/dc/id/${id}`, {
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to fetch delivery challan');
            const dc = await response.json();

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

            const response = await fetch(`${API_URL}/dc`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify(dcData)
            });
            if (!response.ok) throw new Error('Failed to create delivery challan');
            const newDC = await response.json();

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

            const response = await fetch(`${API_URL}/dc/${id}`, {
                method: 'PUT',
                headers: getHeaders(token),
                body: JSON.stringify(dcData)
            });
            if (!response.ok) throw new Error('Failed to update delivery challan');
            const updatedDC = await response.json();

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

            const response = await fetch(`${API_URL}/dc/${id}`, {
                method: 'DELETE',
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to delete delivery challan');

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
