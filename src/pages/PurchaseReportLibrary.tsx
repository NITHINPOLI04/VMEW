import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Trash2, ClipboardList, PlusCircle, Edit, Download,
  Calendar, CheckCircle2, ReceiptText, ArrowUpDown, ChevronDown, ChevronLeft,
  FileCheck, Clock, AlertTriangle, IndianRupee, X, Plus,
  FileText,
} from 'lucide-react';
import { usePurchaseReportStore } from '../stores/purchaseReportStore';
import { useFinancialYearStore } from '../stores/financialYearStore';
import { PurchaseReport, PurchasePaymentEntry } from '../types';
import { notify } from '../utils/notify';
import { useConfirm } from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import TableSkeleton from '../components/TableSkeleton';
import { MetricSkeleton } from '../components/Skeleton';
import { exportStandardExcel } from '../utils/excelExport';
import {
  updatePurchaseReportPaymentStatus,
  addPurchaseReportPayment,
  deletePurchaseReportPayment,
} from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';

// ─── Months ────────────────────────────────────────────────────────────────────
const months = [
  { value: '', label: 'All Months' },
  { value: '0', label: 'January' }, { value: '1', label: 'February' },
  { value: '2', label: 'March' }, { value: '3', label: 'April' },
  { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' },
  { value: '8', label: 'September' }, { value: '9', label: 'October' },
  { value: '10', label: 'November' }, { value: '11', label: 'December' },
];

type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Amount: High → Low' },
  { value: 'amount-low', label: 'Amount: Low → High' },
];

const PAYMENT_MODES = [
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
];

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; showCaret?: boolean }> = ({ status, onClick, showCaret }) => {
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    'Payment Complete': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-200/50', icon: FileCheck },
    'Advance Paid': { cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-200/50', icon: Clock },
    'Unpaid': { cls: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-200/50', icon: AlertTriangle },
  };
  const cfg = map[status] || map['Unpaid'];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {status}
      {showCaret && <ChevronDown className="h-3 w-3 opacity-60" />}
    </button>
  );
};

// ─── Metric Card ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}
const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
  <div className="card p-4 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">{label}</p>
      <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

// ─── Payment Log Panel (Centered modal — matches BillLibrary PaymentLogPanel) ──
interface PaymentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PurchaseReport | null;
  mode?: 'partial' | 'full';
  onSaved: (updated: PurchaseReport) => void;
}
const PurchasePaymentLogPanel: React.FC<PaymentLogModalProps> = ({ isOpen, onClose, report, mode = 'partial', onSaved }) => {
  const token = useAuthStore(s => s.token);
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && report) {
      const today = new Date();
      setPaymentDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      const bal = report.totalAmount - (report.receivedAmount || 0);
      setAmount(mode === 'full' && bal > 0 ? bal : '');
      setReferenceNumber('');
      setPaymentMode('NEFT');
      setNotes('');
      setShowForm(mode === 'full' || !report?.payments?.length);
    }
  }, [isOpen, report, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const payments = report.payments || [];
  const totalReceived = report.receivedAmount || 0;
  const balance = report.totalAmount - totalReceived;
  const numAmount = typeof amount === 'number' ? amount : 0;
  const balanceAfter = Math.max(0, balance - numAmount);

  const handleSave = async () => {
    if (!amount || amount <= 0) { notify.error('Enter a valid amount'); return; }
    if (!paymentDate) { notify.error('Select a payment date'); return; }
    setSaving(true);
    try {
      const result = await addPurchaseReportPayment(report._id, {
        paymentDate,
        amount: Number(amount),
        mode: paymentMode,
        referenceNumber,
        notes,
      }, token || '');
      onSaved(result.report);
      setShowForm(false);
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      notify.success('Payment entry saved');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save payment');
    } finally { setSaving(false); }
  };

  const handleDelete = async (paymentId: string) => {
    await confirm({
      title: 'Delete payment entry',
      description: 'This payment entry will be permanently removed. Continue?',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const result = await deletePurchaseReportPayment(report._id, paymentId, token || '');
          onSaved(result.report);
          notify.success('Payment entry removed');
        } catch (err: any) {
          notify.error(err.message || 'Failed to delete payment');
          throw err;
        }
      },
    });
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
      <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[640px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Dark Header — matches PaymentLogPanel */}
        <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                Payment Log
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${report.paymentStatus === 'Advance Paid'
                  ? 'text-amber-400 bg-amber-950/60 border-amber-900/50'
                  : report.paymentStatus === 'Payment Complete'
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50'
                    : 'text-rose-400 bg-rose-950/60 border-rose-900/50'
                }`}>
                {report.paymentStatus || 'Unpaid'}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mt-2 leading-snug break-words">
              {report.partyInvoiceNumber} · {report.partyName}
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
              <p className="text-base font-bold text-slate-900 mt-1">{fmt(report.totalAmount)}</p>
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
              {payments.map((p: PurchasePaymentEntry, idx: number) => (
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
                      onClick={() => handleDelete(p._id)}
                      className="p-1 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Amount</span>
                      <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Ref No.</span>
                      <span className="font-bold text-slate-800">{p.referenceNumber || '—'}</span>
                    </div>
                  </div>
                  {p.notes && (
                    <p className="text-[11px] text-slate-400 mt-2">{p.notes}</p>
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

              {/* Row 1: Date + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Payment date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                      min={0}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Ref No. + Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">UTR / Ref. no.</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow bg-white"
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

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={300}
                  placeholder="Any remarks..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow bg-white"
                />
              </div>

              {/* Live Calculation Box — matches BillLibrary */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Gross amount</span>
                  <span className="font-semibold text-slate-800">{fmt(numAmount)}</span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Balance after payment</span>
                  <span>{fmt(balanceAfter)}</span>
                </div>
              </div>

              {/* Completion notice */}
              {balanceAfter <= 0 && numAmount > 0 && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Saving this will mark the purchase report as <strong>Payment Complete</strong>.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — matches PaymentLogPanel */}
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

// ─── Main Component ────────────────────────────────────────────────────────────
const PurchaseReportLibrary: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const token = useAuthStore(s => s.token);
  const { fetchReports, deleteReport } = usePurchaseReportStore();
  const [reports, setReports] = useState<PurchaseReport[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedYear = useFinancialYearStore(state => state.selectedFY);
  const setSelectedYear = useFinancialYearStore(state => state.setSelectedFY);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Status dropdown (with popper for proper alignment)
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [dropdownRefEl, setDropdownRefEl] = useState<Element | null>(null);
  const [popperEl, setPopperEl] = useState<HTMLDivElement | null>(null);

  const { styles: popperStyles, attributes: popperAttrs } = usePopper(dropdownRefEl, popperEl, {
    placement: 'bottom-start',
    strategy: 'fixed',
    modifiers: [
      { name: 'offset', options: { offset: [0, 6] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
    ],
  });

  // Payment log panel state
  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false);
  const [paymentPanelReport, setPaymentPanelReport] = useState<PurchaseReport | null>(null);
  const [paymentPanelMode, setPaymentPanelMode] = useState<'partial' | 'full'>('partial');
  const [unpaidConfirmOpen, setUnpaidConfirmOpen] = useState(false);
  const [unpaidConfirmReport, setUnpaidConfirmReport] = useState<PurchaseReport | null>(null);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? 'Sort';

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortRef.current && sortBtnRef.current && !sortRef.current.contains(target) && !sortBtnRef.current.contains(target)) setSortOpen(false);
      if (exportRef.current && exportBtnRef.current && !exportRef.current.contains(target) && !exportBtnRef.current.contains(target)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen, exportOpen]);

  // Financial years
  useEffect(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const currentFY = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    setAvailableYears([
      currentFY,
      `${parseInt(currentFY.split('-')[0]) - 1}-${parseInt(currentFY.split('-')[1]) - 1}`,
      `${parseInt(currentFY.split('-')[0]) - 2}-${parseInt(currentFY.split('-')[1]) - 2}`,
    ]);
  }, []);

  useEffect(() => {
    if (selectedYear) { loadData(); setSelectedMonth(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchReports(selectedYear);
      setReports(data);
      setCurrentPage(1);
    } catch {
      notify.error('Failed to load Purchase Reports');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const r = reports.find(rep => rep._id === id);
    const label = r?.partyInvoiceNumber ? ` ${r.partyInvoiceNumber}` : '';
    await confirm({
      title: 'Delete Purchase Report',
      description: `Are you sure you want to delete Purchase Report${label}? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteReport(id);
          setReports(reports.filter(rep => rep._id !== id));
          notify.success('Purchase Report deleted');
        } catch (err: any) {
          notify.error(err.message || 'Failed to delete');
          throw err;
        }
      },
    });
  };

  const handlePaymentStatusChange = async (id: string, newStatus: string) => {
    setDropdownOpenId(null);
    setDropdownRefEl(null);

    const report = reports.find(r => r._id === id);
    if (!report) return;

    if (newStatus === 'Advance Paid') {
      setPaymentPanelReport(report);
      setPaymentPanelMode('partial');
      setPaymentPanelOpen(true);
      return;
    }

    if (newStatus === 'Payment Complete') {
      if (report.payments && report.payments.length > 0 && report.receivedAmount >= report.totalAmount) {
        try {
          const result = await updatePurchaseReportPaymentStatus(id, newStatus, token || '');
          setReports(prev => prev.map(r => r._id === id ? result.report : r));
          notify.success('Status updated to Payment Complete');
        } catch {
          notify.error('Failed to update status');
        }
      } else {
        setPaymentPanelReport(report);
        setPaymentPanelMode('full');
        setPaymentPanelOpen(true);
      }
      return;
    }

    if (newStatus === 'Unpaid') {
      if (report.payments && report.payments.length > 0) {
        setUnpaidConfirmReport(report);
        setUnpaidConfirmOpen(true);
      } else {
        try {
          const result = await updatePurchaseReportPaymentStatus(id, 'Unpaid', token || '');
          setReports(prev => prev.map(r => r._id === id ? result.report : r));
          notify.success('Status updated to Unpaid');
        } catch {
          notify.error('Failed to update status');
        }
      }
    }
  };

  const handleUnpaidConfirm = async () => {
    if (!unpaidConfirmReport) return;
    try {
      const result = await updatePurchaseReportPaymentStatus(unpaidConfirmReport._id, 'Unpaid', token || '');
      setReports(prev => prev.map(r => r._id === unpaidConfirmReport._id ? result.report : r));
      notify.success('All payments cleared');
    } catch {
      notify.error('Failed to clear payments');
    }
    setUnpaidConfirmOpen(false);
    setUnpaidConfirmReport(null);
  };

  const handlePaymentSaved = (updated: PurchaseReport) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
    setPaymentPanelReport(updated);
  };

  // Metrics
  const totalValue = reports.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const paidValue = reports.filter(r => r.paymentStatus === 'Payment Complete').reduce((s, r) => s + (r.totalAmount || 0), 0);
  const unpaidValue = reports.filter(r => r.paymentStatus === 'Unpaid').reduce((s, r) => s + (r.totalAmount || 0), 0);
  const advanceValue = reports.filter(r => r.paymentStatus === 'Advance Paid').reduce((s, r) => s + (r.totalAmount || 0), 0);

  const metrics: MetricCardProps[] = [
    { label: 'Total Reports', value: reports.length, icon: ReceiptText, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: `FY ${selectedYear}` },
    { label: 'Total Paid', value: fmt(paidValue), icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `${reports.filter(r => r.paymentStatus === 'Payment Complete').length} reports` },
    { label: 'Total Unpaid', value: fmt(unpaidValue), icon: AlertTriangle, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', sub: `${reports.filter(r => r.paymentStatus === 'Unpaid').length} reports` },
    { label: 'Advance Paid', value: fmt(advanceValue), icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sub: `${reports.filter(r => r.paymentStatus === 'Advance Paid').length} reports` },
  ];

  // Filter + Sort
  const sortedItems = reports.filter(item => {
    const matchesSearch =
      (item.partyInvoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.partyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.partyGst || '').toLowerCase().includes(searchQuery.toLowerCase());
    const itemMonth = new Date(item.date).getMonth().toString();
    const matchesMonth = selectedMonth === '' || itemMonth === selectedMonth;
    return matchesSearch && matchesMonth;
  }).sort((a, b) => {
    switch (sortKey) {
      case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-high': return (b.totalAmount || 0) - (a.totalAmount || 0);
      case 'amount-low': return (a.totalAmount || 0) - (b.totalAmount || 0);
      default: return 0;
    }
  });

  const handleExport = () => {
    const exportData = sortedItems.map((r, i) => ({
      'S.No': i + 1,
      'Date': new Date(r.date).toLocaleDateString('en-IN'),
      'Party Invoice No.': r.partyInvoiceNumber,
      'Party Name': r.partyName,
      'Party GST': r.partyGst || '',
      'Taxable Value': r.taxableValue,
      'IGST': r.taxType === 'igst' ? r.igstAmount : 0,
      'CGST': r.taxType === 'igst' ? 0 : r.cgstAmount,
      'SGST': r.taxType === 'igst' ? 0 : r.sgstAmount,
      'Total Amount': r.totalAmount,
      'Payment Status': r.paymentStatus || 'Unpaid',
      'Payment Method': r.payments?.[r.payments.length - 1]?.mode || '',
      'Reference No.': r.payments?.[r.payments.length - 1]?.referenceNumber || '',
    }));
    exportStandardExcel(exportData, 'Purchase Reports', `Purchase_Reports_${selectedYear.replace('-', '_')}.xlsx`);
    notify.success('Exported successfully!');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  return (
    <div className="space-y-4 pb-10">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tools')} className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0" title="Back to Tools">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="page-title">Purchase Report</h1>
        </div>
        {/* Generate button — matches "Create PO" in PurchaseOrderWorkspace */}
        <button
          onClick={() => navigate('/tools/purchase-report/new')}
          className="btn btn-primary bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          Generate Repo
        </button>
      </div>

      {/* FY / Month selectors */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FY</span>
          <CustomSelect
            value={selectedYear}
            options={availableYears.map(year => ({ value: year, label: year }))}
            onChange={setSelectedYear}
            className="w-[130px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</span>
          <CustomSelect
            value={selectedMonth}
            options={months}
            onChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}
            className="w-[140px]"
          />
        </div>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          {metrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-visible">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              id="purchase-report-search"
              type="text"
              placeholder="Search by invoice no., party name or GST..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <button ref={sortBtnRef} onClick={() => setSortOpen(o => !o)}
                className={`btn btn-secondary btn-sm gap-1.5 ${sortOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}>
                <ArrowUpDown size={13} />
                {currentSortLabel}
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {sortOpen && (
                <div ref={sortRef} className="dropdown-panel right-0 top-full mt-2 w-48 z-40">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSortKey(opt.value); setSortOpen(false); setCurrentPage(1); }}
                      className={`dropdown-item ${sortKey === opt.value ? 'dropdown-item-active font-semibold' : ''}`}>
                      {sortKey === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Export */}
            <div className="relative">
              <button ref={exportBtnRef} onClick={() => setExportOpen(o => !o)} disabled={loading || sortedItems.length === 0}
                className={`btn btn-secondary btn-sm gap-1.5 ${exportOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}>
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {exportOpen && (
                <div ref={exportRef} className="dropdown-panel right-0 top-full mt-2 w-56 z-50">
                  <button onClick={() => { handleExport(); setExportOpen(false); }} className="dropdown-item">
                    Export to Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton columns={9} rows={10} hasTabs={false} />
        ) : currentItems.length > 0 ? (
          <div className="overflow-hidden rounded-b-[24px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="saas-table min-w-full">
                <thead>
                  <tr>
                    <th className="pl-6">Party Invoice No.</th>
                    <th>Date</th>
                    <th>Party Name</th>
                    <th>Party GST</th>
                    <th>Taxable Value</th>
                    <th>IGST</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>Total Amount</th>
                    <th>Payment Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td data-label="Party Invoice No." className="md:pl-6">
                        <span className="font-semibold text-blue-600">{item.partyInvoiceNumber}</span>
                      </td>
                      <td data-label="Date" className="text-slate-500 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td data-label="Party Name">
                        <span className="text-slate-700 max-w-[180px] truncate block" title={item.partyName}>{item.partyName}</span>
                      </td>
                      <td data-label="Party GST">
                        <span className="text-slate-500 font-mono text-xs">{item.partyGst || '—'}</span>
                      </td>
                      <td data-label="Taxable Value" className="text-slate-700 whitespace-nowrap">
                        ₹{(item.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td data-label="IGST" className="text-slate-600 whitespace-nowrap">
                        {item.taxType === 'igst' ? `₹${(item.igstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td data-label="CGST" className="text-slate-600 whitespace-nowrap">
                        {item.taxType !== 'igst' ? `₹${(item.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td data-label="SGST" className="text-slate-600 whitespace-nowrap">
                        {item.taxType !== 'igst' ? `₹${(item.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td data-label="Total Amount" className="font-semibold text-slate-800 whitespace-nowrap">
                        ₹{(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td data-label="Payment Status">
                        <div className="relative inline-block">
                          <StatusBadge
                            status={item.paymentStatus || 'Unpaid'}
                            showCaret
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownRefEl(e.currentTarget);
                              setDropdownOpenId(dropdownOpenId === item._id ? null : item._id);
                            }}
                          />
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center justify-center gap-1">
                          {/* Payment Log */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentPanelReport(item);
                              setPaymentPanelMode(!item.payments || item.payments.length === 0 ? 'full' : 'partial');
                              setPaymentPanelOpen(true);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors flex-shrink-0"
                            title={!item.payments || item.payments.length === 0 ? "Add payment" : "View payment log"}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <Link
                            to={`/tools/purchase-report/edit/${item._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, sortedItems.length)}</span> of <span className="font-semibold text-slate-700">{sortedItems.length}</span>
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 7) {
                    if (currentPage <= 4) pageNum = i + 1;
                    else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
                    else pageNum = currentPage - 3 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] py-1.5 text-xs font-medium rounded-lg transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ClipboardList className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No purchase reports found</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              {searchQuery ? 'No reports match your search query.' : 'No purchase reports recorded for the selected period.'}
            </p>
            <button
              onClick={() => navigate('/tools/purchase-report/new')}
              className="btn btn-primary bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium"
            >
              <PlusCircle className="w-4 h-4" /> Generate Repo
            </button>
          </div>
        )}
      </div>

      {/* Payment Status Dropdown (popper-positioned via Portal) */}
      {dropdownOpenId && createPortal(
        <>
          <div className="fixed inset-0 z-[1100]" onClick={() => { setDropdownOpenId(null); setDropdownRefEl(null); }} />
          <div
            ref={setPopperEl}
            style={{ ...popperStyles.popper, zIndex: 1101 }}
            {...popperAttrs.popper}
            className="dropdown-panel w-52 bg-white rounded-xl shadow-2xl border border-slate-100 py-1"
          >
            {(['Payment Complete', 'Advance Paid', 'Unpaid'] as string[]).map(status => (
              <button
                key={status}
                onClick={() => handlePaymentStatusChange(dropdownOpenId, status)}
                className="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {status === 'Payment Complete' && <FileCheck className="h-4 w-4 text-emerald-500" />}
                {status === 'Advance Paid' && <Clock className="h-4 w-4 text-amber-500" />}
                {status === 'Unpaid' && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                {status}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Unpaid Confirmation Dialog */}
      {unpaidConfirmOpen && unpaidConfirmReport && createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { setUnpaidConfirmOpen(false); setUnpaidConfirmReport(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Clear all payment records?</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              This will permanently delete all <strong>{unpaidConfirmReport.payments?.length || 0}</strong> payment entries recorded for this purchase report.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setUnpaidConfirmOpen(false); setUnpaidConfirmReport(null); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnpaidConfirm}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                Clear all payments
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Payment Log Panel */}
      <PurchasePaymentLogPanel
        isOpen={paymentPanelOpen}
        onClose={() => { setPaymentPanelOpen(false); setPaymentPanelReport(null); }}
        report={paymentPanelReport}
        mode={paymentPanelMode}
        onSaved={handlePaymentSaved}
      />
    </div>
  );
};

export default PurchaseReportLibrary;
