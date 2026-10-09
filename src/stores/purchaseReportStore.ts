import { create } from 'zustand';
import { PurchaseReport, PurchaseReportFormData } from '../types';
import {
  getPurchaseReports,
  getPurchaseReportById,
  createPurchaseReport as apiCreate,
  updatePurchaseReport as apiUpdate,
  deletePurchaseReport as apiDelete,
} from '../utils/api';
import { useAuthStore } from './authStore';

interface PurchaseReportState {
  reports: PurchaseReport[];
  fetchReports: (year: string) => Promise<PurchaseReport[]>;
  fetchReport: (id: string) => Promise<PurchaseReport>;
  createReport: (data: PurchaseReportFormData) => Promise<PurchaseReport>;
  updateReport: (id: string, data: PurchaseReportFormData) => Promise<PurchaseReport>;
  deleteReport: (id: string) => Promise<void>;
  clearReports: () => void;
}

const getToken = () => useAuthStore.getState().token || '';

export const usePurchaseReportStore = create<PurchaseReportState>((set) => ({
  reports: [],

  fetchReports: async (year: string) => {
    const data = await getPurchaseReports(year, getToken());
    set({ reports: data });
    return data;
  },

  fetchReport: async (id: string) => {
    return getPurchaseReportById(id, getToken());
  },

  createReport: async (data: PurchaseReportFormData) => {
    const created = await apiCreate(data, getToken());
    set((state) => ({ reports: [...state.reports, created] }));
    return created;
  },

  updateReport: async (id: string, data: PurchaseReportFormData) => {
    const updated = await apiUpdate(id, data, getToken());
    set((state) => ({
      reports: state.reports.map((r) => (r._id === id ? updated : r)),
    }));
    return updated;
  },

  deleteReport: async (id: string) => {
    await apiDelete(id, getToken());
    set((state) => ({
      reports: state.reports.filter((r) => r._id !== id),
    }));
  },

  clearReports: () => set({ reports: [] }),
}));
