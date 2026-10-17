import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, FileText, FileSpreadsheet, ChevronsUpDown, PlusCircle, IndianRupee, StickyNote } from 'lucide-react';
import { usePurchaseReportStore } from '../stores/purchaseReportStore';
import { useContactStore } from '../stores/contactStore';
import { useFinancialYearStore } from '../stores/financialYearStore';
import { getInitialPurchaseReport } from '../config/documentConfigs';
import { notify } from '../utils/notify';
import { TaxFieldsRow } from '../engines/tableEngine';
import { roundGrandTotal } from '../utils/calcEngine';
import CustomDatePicker from '../components/CustomDatePicker';
import FormSkeleton from '../components/FormSkeleton';

const inputClass =
  'w-full px-4 py-2 text-sm rounded-xl border border-slate-200 bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const PurchaseReportForm: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditing = !!editId;

  const { createReport, updateReport, fetchReport } = usePurchaseReportStore();
  const { suppliers, fetchSuppliers, addSupplier } = useContactStore();
  const selectedFY = useFinancialYearStore(s => s.selectedFY);

  const [formData, setFormData] = useState<any>(getInitialPurchaseReport());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  // Supplier autocomplete
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearchResults, setSupplierSearchResults] = useState<any[]>([]);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load data for edit
  useEffect(() => {
    if (editId) {
      setPageLoading(true);
      fetchReport(editId)
        .then((data) => {
          setFormData({
            ...getInitialPurchaseReport(),
            ...data,
          });
          setSelectedDate(new Date(data.date));
        })
        .catch(() => {
          notify.error('Report not found');
          navigate('/tools/purchase-report');
        })
        .finally(() => setPageLoading(false));
    }
  }, [editId, fetchReport, navigate]);

  // Tax calculation helper matching BillForm percentages
  const calculateTaxAmounts = (
    taxableVal: number,
    taxType: string,
    sgstPct: number,
    cgstPct: number,
    igstPct: number
  ) => {
    const tv = Number(taxableVal) || 0;
    if (taxType === 'igst') {
      const igstPctNum = Number(igstPct) || 0;
      const igstAmt = (tv * igstPctNum) / 100;
      return {
        taxType: 'igst',
        taxableValue: tv,
        igstPercentage: igstPctNum,
        igstAmount: igstAmt,
        sgstPercentage: Number(sgstPct) || 0,
        sgstAmount: 0,
        cgstPercentage: Number(cgstPct) || 0,
        cgstAmount: 0,
        totalAmount: tv + igstAmt,
      };
    } else {
      const sgstPctNum = Number(sgstPct) || 0;
      const cgstPctNum = Number(cgstPct) || 0;
      const sgstAmt = (tv * sgstPctNum) / 100;
      const cgstAmt = (tv * cgstPctNum) / 100;
      return {
        taxType: 'sgstcgst',
        taxableValue: tv,
        sgstPercentage: sgstPctNum,
        sgstAmount: sgstAmt,
        cgstPercentage: cgstPctNum,
        cgstAmount: cgstAmt,
        igstPercentage: Number(igstPct) || 0,
        igstAmount: 0,
        totalAmount: tv + sgstAmt + cgstAmt,
      };
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => {
      let updated = { ...prev, [name]: value };

      if (name === 'taxableValue' || name === 'taxType') {
        const tv = name === 'taxableValue' ? Number(value) || 0 : Number(prev.taxableValue) || 0;
        const tt = name === 'taxType' ? value : prev.taxType;
        const taxComputed = calculateTaxAmounts(
          tv,
          tt,
          prev.sgstPercentage ?? 9,
          prev.cgstPercentage ?? 9,
          prev.igstPercentage ?? 18
        );
        updated = { ...updated, ...taxComputed };
      }

      return updated;
    });

    // Party name autocomplete
    if (name === 'partyName') {
      setShowSupplierDropdown(true);
      const filtered = suppliers.filter((s: any) =>
        s.name.toLowerCase().includes((value || '').toLowerCase())
      );
      setSupplierSearchResults(filtered);
    }
  };

  const handleTaxAdjustmentChange = (field: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: numVal };
      const taxComputed = calculateTaxAmounts(
        updated.taxableValue,
        updated.taxType,
        field === 'sgstPercentage' ? numVal : (updated.sgstPercentage ?? 9),
        field === 'cgstPercentage' ? numVal : (updated.cgstPercentage ?? 9),
        field === 'igstPercentage' ? numVal : (updated.igstPercentage ?? 18)
      );
      return { ...updated, ...taxComputed };
    });
  };

  const handleSupplierSelect = (supplier: any) => {
    setFormData((prev: any) => ({
      ...prev,
      partyName: supplier.name,
      partyAddress: supplier.address || '',
      partyGst: supplier.gstNo || '',
    }));
    setShowSupplierDropdown(false);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setFormData((prev: any) => ({ ...prev, date: date.toISOString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partyName?.trim()) { notify.error('Party Name is required'); return; }
    if (!formData.partyInvoiceNumber?.trim()) { notify.error('Party Invoice Number is required'); return; }
    if (!formData.taxableValue || formData.taxableValue <= 0) { notify.error('Taxable Value must be greater than 0'); return; }

    setLoading(true);
    try {
      // Auto-save new party to suppliers list
      const partyNameTrimmed = formData.partyName.trim();
      const existsInSuppliers = suppliers.some(
        (s: any) => s.name.toLowerCase() === partyNameTrimmed.toLowerCase()
      );
      if (!existsInSuppliers && partyNameTrimmed) {
        try {
          await addSupplier({
            name: partyNameTrimmed,
            address: formData.partyAddress || '',
            gstNo: formData.partyGst || '',
          });
        } catch (_) { /* non-critical: ignore if supplier save fails */ }
      }

      const roundedTotal = roundGrandTotal(formData.totalAmount);
      const finalData = { ...formData, date: selectedDate.toISOString(), totalAmount: roundedTotal };

      if (isEditing && editId) {
        await updateReport(editId, finalData);
        notify.success('Purchase Report updated');
      } else {
        await createReport(finalData);
        notify.success('Purchase Report created');
      }
      navigate('/tools/purchase-report');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save';
      notify.error(msg);
    } finally { setLoading(false); }
  };

  if (pageLoading) return <FormSkeleton />;

  const fmtAmount = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="page-header flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tools/purchase-report')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0"
            title="Back to Library">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{isEditing ? 'Edit Purchase Report' : 'New Purchase Report'}</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {isEditing ? 'Update the purchase report details' : 'Record a new supplier purchase entry'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex-1 w-full space-y-8">

          {/* ── Section: Document Details ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Document Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Party Invoice No. <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.partyInvoiceNumber || ''}
                    onChange={e => handleChange('partyInvoiceNumber', e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <CustomDatePicker
                    selected={selectedDate}
                    onChange={(date: Date | null) => date && handleDateChange(date)}
                    dateFormat="dd-MM-yyyy"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Party Details ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 relative z-20 transition-all duration-300 hover:shadow-md hover:border-slate-200 overflow-visible">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Party Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Party Name with autocomplete */}
                <div className="relative z-30" ref={supplierDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Party Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.partyName || ''}
                      onChange={e => handleChange('partyName', e.target.value)}
                      onFocus={() => {
                        const filtered = suppliers.filter((s: any) =>
                          s.name.toLowerCase().includes((formData.partyName || '').toLowerCase())
                        );
                        setSupplierSearchResults(filtered);
                        if (filtered.length > 0) setShowSupplierDropdown(true);
                      }}
                      placeholder="Search or add supplier..."
                      className={`pr-10 ${inputClass}`}
                      autoComplete="off"
                      required
                    />
                    <ChevronsUpDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  {showSupplierDropdown && supplierSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="max-h-60 overflow-auto py-2">
                        <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Existing</div>
                        {supplierSearchResults.map((s: any) => (
                          <div
                            key={s._id}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group border-l-4 border-transparent hover:border-blue-500"
                            onClick={() => handleSupplierSelect(s)}
                          >
                            <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</div>
                            {s.gstNo && <div className="text-xs text-slate-400 font-medium">GST: {s.gstNo}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showSupplierDropdown && formData.partyName && supplierSearchResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-blue-900 border border-blue-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-800 text-blue-300 flex items-center justify-center">
                          <PlusCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Add as new supplier?</p>
                          <p className="text-[10px] text-blue-400 font-medium">We'll save this info for next time.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Party GST */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    GST No.
                  </label>
                  <input
                    type="text"
                    value={formData.partyGst || ''}
                    onChange={e => handleChange('partyGst', e.target.value.toUpperCase())}
                    placeholder="e.g. 33AABCU9603R1ZM"
                    className={inputClass}
                  />
                </div>

                {/* Party Address */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Address
                  </label>
                  <textarea
                    value={formData.partyAddress || ''}
                    onChange={e => handleChange('partyAddress', e.target.value)}
                    placeholder="Supplier address"
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Tax Breakdown ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Tax Breakdown</h2>

              {/* Tax Type Toggle — same as BillForm line items header */}
              <div className="ml-auto flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleChange('taxType', 'sgstcgst')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    formData.taxType === 'sgstcgst'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  SGST + CGST
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('taxType', 'igst')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    formData.taxType === 'igst'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  IGST
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Taxable Value <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.taxableValue || ''}
                    onChange={e => handleChange('taxableValue', Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`${inputClass} pl-8`}
                    required
                  />
                </div>
              </div>

              {/* Tax Adjustments - Sub-panel style matching BillForm & screenshot */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <span>TAX ADJUSTMENTS</span>
                  <div className="h-px flex-1 bg-slate-200/50"></div>
                </div>
                <TaxFieldsRow
                  taxType={formData.taxType}
                  item={formData}
                  onChange={handleTaxAdjustmentChange}
                  compact
                />
              </div>

              {/* Total Amount Display */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                {/* Round Off (automatic — same threshold logic as bills) */}
                {(() => {
                  const rounded = roundGrandTotal(formData.totalAmount);
                  const delta = rounded - formData.totalAmount;
                  return delta !== 0 ? (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-semibold text-slate-600">Round Off</span>
                      <span className={`text-xs font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl px-5 py-4 border border-slate-200/80">
                  <span className="text-sm font-bold text-slate-600">Total Amount</span>
                  <span className="text-xl font-bold text-slate-900">
                    {fmtAmount(roundGrandTotal(formData.totalAmount))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Notes ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 flex items-center justify-center">
                <StickyNote className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">General Notes</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Any remarks or additional information..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/tools/purchase-report')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Update Report' : 'Save Report'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default PurchaseReportForm;
