import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { QuotationFormData, Quotation } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

const getHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

interface QuotationState {
    quotations: Quotation[];
    loading: boolean;
    error: string | null;
    fetchQuotations: (year: string) => Promise<Quotation[]>;
    fetchQuotation: (id: string) => Promise<Quotation>;
    createQuotation: (quotation: QuotationFormData) => Promise<Quotation>;
    updateQuotation: (id: string, quotation: QuotationFormData) => Promise<void>;
    deleteQuotation: (id: string) => Promise<void>;
    clearQuotations: () => void;
}

export const useQuotationStore = create<QuotationState>((set) => ({
    quotations: [],
    loading: false,
    error: null,

    fetchQuotations: async (year: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/quotation/${year}`, {
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to fetch quotations');
            const quotations = await response.json();

            set({ quotations, loading: false });
            return quotations;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchQuotation: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/quotation/id/${id}`, {
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to fetch quotation');
            const quotation = await response.json();

            set({ loading: false });
            return quotation;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    createQuotation: async (quotationData: QuotationFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/quotation`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify(quotationData)
            });
            if (!response.ok) throw new Error('Failed to create quotation');
            const newQuotation = await response.json();

            set((state) => ({
                quotations: [...state.quotations, newQuotation],
                loading: false,
            }));
            return newQuotation;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateQuotation: async (id: string, quotationData: QuotationFormData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/quotation/${id}`, {
                method: 'PUT',
                headers: getHeaders(token),
                body: JSON.stringify(quotationData)
            });
            if (!response.ok) throw new Error('Failed to update quotation');
            const updatedQuotation = await response.json();

            set((state) => ({
                quotations: state.quotations.map((q) => (q._id === id ? updatedQuotation : q)),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteQuotation: async (id: string) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/quotation/${id}`, {
                method: 'DELETE',
                headers: getHeaders(token)
            });
            if (!response.ok) throw new Error('Failed to delete quotation');

            set((state) => ({
                quotations: state.quotations.filter((q) => q._id !== id),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    clearQuotations: () => {
        set({ quotations: [], error: null });
    },
}));
