import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link as LinkIcon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notify } from '../utils/notify';
import CustomSelect from './CustomSelect';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useFinancialYearStore } from '../stores/financialYearStore';

interface RaiseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteType: 'credit_note' | 'debit_note';
  parentInvoice: any | null;
}

const getNextNoteNumber = (notes: any[], prefix: 'CN' | 'DN') => {
  const numbers = notes
    .map(n => n.invoiceNumber || '')
    .filter(num => num.toUpperCase().replace(/\s/g, '').startsWith(prefix))
    .map(num => {
      const match = num.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextVal = max + 1;
  return `${prefix} - ${String(nextVal).padStart(2, '0')}`;
};

const RaiseNoteModal: React.FC<RaiseNoteModalProps> = ({
  isOpen,
  onClose,
  noteType,
  parentInvoice,
}) => {
  const navigate = useNavigate();
  const invoiceStore = useInvoiceStore();
  const selectedYear = useFinancialYearStore(state => state.selectedFY);

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [noteNumber, setNoteNumber] = useState('');
  const [error, setError] = useState('');

  // Set date and load dynamic sequence number on open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setReason('');
      setNoteNumber('');
      setError('');

      if (selectedYear) {
        const loadNextNumber = async () => {
          try {
            const prefix = noteType === 'credit_note' ? 'CN' : 'DN';
            let notes = noteType === 'credit_note' ? invoiceStore.creditNotes : invoiceStore.debitNotes;
            if (noteType === 'credit_note') {
              notes = await invoiceStore.fetchCreditNotes(selectedYear);
            } else {
              notes = await invoiceStore.fetchDebitNotes(selectedYear);
            }
            const num = getNextNoteNumber(notes, prefix);
            setNoteNumber(num);
          } catch (err) {
            console.error('Failed to load next note number:', err);
            const prefix = noteType === 'credit_note' ? 'CN' : 'DN';
            setNoteNumber(`${prefix} - 01`);
          }
        };
        loadNextNumber();
      }
    }
  }, [isOpen, noteType, selectedYear]);

  // Trap body scroll and handle Escape key when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !parentInvoice) return null;

  const isCredit = noteType === 'credit_note';
  const title = isCredit ? 'Raise credit note' : 'Raise debit note';
  const subtitle = isCredit
    ? "Reduces buyer's payable"
    : "Increases buyer's payable";

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason');
      return;
    }

    const prefillState = {
      documentType: noteType,
      linkedInvoiceId: parentInvoice._id,
      linkedInvoiceNumber: parentInvoice.invoiceNumber,
      reason,
      date: new Date(date).toISOString(),

      // Client/order details
      buyerName: parentInvoice.buyerName,
      buyerAddress: parentInvoice.buyerAddress,
      buyerGst: parentInvoice.buyerGst,
      buyerPan: parentInvoice.buyerPan || '',
      buyerMsme: parentInvoice.buyerMsme || '',
      vessel: parentInvoice.vessel || '',
      poNumber: parentInvoice.poNumber || '',
      dcNumber: parentInvoice.dcNumber || '',
      ewayBillNo: parentInvoice.ewayBillNo || '',

      // Items and pricing details (clone parent invoice items and calculation totals)
      items: parentInvoice.items ? parentInvoice.items.map((it: any) => ({
        ...it,
        id: it.id || Date.now().toString() + Math.random().toString(), // ensure unique client-side key
      })) : [],
      taxType: parentInvoice.taxType || 'sgstcgst',
      discountEnabled: parentInvoice.discountEnabled || false,
      discountPercentage: parentInvoice.discountPercentage || 0,
      discountAmount: parentInvoice.discountAmount || 0,
      discountType: parentInvoice.discountType || 'percentage',
      discountFixedAmount: parentInvoice.discountFixedAmount || 0,
      subTotal: parentInvoice.subTotal || 0,
      totalSgst: parentInvoice.totalSgst || 0,
      totalCgst: parentInvoice.totalCgst || 0,
      totalIgst: parentInvoice.totalIgst || 0,
      grandTotal: parentInvoice.grandTotal || 0,

      invoiceNumber: noteNumber,
    };

    onClose();
    navigate('/generate-bills', { state: prefillState });
  };

  const formattedAmount = `₹${(parentInvoice.grandTotal || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  const reasonOptions = [
    { value: 'Sales return', label: 'Sales return' },
    { value: 'Price correction', label: 'Price correction' },
    { value: 'Discount adjustment', label: 'Discount adjustment' },
    { value: 'Damaged goods', label: 'Damaged goods' },
    { value: 'Other', label: 'Other' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-in sidebar panel */}
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col z-[1110] animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between bg-[#0F172A] relative shrink-0">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                {isCredit ? 'CREDIT NOTE' : 'DEBIT NOTE'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                · {subtitle}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mt-2 leading-snug break-words">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Form */}
        <form onSubmit={handleContinue} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Linked Invoice Banner */}
          <div className="flex gap-3 px-4 py-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
              <LinkIcon size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Linked to invoice</p>
              <p className="text-sm font-semibold text-blue-900 truncate mt-0.5">
                {parentInvoice.invoiceNumber} — {parentInvoice.buyerName} — {formattedAmount}
              </p>
            </div>
          </div>

          {/* Note Number & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                {isCredit ? 'Credit Note No. *' : 'Debit Note No. *'}
              </label>
              <input
                type="text"
                value={noteNumber}
                readOnly
                placeholder="Auto-generating..."
                className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium"
              />
            </div>
          </div>

          {/* Reason Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Reason *
            </label>
            <CustomSelect
              value={reason}
              options={reasonOptions}
              onChange={(val) => {
                setReason(val);
                setError('');
              }}
              placeholder="Select a reason..."
              buttonClassName="rounded-xl py-2.5 pl-4 pr-3 text-sm border-slate-200 text-slate-700 font-semibold"
            />
            {error && (
              <p className="text-xs text-rose-500 font-medium mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </p>
            )}
          </div>

          {/* Buyer Name & GST */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Buyer Name
              </label>
              <input
                type="text"
                value={parentInvoice.buyerName}
                readOnly
                className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                GST No.
              </label>
              <input
                type="text"
                value={parentInvoice.buyerGst || ''}
                readOnly
                className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          {/* Buyer Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Buyer Address
            </label>
            <textarea
              value={parentInvoice.buyerAddress}
              readOnly
              rows={2}
              className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-medium cursor-not-allowed resize-none"
            />
          </div>

          {/* Bottom Info Note */}
          <div className="flex gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-2xl text-slate-600">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">
              Items and amounts will be filled in the next step on the full form page.
            </p>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-md shadow-blue-600/10 flex items-center gap-1.5"
          >
            Continue to form →
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default RaiseNoteModal;
