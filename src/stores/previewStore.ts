import { create } from 'zustand';

interface PreviewState {
  invoicePreviewData: any | null;
  dcPreviewData: any | null;
  quotationPreviewData: any | null;
  poPreviewData: any | null;
  setPreviewData: (key: 'invoice' | 'dc' | 'quotation' | 'po', data: any) => void;
  getPreviewData: (key: 'invoice' | 'dc' | 'quotation' | 'po') => any | null;
  clearPreviewData: (key: 'invoice' | 'dc' | 'quotation' | 'po') => void;
  clearAll: () => void;
}

const KEY_MAP = {
  invoice: 'invoicePreviewData',
  dc: 'dcPreviewData',
  quotation: 'quotationPreviewData',
  po: 'poPreviewData',
} as const;

export const usePreviewStore = create<PreviewState>((set, get) => ({
  invoicePreviewData: null,
  dcPreviewData: null,
  quotationPreviewData: null,
  poPreviewData: null,

  setPreviewData: (key, data) => {
    set({ [KEY_MAP[key]]: data });
  },

  getPreviewData: (key) => {
    return get()[KEY_MAP[key]];
  },

  clearPreviewData: (key) => {
    set({ [KEY_MAP[key]]: null });
  },

  clearAll: () => {
    set({
      invoicePreviewData: null,
      dcPreviewData: null,
      quotationPreviewData: null,
      poPreviewData: null,
    });
  },
}));
