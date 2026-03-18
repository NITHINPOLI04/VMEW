import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { Supplier, Customer } from '../types/index';
import { getSuppliers, createSupplier, getCustomers, createCustomer } from '../utils/api';

interface ContactState {
    suppliers: Supplier[];
    customers: Customer[];
    loading: boolean;
    error: string | null;
    fetchSuppliers: () => Promise<Supplier[]>;
    addSupplier: (supplier: { name: string; address?: string; gstNo?: string }) => Promise<Supplier>;
    fetchCustomers: () => Promise<Customer[]>;
    addCustomer: (customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
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
}));
