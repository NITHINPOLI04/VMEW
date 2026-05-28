import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Trash2, FileText, Truck, FileSpreadsheet, ShoppingBag, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useDraftsStore, DraftItem } from '../stores/draftsStore';
import { useConfirm } from './ConfirmDialog';
import { notify } from '../utils/notify';

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const getGroupedDrafts = (items: DraftItem[]) => {
  const today: DraftItem[] = [];
  const yesterday: DraftItem[] = [];
  const older: DraftItem[] = [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  items.forEach(item => {
    const itemDate = new Date(item.timestamp);
    if (itemDate >= startOfToday) {
      today.push(item);
    } else if (itemDate >= startOfYesterday) {
      yesterday.push(item);
    } else {
      older.push(item);
    }
  });

  return { today, yesterday, older };
};

// Document type configs for rendering draft cards
const DRAFT_TYPE_CONFIGS: Record<DraftItem['type'], {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  iconBgClass: string;
  iconColorClass: string;
}> = {
  invoice: {
    label: 'Invoice',
    icon: FileText,
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-100',
    iconBgClass: 'bg-blue-50 text-blue-600',
    iconColorClass: 'text-blue-600',
  },
  dc: {
    label: 'Challan',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-100',
    iconBgClass: 'bg-amber-50 text-amber-700',
    iconColorClass: 'text-amber-700',
  },
  quotation: {
    label: 'Quotation',
    icon: FileSpreadsheet,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    iconBgClass: 'bg-emerald-50 text-emerald-700',
    iconColorClass: 'text-emerald-700',
  },
  credit_note: {
    label: 'Credit Note',
    icon: ArrowDownLeft,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-100',
    iconBgClass: 'bg-rose-50 text-rose-700',
    iconColorClass: 'text-rose-700',
  },
  debit_note: {
    label: 'Debit Note',
    icon: ArrowUpRight,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-100',
    iconBgClass: 'bg-orange-50 text-orange-700',
    iconColorClass: 'text-orange-700',
  },
  po: {
    label: 'PO',
    icon: ShoppingBag,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    iconBgClass: 'bg-indigo-50 text-indigo-700',
    iconColorClass: 'text-indigo-700',
  },
};

const DraftsPanel: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  
  const isOpen = useDraftsStore(state => state.isOpen);
  const drafts = useDraftsStore(state => state.drafts);
  const currentDraftKey = useDraftsStore(state => state.currentDraftKey);
  
  const closePanel = useDraftsStore(state => state.closePanel);
  const deleteDraft = useDraftsStore(state => state.deleteDraft);
  const clearAllDrafts = useDraftsStore(state => state.clearAllDrafts);
  const setCurrentDraftKey = useDraftsStore(state => state.setCurrentDraftKey);
  const loadDrafts = useDraftsStore(state => state.loadDrafts);

  const [searchQuery, setSearchQuery] = useState('');
  const [_, setTicker] = useState(0);

  // Load drafts when panel opens
  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen, loadDrafts]);

  // Tick timer to update the relative timestamps
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    const query = searchQuery.toLowerCase().trim();
    return drafts.filter(
      d =>
        d.buyerName.toLowerCase().includes(query) ||
        d.number.toLowerCase().includes(query) ||
        d.type.toLowerCase().includes(query)
    );
  }, [drafts, searchQuery]);

  const grouped = useMemo(() => getGroupedDrafts(filteredDrafts), [filteredDrafts]);

  const handleSelectDraft = async (draft: DraftItem) => {
    if (currentDraftKey === draft.key) {
      closePanel();
      return;
    }

    const isCurrentlyOnForm =
      window.location.pathname.includes('/generate-bills') ||
      window.location.pathname.includes('/purchase-order/new');

    if (isCurrentlyOnForm) {
      const ok = await confirm({
        title: 'Switch Draft',
        description: 'Switching drafts will load the selected draft. Your current form state is already auto-saved.',
        confirmLabel: 'Switch Draft',
      });
      if (!ok) return;
    }

    setCurrentDraftKey(draft.key);
    closePanel();

    if (draft.type === 'po') {
      navigate(`/purchase-order/new?draftId=${draft.key}`);
    } else {
      navigate(`/generate-bills?type=${draft.type}&draftId=${draft.key}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, draft: DraftItem) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Draft',
      description: `Are you sure you want to delete the draft for ${draft.buyerName || 'Unnamed Entity'}?`,
      confirmLabel: 'Delete',
    });
    if (ok) {
      deleteDraft(draft.key);
      notify.success('Draft deleted');
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Clear All Drafts',
      description: 'Are you sure you want to permanently delete all saved drafts? This cannot be undone.',
      confirmLabel: 'Clear All',
    });
    if (ok) {
      clearAllDrafts();
      notify.success('All drafts cleared');
    }
  };

  if (!isOpen) return null;

  const renderSection = (title: string, list: DraftItem[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-1">{title}</h4>
        <div className="space-y-2">
          {list.map(draft => {
            const config = DRAFT_TYPE_CONFIGS[draft.type] || {
              label: 'Draft',
              icon: FileText,
              badgeClass: 'bg-slate-50 text-slate-600 border-slate-100',
              iconBgClass: 'bg-slate-50 text-slate-600',
              iconColorClass: 'text-slate-600',
            };
            const Icon = config.icon;
            const isSelected = currentDraftKey === draft.key;
            
            // Check status logic: incomplete vs ready
            const isPO = draft.type === 'po';
            const hasName = isPO ? !!draft.data.supplierName : !!draft.data.buyerName;
            const hasItems = draft.data.items && draft.data.items.length > 0 && draft.data.items.some((i: any) => i.description && i.description.trim());
            const isReady = hasName && hasItems && draft.grandTotal > 0;
            
            return (
              <div
                key={draft.key}
                onClick={() => handleSelectDraft(draft)}
                className={`group flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-200 shadow-sm ring-1 ring-blue-100'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm'
                }`}
              >
                {/* Document Type Icon Wrapper */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'bg-blue-600 text-white' : config.iconBgClass
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-bold text-slate-800 truncate leading-tight">
                      {draft.buyerName || <span className="text-slate-400 italic">Unnamed Buyer</span>}
                    </h5>
                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0 pt-0.5">
                      {formatTimeAgo(draft.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                      {draft.number || 'No doc number'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className={`text-[11px] font-bold ${isReady ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isReady ? `₹${draft.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ready` : 'incomplete'}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, draft)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all shrink-0"
                  title="Delete draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[990] transition-opacity"
        onClick={closePanel}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-50 border-l border-slate-200 z-[1000] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-250 ease-out font-sans">
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Saved drafts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Resume your incomplete work</p>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Draft List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No saved drafts</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                Drafts are automatically saved when you fill out Generate Bills or PO forms.
              </p>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <h4 className="text-sm font-bold text-slate-600">No results found</h4>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for a different buyer name or document number.
              </p>
            </div>
          ) : (
            <>
              {renderSection('Today', grouped.today)}
              {renderSection('Yesterday', grouped.yesterday)}
              {renderSection('Older', grouped.older)}
            </>
          )}
        </div>

        {/* Footer */}
        {drafts.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <button
              onClick={handleClearAll}
              className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all drafts
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default DraftsPanel;
