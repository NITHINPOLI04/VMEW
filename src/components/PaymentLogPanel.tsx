import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2, IndianRupee } from 'lucide-react';
import { Invoice, PaymentEntry } from '../types';
import { addPaymentEntry, deletePaymentEntry } from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { notify } from '../utils/notify';
import { useConfirm } from './ConfirmDialog';
import CustomSelect from './CustomSelect';

interface PaymentLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  mode: 'partial' | 'full';
  onSaved: (updatedInvoice: Invoice) => void;
}

const PAYMENT_MODES = [
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
];

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentLogPanel: React.FC<PaymentLogPanelProps> = ({ isOpen, onClose, invoice, mode, onSaved }) => {
  const token = useAuthStore(s => s.token);
  const confirm = useConfirm();

  // New entry form state
  const [showForm, setShowForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [grossAmount, setGrossAmount] = useState<number | ''>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [deductionsExpanded, setDeductionsExpanded] = useState(false);

  // Deduction fields
  const [ldRecovery, setLdRecovery] = useState(0);
  const [itTds, setItTds] = useState(0);
  const [otherPermanent, setOtherPermanent] = useState(0);
  const [otherPermanentNote, setOtherPermanentNote] = useState('');
  const [gstTds, setGstTds] = useState(0);
  const [gstRetention, setGstRetention] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [bankGuarantee, setBankGuarantee] = useState(0);
  const [otherRecoverable, setOtherRecoverable] = useState(0);
  const [otherRecoverableNote, setOtherRecoverableNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when panel opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setPaymentDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      setGrossAmount('');
      setUtrNumber('');
      setPaymentMode('NEFT');
      setDeductionsExpanded(false);
      setLdRecovery(0); setItTds(0); setOtherPermanent(0); setOtherPermanentNote('');
      setGstTds(0); setGstRetention(0); setSecurityDeposit(0); setBankGuarantee(0);
      setOtherRecoverable(0); setOtherRecoverableNote('');
      setErrors({});
      // In 'full' mode or first payment, show form immediately
      setShowForm(mode === 'full' || !(invoice?.payments?.length));
    }
  }, [isOpen, mode, invoice]);

  // Body scroll lock + Escape
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose]);

  // Computed values
  const payments = useMemo(() => invoice?.payments || [], [invoice]);
  const totalReceived = useMemo(() => payments.reduce((s, p) => s + p.netAmount, 0), [payments]);
  const balance = useMemo(() => (invoice?.grandTotal || 0) - totalReceived, [invoice, totalReceived]);

  const gross = typeof grossAmount === 'number' ? grossAmount : 0;
  const totalPermanentDed = ldRecovery + itTds + otherPermanent;
  const totalRecoverableDed = gstTds + gstRetention + securityDeposit + bankGuarantee + otherRecoverable;
  const totalDeductions = totalPermanentDed + totalRecoverableDed;
  const netReceived = Math.max(0, gross - totalDeductions);
  const balanceAfter = (invoice?.grandTotal || 0) - totalReceived - netReceived;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!paymentDate) errs.paymentDate = 'Payment date is required';
    if (!gross || gross <= 0) errs.grossAmount = 'Gross amount must be > 0';
    if (netReceived < 0) errs.grossAmount = 'Deductions exceed gross amount';
    if (totalReceived + netReceived > (invoice?.grandTotal || 0) + 1) {
      errs.grossAmount = 'Total received would exceed invoice total';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !invoice || !token) return;
    setSaving(true);
    try {
      const entry = {
        paymentDate,
        grossAmount: gross,
        mode: paymentMode as PaymentEntry['mode'],
        utrNumber,
        notes: '',
        ldRecovery, itTds, otherPermanent, otherPermanentNote,
        gstTds, gstRetention, securityDeposit, bankGuarantee,
        otherRecoverable, otherRecoverableNote,
      };
      const { invoice: updated } = await addPaymentEntry(invoice._id, entry, token);
      notify.success('Payment entry saved');
      onSaved(updated);
      onClose();
    } catch (err: any) {
      notify.error(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!invoice || !token) return;
    await confirm({
      title: 'Delete payment entry',
      description: 'This payment entry will be permanently removed. Continue?',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const { invoice: updated } = await deletePaymentEntry(invoice._id, paymentId, token);
          notify.success('Payment entry removed');
          onSaved(updated);
        } catch (err: any) {
          notify.error(err.message || 'Failed to delete payment');
          throw err;
        }
      }
    });
  };

  if (!isOpen || !invoice) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
      <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[640px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Dark Header */}
        <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                Payment Log
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                invoice.paymentStatus === 'Partially Paid'
                  ? 'text-amber-400 bg-amber-950/60 border-amber-900/50'
                  : invoice.paymentStatus === 'Payment Complete'
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50'
                  : 'text-rose-400 bg-rose-950/60 border-rose-900/50'
              }`}>
                {invoice.paymentStatus}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mt-2 leading-snug break-words">
              {invoice.invoiceNumber} · {invoice.buyerName}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5 max-h-[60vh]">
          {/* Running Balance Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Invoice Total</p>
              <p className="text-base font-bold text-slate-900 mt-1">{fmt(invoice.grandTotal)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Total Received</p>
              <p className="text-base font-bold text-emerald-700 mt-1">{fmt(totalReceived)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
              <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Balance Due</p>
              <p className="text-base font-bold text-amber-700 mt-1">{fmt(Math.max(0, balance))}</p>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="space-y-2.5">
              {payments.map((p, idx) => (
                <div key={p._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Payment {idx + 1}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{p.mode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p._id)}
                      className="p-1 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Gross received</span>
                      <span className="font-bold text-slate-800">{fmt(p.grossAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Deductions</span>
                      <span className="font-bold text-rose-600">
                        {p.totalPermanentDeductions + p.totalRecoverableDeductions > 0
                          ? `−${fmt(p.totalPermanentDeductions + p.totalRecoverableDeductions)}`
                          : '₹0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Net received</span>
                      <span className="font-bold text-emerald-700">{fmt(p.netAmount)}</span>
                    </div>
                  </div>
                  {p.utrNumber && (
                    <p className="text-[11px] text-slate-400 mt-2">UTR: {p.utrNumber}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add another payment button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add another payment
            </button>
          )}

          {/* New Payment Entry Form */}
          {showForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">New Payment Entry</h3>

              {/* Row 1: Date + Gross Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Payment date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow ${errors.paymentDate ? 'border-rose-400' : 'border-slate-200'}`}
                  />
                  {errors.paymentDate && <p className="text-xs text-rose-500 mt-1">{errors.paymentDate}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Gross amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                    <input
                      type="number"
                      value={grossAmount}
                      onChange={e => setGrossAmount(e.target.value ? Number(e.target.value) : '')}
                      min={0}
                      placeholder="0"
                      className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow ${errors.grossAmount ? 'border-rose-400' : 'border-slate-200'}`}
                    />
                  </div>
                  {errors.grossAmount && <p className="text-xs text-rose-500 mt-1">{errors.grossAmount}</p>}
                </div>
              </div>

              {/* Row 2: UTR + Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">UTR / Ref. no.</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Payment mode</label>
                  <CustomSelect
                    value={paymentMode}
                    options={PAYMENT_MODES}
                    onChange={setPaymentMode}
                    buttonClassName="rounded-lg py-2 text-sm"
                  />
                </div>
              </div>

              {/* Deductions toggle */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setDeductionsExpanded(!deductionsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
                      <IndianRupee size={14} />
                      Deductions from payment advice
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Optional — skip for non-government clients</span>
                  </div>
                  {deductionsExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {deductionsExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    {/* Permanent deductions */}
                    <div className="grid grid-cols-2 gap-3">
                      <DeductionField label="LD recovery" sublabel="Permanent" value={ldRecovery} onChange={setLdRecovery} color="rose" />
                      <DeductionField label="IT-TDS" sublabel="Permanent" value={itTds} onChange={setItTds} color="rose" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DeductionField label="Other deductions" sublabel="Permanent" value={otherPermanent} onChange={setOtherPermanent} color="rose" />
                        {otherPermanent > 0 && (
                          <input
                            type="text"
                            value={otherPermanentNote}
                            onChange={e => setOtherPermanentNote(e.target.value)}
                            placeholder="Add note..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 mt-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        )}
                      </div>
                      <div /> {/* Spacer */}
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Recoverable deductions */}
                    <div className="grid grid-cols-2 gap-3">
                      <DeductionField label="GST-TDS" sublabel="Recoverable" value={gstTds} onChange={setGstTds} color="amber" />
                      <DeductionField label="GST Retention" sublabel="Recoverable" value={gstRetention} onChange={setGstRetention} color="amber" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DeductionField label="Security deposit" sublabel="Recoverable" value={securityDeposit} onChange={setSecurityDeposit} color="amber" />
                      <DeductionField label="Bank guarantee" sublabel="Recoverable" value={bankGuarantee} onChange={setBankGuarantee} color="amber" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DeductionField label="Other recoverable" sublabel="Recoverable" value={otherRecoverable} onChange={setOtherRecoverable} color="amber" />
                        {otherRecoverable > 0 && (
                          <input
                            type="text"
                            value={otherRecoverableNote}
                            onChange={e => setOtherRecoverableNote(e.target.value)}
                            placeholder="Add note..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 mt-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        )}
                      </div>
                      <div /> {/* Spacer */}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Calculation Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Gross amount</span>
                  <span className="font-semibold text-slate-800">{fmt(gross)}</span>
                </div>
                {totalPermanentDed > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Permanent deductions (LD)</span>
                    <span className="font-semibold">−{fmt(totalPermanentDed)}</span>
                  </div>
                )}
                {totalRecoverableDed > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Recoverable deductions</span>
                    <span className="font-semibold">−{fmt(totalRecoverableDed)}</span>
                  </div>
                )}
                {totalDeductions === 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Total deductions</span>
                    <span className="font-semibold">−₹0.00</span>
                  </div>
                )}
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Net received</span>
                  <span>{fmt(netReceived)}</span>
                </div>
              </div>

              {/* Warning notes */}
              {totalRecoverableDed > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Recoverable deductions keep status as <strong>Partially Paid</strong>. Status auto-updates to Payment Complete only when running balance = ₹0 with no recoverable deductions pending.</span>
                </div>
              )}
              {balanceAfter <= 0 && totalRecoverableDed === 0 && gross > 0 && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Saving this will mark the invoice as <strong>Payment Complete</strong>.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-[14px] font-semibold rounded-[10px] hover:bg-slate-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          {showForm && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-[10px] transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save payment entry'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Deduction Field Component ───────────────────────────────────────────────
const DeductionField: React.FC<{
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  color: 'rose' | 'amber';
}> = ({ label, sublabel, value, onChange, color }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
        color === 'rose' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
      }`}>{sublabel}</span>
    </div>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        min={0}
        placeholder="0"
        className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
      />
    </div>
  </div>
);

export default PaymentLogPanel;
