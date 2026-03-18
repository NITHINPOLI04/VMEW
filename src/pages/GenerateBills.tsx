import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Truck, FileSpreadsheet } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useDCStore } from '../stores/dcStore';
import { useQuotationStore } from '../stores/quotationStore';
import { useTemplateStore } from '../stores/templateStore';
import { useContactStore } from '../stores/contactStore';
import BillForm from '../components/BillForm';
import FormSkeleton from '../components/FormSkeleton';
import { toast } from 'react-hot-toast';
import { getInitialInvoice, getInitialDC, getInitialQuotation } from '../config/documentConfigs';
import { convertToWords } from '../utils/numberToWords';

const DOC_TYPES = [
  { value: 'invoice' as const, label: 'Tax Invoice', icon: FileText, activeColor: 'border-blue-600 text-blue-700 bg-blue-50/60' },
  { value: 'dc' as const, label: 'Delivery Challan', icon: Truck, activeColor: 'border-amber-500 text-amber-700 bg-amber-50/60' },
  { value: 'quotation' as const, label: 'Quotation', icon: FileSpreadsheet, activeColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/60' },
];

const GenerateBills: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type') || 'invoice';

  const [billType, setBillType] = useState<'invoice' | 'dc' | 'quotation'>(typeParam as any);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(!!editId);
  const [loading, setLoading] = useState(false);

  const { createInvoice, fetchInvoice, updateInvoice } = useInvoiceStore();
  const { createDC, fetchDC, updateDC } = useDCStore();
  const { createQuotation, fetchQuotation, updateQuotation } = useQuotationStore();
  const { defaultInfo } = useTemplateStore();
  const { customers, fetchCustomers, addCustomer } = useContactStore();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!isEditing && !editId) {
      if (billType === 'invoice') setFormData(getInitialInvoice(defaultInfo));
      if (billType === 'dc') setFormData(getInitialDC());
      if (billType === 'quotation') setFormData(getInitialQuotation());
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
          if (billType === 'invoice') data = await fetchInvoice(editId);
          else if (billType === 'dc') data = await fetchDC(editId);
          else if (billType === 'quotation') data = await fetchQuotation(editId);

          if (!data) throw new Error('Data not found');

          setFormData(data);
          setSelectedDate(new Date(data.date));
          setIsEditing(true);
          toast.success(`${billType.toUpperCase()} loaded for editing`);
        } catch (error) {
          toast.error(`Failed to load ${billType} for editing`);
          navigate('/generate-bills');
        } finally {
          setLoading(false);
        }
      }
    };
    loadEntityForEdit();
  }, [editId, billType, fetchInvoice, fetchDC, fetchQuotation, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.some((item: any) => !item.description)) {
      toast.error('Please fill in all item descriptions');
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

      if (billType === 'invoice' || billType === 'quotation') {
        finalData.totalInWords = convertToWords(finalData.grandTotal);
      }

      if (isEditing && editId) {
        if (billType === 'invoice') await updateInvoice(editId, finalData);
        if (billType === 'dc') await updateDC(editId, finalData);
        if (billType === 'quotation') await updateQuotation(editId, finalData);
        toast.success(`${billType.toUpperCase()} updated successfully!`);
        navigate(`/${billType}-preview/${editId}`);
      } else {
        let result: any;
        if (billType === 'invoice') result = await createInvoice(finalData);
        else if (billType === 'dc') result = await createDC(finalData);
        else if (billType === 'quotation') result = await createQuotation(finalData);

        if (result && result._id) {
          toast.success(`${billType.toUpperCase()} created successfully!`);
          navigate(`/${billType}-preview/${result._id}`);
        } else {
          throw new Error('Document creation failed or ID is missing');
        }
      }
    } catch (error) {
      toast.error(isEditing ? `Failed to update ${billType}` : `Failed to create ${billType}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (formData.items.some((item: any) => !item.description)) {
      toast.error('Please fill in all item descriptions');
      return;
    }
    const finalData = { ...formData, date: selectedDate.toISOString() };
    if (billType === 'invoice' || billType === 'quotation') finalData.totalInWords = convertToWords(finalData.grandTotal);
    localStorage.setItem(`${billType}PreviewData`, JSON.stringify(finalData));
    navigate(`/${billType}-preview/temp`);
  };

  if ((loading && isEditing) || !formData.items) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-4 pb-0 bg-slate-50/80 min-h-screen">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEditing ? `Edit ${billType.charAt(0).toUpperCase() + billType.slice(1)}` : 'Generate New Bill'}
          </h1>
        </div>
      </div>

      {/* Document Type Tabs - matches Bill Library tab strip */}
      {!isEditing && (
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          {DOC_TYPES.map(({ value, label, icon: Icon, activeColor }) => (
            <button
              key={value}
              onClick={() => setBillType(value)}
              className={`flex items-center gap-2 py-3 px-5 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${billType === value
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
