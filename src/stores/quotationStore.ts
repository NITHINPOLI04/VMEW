import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { QuotationFormData, Quotation } from '../types/index';
import { getQuotations, getQuotationById, createQuotationApi, updateQuotationApi, deleteQuotationApi } from '../utils/api';

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

            const quotations = await getQuotations(year, token);
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

            const quotation = await getQuotationById(id, token);
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

            const newQuotation = await createQuotationApi(quotationData, token);
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

            const updatedQuotation = await updateQuotationApi(id, quotationData, token);
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

            await deleteQuotationApi(id, token);
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
