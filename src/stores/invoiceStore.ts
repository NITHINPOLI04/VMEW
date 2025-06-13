import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import { InvoiceFormData, Invoice } from '../types';

interface InvoiceState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: (year: string) => Promise<Invoice[]>;
  fetchInvoice: (id: string) => Promise<InvoiceFormData>;
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
      
      const response = await axios.get(`/api/invoices/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Invoices API response:', response.data);
      
      const invoices: Invoice[] = Array.isArray(response.data) ? response.data : [];
      
      set({ invoices, loading: false });
      return invoices;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  fetchInvoice: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.get(`/api/invoices/id/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invoice = response.data as InvoiceFormData;
      
      set({ loading: false });
      return invoice;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  createInvoice: async (invoice: InvoiceFormData) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post('/api/invoices', invoice, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newInvoice = response.data as Invoice;
      
      set({ loading: false });
      return newInvoice;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  updateInvoice: async (id: string, invoice: InvoiceFormData) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.put(`/api/invoices/${id}`, invoice, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  deleteInvoice: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.delete(`/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set((state) => ({
        invoices: state.invoices.filter((invoice) => invoice._id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  updateInvoicePaymentStatus: async (id: string, status: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      
      await axios.patch(`/api/invoices/${id}/payment-status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set((state) => ({
        invoices: state.invoices.map((invoice) => 
          invoice._id === id ? { ...invoice, paymentStatus: status } : invoice
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, loading: false });
      throw error;
    }
  },
  
  clearInvoices: () => {
    set({ invoices: [], error: null });
  },
}));