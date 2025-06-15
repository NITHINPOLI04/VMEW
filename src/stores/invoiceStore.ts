import { create } from 'zustand';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, updatePaymentStatus } from '../utils/api';
import { useAuthStore } from './authStore';
import { InvoiceFormData, Invoice } from '../types/index';

interface InvoiceState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: (year: string) => Promise<Invoice[]>;
  fetchInvoice: (id: string) => Promise<Invoice>;
  createInvoice: (invoice: InvoiceFormData) => Promise<Invoice>;
  updateInvoice: (id: string, invoice: InvoiceFormData) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateInvoicePaymentStatus: (id: string, status: string) => Promise<void>;
  clearInvoices: () => void;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  loading: false,
  error: null,
  
  fetchInvoices: async (year: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const invoices = await getInvoices(year, token);
      
      set({ invoices, loading: false });
      return invoices;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch invoices';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  fetchInvoice: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const invoice = await getInvoiceById(id, token);
      
      set({ loading: false });
      return invoice;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch invoice';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  createInvoice: async (invoice: InvoiceFormData) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const newInvoice = await createInvoice(invoice, token);
      
      set((state) => ({
        invoices: [...state.invoices, newInvoice],
        loading: false,
      }));
      return newInvoice;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create invoice';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  updateInvoice: async (id: string, invoice: InvoiceFormData) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const updatedInvoice = await updateInvoice(id, invoice, token);
      
      set((state) => ({
        invoices: state.invoices.map((inv) => (inv._id === id ? updatedInvoice : inv)),
        loading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update invoice';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  deleteInvoice: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await deleteInvoice(id, token);
      
      set((state) => ({
        invoices: state.invoices.filter((invoice) => invoice._id !== id),
        loading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete invoice';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  updateInvoicePaymentStatus: async (id: string, status: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const updatedInvoice = await updatePaymentStatus(id, status, token);
      
      set((state) => ({
        invoices: state.invoices.map((invoice) => 
          invoice._id === id ? updatedInvoice : invoice
        ),
        loading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update payment status';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  
  clearInvoices: () => {
    set({ invoices: [], error: null });
  },
}));