import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { Supplier, Customer } from '../types/index';
import { 
    getSuppliers, 
    createSupplier, 
    updateSupplier as apiUpdateSupplier, 
    deleteSupplier as apiDeleteSupplier,
    getCustomers, 
    createCustomer, 
    updateCustomer as apiUpdateCustomer,
    deleteCustomer as apiDeleteCustomer
} from '../utils/api';

interface ContactState {
    suppliers: Supplier[];
    customers: Customer[];
    loading: boolean;
    error: string | null;
    fetchSuppliers: () => Promise<Supplier[]>;
    addSupplier: (supplier: { name: string; address?: string; gstNo?: string }) => Promise<Supplier>;
    updateSupplier: (id: string, data: { name?: string; address?: string; gstNo?: string }) => Promise<Supplier>;
    deleteSupplier: (id: string) => Promise<void>;
    fetchCustomers: () => Promise<Customer[]>;
    addCustomer: (customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
    updateCustomer: (id: string, data: { name?: string; address?: string; gstNo?: string }) => Promise<Customer>;
    deleteCustomer: (id: string) => Promise<void>;
}

export const useContactStore = create<ContactState>((set) => ({
    suppliers: [],
    customers: [],
    loading: false,
    error: null,

    fetchSuppliers: async () => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const suppliers = await getSuppliers(token);
            set({ suppliers, loading: false });
            return suppliers;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    addSupplier: async (supplierData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const newSupplier = await createSupplier(supplierData as any, token);
            set((state) => ({
                suppliers: [...state.suppliers, newSupplier],
                loading: false,
            }));
            return newSupplier;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateSupplier: async (id, data) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const updatedSupplier = await apiUpdateSupplier(id, data, token);
            set((state) => ({
                suppliers: state.suppliers.map((s) => (s._id === id ? { ...s, ...updatedSupplier } : s)),
                loading: false,
            }));
            return updatedSupplier;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteSupplier: async (id) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            await apiDeleteSupplier(id, token);
            set((state) => ({
                suppliers: state.suppliers.filter((s) => s._id !== id),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchCustomers: async () => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const customers = await getCustomers(token);
            set({ customers, loading: false });
            return customers;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    addCustomer: async (customerData) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const newCustomer = await createCustomer(customerData, token);
            set((state) => ({
                customers: [...state.customers, newCustomer],
                loading: false,
            }));
            return newCustomer;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateCustomer: async (id, data) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            const updatedCustomer = await apiUpdateCustomer(id, data, token);
            set((state) => ({
                customers: state.customers.map((c) => (c._id === id ? { ...c, ...updatedCustomer } : c)),
                loading: false,
            }));
            return updatedCustomer;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteCustomer: async (id) => {
        try {
            set({ loading: true, error: null });
            const token = useAuthStore.getState().token;
            if (!token) throw new Error('Not authenticated');

            await apiDeleteCustomer(id, token);
            set((state) => ({
                customers: state.customers.filter((c) => c._id !== id),
                loading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },
}));
