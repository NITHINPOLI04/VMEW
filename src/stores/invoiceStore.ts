import { create } from 'zustand';
import { getInvoices, getCreditNotes, getDebitNotes, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, updatePaymentStatus } from '../utils/api';
import { useAuthStore } from './authStore';
import { useFinancialYearStore } from './financialYearStore';
import { InvoiceFormData, Invoice } from '../types/index';

interface InvoiceState {
  invoices: Invoice[];
  creditNotes: Invoice[];
  debitNotes: Invoice[];
  receivedAmounts: { [key: string]: number };
  loading: boolean;
  error: string | null;
  fetchInvoices: (year: string) => Promise<Invoice[]>;
  fetchCreditNotes: (year: string) => Promise<Invoice[]>;
  fetchDebitNotes: (year: string) => Promise<Invoice[]>;
  fetchInvoice: (id: string) => Promise<Invoice>;
  createInvoice: (invoice: InvoiceFormData) => Promise<Invoice>;
  updateInvoice: (id: string, invoice: InvoiceFormData) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateInvoicePaymentStatus: (id: string, status: string) => Promise<void>;
  setReceivedAmount: (id: string, amount: number) => void;
  getReceivedAmount: (id: string) => number | undefined;
  clearInvoices: () => void;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  creditNotes: [],
  debitNotes: [],
  receivedAmounts: {},
  loading: false,
  error: null,

  fetchInvoices: async (year: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      const invoices = await getInvoices(year, token, 'invoice');
      
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ invoices, loading: false });
      }
      return invoices;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch invoices';
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ error: errorMessage, loading: false });
      }
      throw new Error(errorMessage);
    }
  },

  fetchCreditNotes: async (year: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      const creditNotes = await getCreditNotes(year, token);
      
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ creditNotes, loading: false });
      }
      return creditNotes;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch credit notes';
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ error: errorMessage, loading: false });
      }
      throw new Error(errorMessage);
    }
  },

  fetchDebitNotes: async (year: string) => {
    try {
      set({ loading: true, error: null });
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      const debitNotes = await getDebitNotes(year, token);
      
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ debitNotes, loading: false });
      }
      return debitNotes;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch debit notes';
      const currentFY = useFinancialYearStore.getState().selectedFY;
      if (year === currentFY) {
        set({ error: errorMessage, loading: false });
      }
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
      // Append to the correct list based on documentType
      const docType = newInvoice.documentType || 'invoice';
      if (docType === 'credit_note') {
        set((state) => ({ creditNotes: [...state.creditNotes, newInvoice], loading: false }));
      } else if (docType === 'debit_note') {
        set((state) => ({ debitNotes: [...state.debitNotes, newInvoice], loading: false }));
      } else {
        set((state) => ({ invoices: [...state.invoices, newInvoice], loading: false }));
      }
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
      const docType = updatedInvoice.documentType || 'invoice';
      const updater = (list: Invoice[]) => list.map((inv) => (inv._id === id ? updatedInvoice : inv));
      if (docType === 'credit_note') {
        set((state) => ({ creditNotes: updater(state.creditNotes), loading: false }));
      } else if (docType === 'debit_note') {
        set((state) => ({ debitNotes: updater(state.debitNotes), loading: false }));
      } else {
        set((state) => ({ invoices: updater(state.invoices), loading: false }));
      }
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
      const remover = (list: Invoice[]) => list.filter((invoice) => invoice._id !== id);
      set((state) => ({
        invoices: remover(state.invoices),
        creditNotes: remover(state.creditNotes),
        debitNotes: remover(state.debitNotes),
        receivedAmounts: Object.fromEntries(Object.entries(state.receivedAmounts).filter(([key]) => key !== id)),
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
        invoices: state.invoices.map((invoice) => invoice._id === id ? updatedInvoice : invoice),
        loading: false,
      }));
      if (status !== 'Partially Paid') {
        set((state) => ({
          receivedAmounts: { ...state.receivedAmounts, [id]: 0 },
        }));
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update payment status';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  setReceivedAmount: (id: string, amount: number) => {
    set((state) => ({
      receivedAmounts: { ...state.receivedAmounts, [id]: amount },
    }));
  },

  getReceivedAmount: (id: string) => {
    return get().receivedAmounts[id];
  },

  clearInvoices: () => {
    set({ invoices: [], creditNotes: [], debitNotes: [], receivedAmounts: {}, error: null });
  },
}));