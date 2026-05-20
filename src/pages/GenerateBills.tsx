import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type') || 'invoice';

  const [billType, setBillType] = useState<BillType>(typeParam as BillType);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(!!editId);
  const [loading, setLoading] = useState(false);

  const { createInvoice, fetchInvoice, updateInvoice } = useInvoiceStore();
  const { createDC, fetchDC, updateDC } = useDCStore();
  const { createQuotation, fetchQuotation, updateQuotation } = useQuotationStore();
  const { defaultInfo } = useTemplateStore();
  const { customers, fetchCustomers, addCustomer } = useContactStore();

  const [formData, setFormData] = useState<any>({});

  // Returns the initial form data for a given bill type
  const getInitialData = (type: BillType) => {
    switch (type) {
      case 'invoice':     return getInitialInvoice(defaultInfo);
      case 'dc':          return getInitialDC();
      case 'quotation':   return getInitialQuotation();
      case 'credit_note': return getInitialCreditNote(defaultInfo);
      case 'debit_note':  return getInitialDebitNote(defaultInfo);
    }
  };

  useEffect(() => {
    if (!isEditing && !editId) {
      setFormData(getInitialData(billType));
      setSelectedDate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billType, defaultInfo]);

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
    const storageKey = (billType === 'credit_note' || billType === 'debit_note')
      ? 'invoicePreviewData'
      : `${billType}PreviewData`;

    localStorage.setItem(storageKey, JSON.stringify(finalData));

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
      <div className="page-header">
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
          <h1 className="page-title">
            {isEditing ? 'Edit Document' : 'Generate New Bill'}
          </h1>
        </div>
      </div>

      {/* Document Type Tabs */}
      {!isEditing && (
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          {/* Core document types */}
          {DOC_TYPES.filter(d => d.group === 'core').map(({ value, label, icon: Icon, activeColor }) => (
            <button
              key={value}
              onClick={() => setBillType(value)}
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

          {/* Visual divider before adjustment notes */}
          <div className="flex items-center px-2">
            <div className="w-px h-5 bg-slate-200" />
          </div>

          {/* Adjustment note types */}
          {DOC_TYPES.filter(d => d.group === 'adjustment').map(({ value, label, icon: Icon, activeColor }) => (
            <button
              key={value}
              onClick={() => setBillType(value)}
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
            ? 'Credit Note — issued to reduce the buyer\'s payable amount. Inventory is not affected.'
            : 'Debit Note — issued to increase the buyer\'s payable amount. Inventory is not affected.'}
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
