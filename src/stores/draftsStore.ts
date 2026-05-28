import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type DraftType = 'invoice' | 'dc' | 'quotation' | 'credit_note' | 'debit_note' | 'po';

export interface DraftItem {
  key: string;
  type: DraftType;
  timestamp: number;
  data: any;
  buyerName: string; // Or supplierName for PO
  number: string;     // Invoice/DC/Quotation/PO number
  grandTotal: number;
}

interface DraftsState {
  drafts: DraftItem[];
  isOpen: boolean;
  currentDraftKey: string | null;
  lastSaved: number | null;
  saveStatus: 'idle' | 'saving' | 'saved';
  loadDrafts: () => void;
  saveDraft: (type: DraftType, data: any, existingKey?: string | null) => string;
  deleteDraft: (key: string) => void;
  clearAllDrafts: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setCurrentDraftKey: (key: string | null) => void;
  setLastSaved: (ts: number | null) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

const PREFIX = 'vmew_draft_';

const getUserId = (): string => {
  try {
    return useAuthStore.getState().user?.userId || 'guest';
  } catch {
    return 'guest';
  }
};

const getPrefix = (): string => {
  return `${PREFIX}${getUserId()}_`;
};

const parseDraftKey = (key: string, prefix: string): { type: DraftType; timestamp: number } | null => {
  if (!key.startsWith(prefix)) return null;
  const parts = key.slice(prefix.length).split('_');
  if (parts.length < 2) return null;
  
  // Handled timestamp being parts[parts.length - 1] and type being parts before it joined by underscore
  const timestampStr = parts[parts.length - 1];
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  const type = parts.slice(0, parts.length - 1).join('_') as DraftType;
  return { type, timestamp };
};

export const useDraftsStore = create<DraftsState>((set, get) => ({
  drafts: [],
  isOpen: false,
  currentDraftKey: null,
  lastSaved: null,
  saveStatus: 'idle',
  loadDrafts: () => {
    const list: DraftItem[] = [];
    const prefix = getPrefix();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const parsed = parseDraftKey(key, prefix);
          if (parsed) {
            const rawData = localStorage.getItem(key);
            if (rawData) {
              const data = JSON.parse(rawData);
              
              // Extract metadata details
              let buyerName = '';
              let number = '';
              let grandTotal = 0;

              if (parsed.type === 'po') {
                buyerName = data.supplierName || '';
                number = data.poNumber || '';
                grandTotal = data.grandTotal || 0;
              } else {
                buyerName = data.buyerName || '';
                number = data.invoiceNumber || data.dcNumber || data.quotationNumber || '';
                grandTotal = data.grandTotal || 0;
              }

              list.push({
                key,
                type: parsed.type,
                timestamp: parsed.timestamp,
                data,
                buyerName,
                number,
                grandTotal,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse drafts from localStorage:', e);
    }

    // Sort descending by timestamp
    list.sort((a, b) => b.timestamp - a.timestamp);
    set({ drafts: list });
  },

  saveDraft: (type, data, existingKey) => {
    const timestamp = Date.now();
    const prefix = getPrefix();
    const key = (existingKey && existingKey.startsWith(prefix)) ? existingKey : `${prefix}${type}_${timestamp}`;
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(data));
    
    // Update store state
    const { loadDrafts } = get();
    loadDrafts();
    
    return key;
  },

  deleteDraft: (key) => {
    localStorage.removeItem(key);
    
    // Reset currentDraftKey if the deleted draft was the one open
    const { currentDraftKey, loadDrafts } = get();
    if (currentDraftKey === key) {
      set({ currentDraftKey: null });
    }
    loadDrafts();
  },

  clearAllDrafts: () => {
    try {
      const prefix = getPrefix();
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Failed to clear drafts:', e);
    }
    set({ drafts: [], currentDraftKey: null });
  },

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  setCurrentDraftKey: (key) => set({ currentDraftKey: key }),
  setLastSaved: (ts) => set({ lastSaved: ts }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
