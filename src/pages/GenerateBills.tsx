import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FileText, Truck, FileSpreadsheet, ChevronLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useDCStore } from '../stores/dcStore';
import { useQuotationStore } from '../stores/quotationStore';
import { useTemplateStore } from '../stores/templateStore';
import { useContactStore } from '../stores/contactStore';
import BillForm from '../components/BillForm';
import FormSkeleton from '../components/FormSkeleton';
import { notify } from '../utils/notify';
import { getInitialInvoice, getInitialDC, getInitialQuotation, getInitialCreditNote, getInitialDebitNote } from '../config/documentConfigs';
import { convertToWords } from '../utils/numberToWords';
import { usePreviewStore } from '../stores/previewStore';
import { useDraftsStore } from '../stores/draftsStore';
import { useAuthStore } from '../stores/authStore';

type BillType = 'invoice' | 'dc' | 'quotation' | 'credit_note' | 'debit_note';

const DOC_TYPES: { value: BillType; label: string; icon: React.ElementType; activeColor: string; group?: 'core' | 'adjustment' }[] = [
  { value: 'invoice',     label: 'Tax Invoice',      icon: FileText,       activeColor: 'border-blue-600 text-blue-700 bg-blue-50/60',   group: 'core' },
  { value: 'dc',          label: 'Delivery Challan', icon: Truck,          activeColor: 'border-amber-500 text-amber-700 bg-amber-50/60', group: 'core' },
  { value: 'quotation',   label: 'Quotation',        icon: FileSpreadsheet,activeColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/60', group: 'core' },
  { value: 'credit_note', label: 'Credit Note',      icon: ArrowDownLeft,  activeColor: 'border-rose-500 text-rose-700 bg-rose-50/60',   group: 'adjustment' },
  { value: 'debit_note',  label: 'Debit Note',       icon: ArrowUpRight,   activeColor: 'border-orange-500 text-orange-700 bg-orange-50/60', group: 'adjustment' },
];

const GenerateBills: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type') || 'invoice';
  const draftIdParam = searchParams.get('draftId');

  const [billType, setBillType] = useState<BillType>(typeParam as BillType);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(!!editId);
  const [loading, setLoading] = useState(false);
  const hasPrefilled = useRef(false);
  const hasRestoredDraft = useRef<string | null>(null);

  const { createInvoice, fetchInvoice, updateInvoice } = useInvoiceStore();
  const { createDC, fetchDC, updateDC } = useDCStore();
  const { createQuotation, fetchQuotation, updateQuotation } = useQuotationStore();
  const { defaultInfo } = useTemplateStore();
  const { customers, fetchCustomers, addCustomer } = useContactStore();

  // Drafts store hooks
  const saveDraft = useDraftsStore(state => state.saveDraft);
  const deleteDraft = useDraftsStore(state => state.deleteDraft);
  const currentDraftKey = useDraftsStore(state => state.currentDraftKey);
  const setCurrentDraftKey = useDraftsStore(state => state.setCurrentDraftKey);

  // Auto-save UI state
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [timeAgoText, setTimeAgoText] = useState('just now');
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  const [formData, setFormData] = useState<any>({});

  const stateData = location.state as any;

  // Returns the initial form data for a given bill type
  const getInitialData = useCallback((type: BillType) => {
    switch (type) {
      case 'invoice':     return getInitialInvoice(defaultInfo);
      case 'dc':          return getInitialDC();
      case 'quotation':   return getInitialQuotation();
      case 'credit_note': return getInitialCreditNote(defaultInfo);
      case 'debit_note':  return getInitialDebitNote(defaultInfo);
    }
  }, [defaultInfo]);



  useEffect(() => {
    if (!isEditing && !editId) {
      if (stateData && (stateData.documentType === 'credit_note' || stateData.documentType === 'debit_note') && !hasPrefilled.current) {
        hasPrefilled.current = true;
        const initial = getInitialData(stateData.documentType) as any;
        setFormData({
          ...initial,
          invoiceNumber: stateData.invoiceNumber || initial.invoiceNumber || '',
          buyerName: stateData.buyerName || '',
          buyerAddress: stateData.buyerAddress || '',
          buyerGst: stateData.buyerGst || '',
          buyerPan: stateData.buyerPan || '',
          buyerMsme: stateData.buyerMsme || '',
          vessel: stateData.vessel || '',
          poNumber: stateData.poNumber || '',
          dcNumber: stateData.dcNumber || '',
          ewayBillNo: stateData.ewayBillNo || '',
          items: stateData.items && stateData.items.length > 0 ? stateData.items : initial.items,
          taxType: stateData.taxType || initial.taxType,
          discountEnabled: stateData.discountEnabled ?? initial.discountEnabled,
          discountPercentage: stateData.discountPercentage ?? initial.discountPercentage,
          discountAmount: stateData.discountAmount ?? initial.discountAmount,
          discountType: stateData.discountType || initial.discountType,
          discountFixedAmount: stateData.discountFixedAmount ?? initial.discountFixedAmount,
          subTotal: stateData.subTotal ?? initial.subTotal,
          totalSgst: stateData.totalSgst ?? initial.totalSgst,
          totalCgst: stateData.totalCgst ?? initial.totalCgst,
          totalIgst: stateData.totalIgst ?? initial.totalIgst,
          grandTotal: stateData.grandTotal ?? initial.grandTotal,
          linkedInvoiceId: stateData.linkedInvoiceId || null,
          linkedInvoiceNumber: stateData.linkedInvoiceNumber || '',
          reason: stateData.reason || '',
        });
        if (stateData.date) {
          setSelectedDate(new Date(stateData.date));
        }
        setBillType(stateData.documentType);
      } else if (!hasPrefilled.current) {
        // Check for drafts to restore
        let draftToLoad: any = null;
        let loadedKey: string | null = null;

        if (draftIdParam) {
          const raw = localStorage.getItem(draftIdParam);
          if (raw) {
            draftToLoad = JSON.parse(raw);
            loadedKey = draftIdParam;
          }
        } else {
          // Find most recent draft for this billType
          const userId = useAuthStore.getState().user?.userId || 'guest';
          const typeKeyPrefix = `vmew_draft_${userId}_${billType}_`;
          const matchingKeys: { key: string; ts: number }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(typeKeyPrefix)) {
              const ts = parseInt(k.slice(typeKeyPrefix.length), 10);
              if (!isNaN(ts)) {
                matchingKeys.push({ key: k, ts });
              }
            }
          }
          if (matchingKeys.length > 0) {
            matchingKeys.sort((a, b) => b.ts - a.ts);
            const mostRecentKey = matchingKeys[0].key;
            const raw = localStorage.getItem(mostRecentKey);
            if (raw) {
              draftToLoad = JSON.parse(raw);
              loadedKey = mostRecentKey;
            }
          }
        }

        if (draftToLoad && loadedKey) {
          setFormData(draftToLoad);
          if (draftToLoad.date) {
            setSelectedDate(new Date(draftToLoad.date));
          }
          setCurrentDraftKey(loadedKey);
          setLastSaved(parseInt(loadedKey.split('_').pop() || '', 10) || Date.now());
          setSaveStatus('saved');
          
          if (hasRestoredDraft.current !== loadedKey) {
            hasRestoredDraft.current = loadedKey;
            setShowRestoreBanner(true);
          }
        } else {
          setFormData(getInitialData(billType));
          setSelectedDate(new Date());
          setCurrentDraftKey(null);
          setLastSaved(null);
          setSaveStatus('idle');
          setShowRestoreBanner(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billType, defaultInfo, stateData, isEditing, editId, draftIdParam]);

  // Debounced auto-save hook
  useEffect(() => {
    if (isEditing || !formData || Object.keys(formData).length === 0) {
      return;
    }

    // Check if the form has actual content before saving a draft
    const isFormDirty = () => {
      const hasBuyerName = !!formData.buyerName?.trim();
      const hasDocNumber = !!(formData.invoiceNumber?.trim() || formData.dcNumber?.trim() || formData.quotationNumber?.trim());
      const hasItemDescription = formData.items?.some((i: any) => !!i.description?.trim());
      return hasBuyerName || hasDocNumber || hasItemDescription;
    };

    if (!isFormDirty()) {
      return;
    }

    setSaveStatus('saving');
    const delayDebounceFn = setTimeout(() => {
      const dataToSave = {
        ...formData,
        date: selectedDate.toISOString(),
      };
      
      const key = saveDraft(billType, dataToSave, currentDraftKey);
      if (!currentDraftKey) {
        setCurrentDraftKey(key);
      }
      
      setLastSaved(Date.now());
      setSaveStatus('saved');
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [formData, selectedDate, billType, isEditing, currentDraftKey, saveDraft, setCurrentDraftKey]);

  // Relative timestamp tracker
  useEffect(() => {
    if (!lastSaved) return;
    
    const update = () => {
      const diff = Date.now() - lastSaved;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) {
        setTimeAgoText('just now');
      } else if (mins < 60) {
        setTimeAgoText(`${mins} min ago`);
      } else {
        const hours = Math.floor(mins / 60);
        if (hours < 24) {
          setTimeAgoText(`${hours} min ago`); // keeps the format compatible or "saved 2 min ago"
        } else {
          setTimeAgoText('some time ago');
        }
      }
    };
    
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const loadEntityForEdit = async () => {
      if (editId) {
        setLoading(true);
        try {
          let data;
          if (billType === 'invoice' || billType === 'credit_note' || billType === 'debit_note') {
            data = await fetchInvoice(editId);
          } else if (billType === 'dc') {
            data = await fetchDC(editId);
          } else if (billType === 'quotation') {
            data = await fetchQuotation(editId);
          }

          if (!data) throw new Error('Data not found');

          setFormData(data);
          setSelectedDate(new Date(data.date));
          setIsEditing(true);
          if ('documentType' in data && data.documentType) {
            setBillType(data.documentType);
          }
          // Page state ("Edit Document" title + populated form) is confirmation enough
        } catch (error) {
          notify.error('Document not found');
          navigate('/generate-bills');
        } finally {
          setLoading(false);
        }
      }
    };
    loadEntityForEdit();
  }, [editId, billType, fetchInvoice, fetchDC, fetchQuotation, navigate]);

  // Determines which preview route to use for a given bill type
  const getPreviewRoute = (type: BillType, id: string) => {
    if (type === 'invoice' || type === 'credit_note' || type === 'debit_note') {
      return `/invoice-preview/${id}`;
    }
    return `/${type}-preview/${id}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emptyIdx = formData.items.findIndex((item: any) => !item.description);
    if (emptyIdx !== -1) {
      notify.error(`Add description to item ${emptyIdx + 1}`);
      const el = document.getElementById(`desc_${emptyIdx}`);
      el?.focus();
      return;
    }

    setLoading(true);
    try {
      const finalData = { ...formData, date: selectedDate.toISOString() };

      if (finalData.buyerName) {
        const existingCustomer = customers.find(c => c.name.toLowerCase() === finalData.buyerName.toLowerCase());
        if (!existingCustomer) {
          await addCustomer({
            name: finalData.buyerName,
            address: finalData.buyerAddress,
            gstNo: finalData.buyerGst,
            pan: finalData.buyerPan,
            msme: finalData.buyerMsme,
          });
        }
      }

      // Compute totalInWords for all document types with a grandTotal
      if (billType !== 'dc') {
        finalData.totalInWords = convertToWords(finalData.grandTotal);
      }

      if (isEditing && editId) {
        if (billType === 'invoice' || billType === 'credit_note' || billType === 'debit_note') {
          await updateInvoice(editId, finalData);
        } else if (billType === 'dc') {
          await updateDC(editId, finalData);
        } else if (billType === 'quotation') {
          await updateQuotation(editId, finalData);
        }
        notify.success(`${DOC_TYPES.find(d => d.value === billType)?.label || 'Document'} updated`);
        navigate(getPreviewRoute(billType, editId));
      } else {
        let result: any;
        if (billType === 'invoice' || billType === 'credit_note' || billType === 'debit_note') {
          result = await createInvoice(finalData);
        } else if (billType === 'dc') {
          result = await createDC(finalData);
        } else if (billType === 'quotation') {
          result = await createQuotation(finalData);
        }

        if (result && result._id) {
          if (currentDraftKey) {
            deleteDraft(currentDraftKey);
            setCurrentDraftKey(null);
          }
          notify.success(`${DOC_TYPES.find(d => d.value === billType)?.label || 'Document'} created`);

          // Show stock warnings (invoices only)
          if (billType === 'invoice' && result.stockWarnings && result.stockWarnings.length > 0) {
            result.stockWarnings.forEach((warning: any) => {
              notify.warning(`"${warning.description}" stock: ${warning.currentStock} remaining`);
            });
          }

          navigate(getPreviewRoute(billType, result._id));
        } else {
          throw new Error('Document creation failed or ID is missing');
        }
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Could not save — check your connection';
      notify.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const previewEmptyIdx = formData.items.findIndex((item: any) => !item.description);
    if (previewEmptyIdx !== -1) {
      notify.error(`Add description to item ${previewEmptyIdx + 1}`);
      const el = document.getElementById(`desc_${previewEmptyIdx}`);
      el?.focus();
      return;
    }
    const finalData = { ...formData, date: selectedDate.toISOString() };
    if (billType !== 'dc') finalData.totalInWords = convertToWords(finalData.grandTotal);

    // For CN/DN, reuse the invoice preview data key
    const previewKey = (billType === 'credit_note' || billType === 'debit_note')
      ? 'invoice' as const
      : billType as 'invoice' | 'dc' | 'quotation';

    usePreviewStore.getState().setPreviewData(previewKey, finalData);

    // Route CN/DN to invoice-preview with /temp
    if (billType === 'credit_note' || billType === 'debit_note') {
      navigate('/invoice-preview/temp');
    } else {
      navigate(`/${billType}-preview/temp`);
    }
  };

  if ((loading && isEditing) || !formData.items) {
    return <FormSkeleton />;
  }

  const isAdjustmentNote = billType === 'credit_note' || billType === 'debit_note';

  return (
    <div className="space-y-4 pb-0 bg-slate-50/80 min-h-screen">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => navigate('/bill-library')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="page-title">
              {isEditing ? 'Edit Document' : 'Generate New Bill'}
            </h1>
            {!isEditing && lastSaved && (
              <p className="text-xs text-slate-500 mt-1 font-medium animate-in fade-in duration-200">
                {DOC_TYPES.find(d => d.value === billType)?.label || 'Tax Invoice'} · Draft saved {timeAgoText}
              </p>
            )}
            {!isEditing && !lastSaved && (
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {DOC_TYPES.find(d => d.value === billType)?.label || 'Tax Invoice'}
              </p>
            )}
          </div>
        </div>

        {/* Auto-saved Pill */}
        {!isEditing && saveStatus !== 'idle' && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
            saveStatus === 'saving'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}></span>
            {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
          </div>
        )}
      </div>

      {/* Restored Draft Interactive Banner */}
      {!isEditing && showRestoreBanner && currentDraftKey && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 animate-bounce" />
            <span className="text-sm font-semibold">Restored unsaved draft session.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentDraftKey) {
                  deleteDraft(currentDraftKey);
                  setCurrentDraftKey(null);
                }
                setFormData(getInitialData(billType));
                setSelectedDate(new Date());
                setShowRestoreBanner(false);
                setLastSaved(null);
                setSaveStatus('idle');
                if (searchParams.has('draftId')) {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('draftId');
                  setSearchParams(newParams);
                }
                notify.success('Draft cleared. Started fresh.');
              }}
              className="text-xs font-bold bg-white text-blue-600 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
            >
              Start Fresh
            </button>
            <button
              onClick={() => setShowRestoreBanner(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Document Type Tabs */}
      {!isEditing && (
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          {/* Core document types */}
          {DOC_TYPES.filter(d => d.group === 'core').map(({ value, label, icon: Icon, activeColor }) => (
            <button
              key={value}
              onClick={() => {
                setBillType(value);
                setCurrentDraftKey(null);
                hasRestoredDraft.current = null;
                setLastSaved(null);
                setSaveStatus('idle');
                setShowRestoreBanner(false);
                if (searchParams.has('draftId')) {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('draftId');
                  setSearchParams(newParams);
                }
              }}
              className={`flex items-center gap-2 py-3 px-5 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                billType === value
                  ? activeColor
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              aria-label={`Select ${label} type`}
              aria-pressed={billType === value}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Contextual hint for adjustment notes */}
      {!isEditing && isAdjustmentNote && (
        <div className={`mx-0 mb-2 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
          billType === 'credit_note'
            ? 'bg-rose-50 text-rose-700 border border-rose-100'
            : 'bg-orange-50 text-orange-700 border border-orange-100'
        }`}>
          {billType === 'credit_note' ? <ArrowDownLeft className="w-4 h-4 flex-shrink-0" /> : <ArrowUpRight className="w-4 h-4 flex-shrink-0" />}
          {billType === 'credit_note'
            ? "Credit Note — issued to reduce the buyer's payable amount."
            : "Debit Note — issued to increase the buyer's payable amount."}
        </div>
      )}

      {/* Workspace Layout */}
      <div className="relative">
        <BillForm
          billType={billType}
          formData={formData}
          setFormData={setFormData}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onSubmit={handleSubmit}
          onPreview={handlePreview}
          isEditing={isEditing}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default GenerateBills;
