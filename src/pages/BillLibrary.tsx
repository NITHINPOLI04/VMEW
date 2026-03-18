import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Search, ChevronDown, Trash2, FileCheck,
  Clock, AlertTriangle, Download, Truck, FileSpreadsheet, PlusCircle,
  ReceiptText, ArrowUpDown, X, Calendar, CheckCircle2, XCircle, SlidersHorizontal, Edit
} from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useDCStore } from '../stores/dcStore';
import { useQuotationStore } from '../stores/quotationStore';
import { useContactStore } from '../stores/contactStore';
import { Invoice, DeliveryChallan, Quotation } from '../types';
import { toast } from 'react-hot-toast';
import { usePopper } from 'react-popper';
import * as XLSX from 'xlsx-js-style';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import { useNavigate } from 'react-router-dom';
import { parseISO, format } from 'date-fns';
import TableSkeleton from '../components/TableSkeleton';

type TabType = 'invoice' | 'dc' | 'quotation';
type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

const TABS: { key: TabType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'invoice', label: 'Tax Invoices', icon: FileText, color: 'blue' },
  { key: 'dc', label: 'Delivery Challans', icon: Truck, color: 'amber' },
  { key: 'quotation', label: 'Quotations', icon: FileSpreadsheet, color: 'emerald' },
];

const TAB_COLORS: Record<string, string> = {
  blue: 'border-blue-600 text-blue-700 bg-blue-50/60',
  amber: 'border-amber-500 text-amber-700 bg-amber-50/60',
  emerald: 'border-emerald-500 text-emerald-700 bg-emerald-50/60',
};

const months = [
  { value: '', label: 'All Months' },
  { value: '0', label: 'January' }, { value: '1', label: 'February' },
  { value: '2', label: 'March' }, { value: '3', label: 'April' },
  { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' },
  { value: '8', label: 'September' }, { value: '9', label: 'October' },
  { value: '10', label: 'November' }, { value: '11', label: 'December' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Amount: High → Low' },
  { value: 'amount-low', label: 'Amount: Low → High' },
];

// ─── Summary Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
  <div className="card p-4 flex items-start gap-3 min-w-0">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={16} className={iconColor} />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; showCaret?: boolean }> = ({ status, onClick, showCaret }) => {
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    'Payment Complete': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-200/50', icon: FileCheck },
    'Partially Paid': { cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-200/50', icon: Clock },
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

// ─── Main Component ────────────────────────────────────────────────────────────
const BillLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('invoice');

  const invoiceStore = useInvoiceStore();
  const dcStore = useDCStore();
  const quotationStore = useQuotationStore();
  const { fetchCustomers } = useContactStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dcs, setDcs] = useState<DeliveryChallan[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Primary filters (FY/Month) ──────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // ── Filter panel state ─────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  // staged (until Apply is clicked)
  const [stagedCustomer, setStagedCustomer] = useState('');
  const [stagedStatus, setStagedStatus] = useState('');
  const [stagedFromDate, setStagedFromDate] = useState('');
  const [stagedToDate, setStagedToDate] = useState('');

  // ── Search & Sort ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // ── Delete modal ───────────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ id: string; type: TabType } | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);

  const navigate = useNavigate();
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [dropdownRefEl, setDropdownRefEl] = useState<Element | null>(null);
  const [popperEl, setPopperEl] = useState<HTMLDivElement | null>(null);
  const [partialPayPopupId, setPartialPayPopupId] = useState<string | null>(null);

  const { styles: popperStyles, attributes: popperAttrs } = usePopper(dropdownRefEl, popperEl, {
    placement: 'bottom-start',
    modifiers: [
      { name: 'offset', options: { offset: [0, 4] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
    ],
  });

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const fy = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    const list = [
      fy,
      `${parseInt(fy.split('-')[0]) - 1}-${parseInt(fy.split('-')[1]) - 1}`,
      `${parseInt(fy.split('-')[0]) - 2}-${parseInt(fy.split('-')[1]) - 2}`,
    ];
    setAvailableYears(list);
    setSelectedYear(fy);
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (selectedYear) { loadData(); setSelectedMonth(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, activeTab]);

  // ── Click outside handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterPanelOpen && filterBtnRef.current && filterPanelRef.current &&
        !filterBtnRef.current.contains(target) &&
        !filterPanelRef.current.contains(target) &&
        !(target as Element).closest('.react-datepicker-popper')) {
        setFilterPanelOpen(false);
      }
      if (sortRef.current && sortBtnRef.current && !sortRef.current.contains(target) && !sortBtnRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterPanelOpen, sortOpen, createMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownOpenId && popperEl && !popperEl.contains(e.target as Node)) {
        setDropdownOpenId(null);
      }
      
      if (partialPayPopupId) {
        const target = e.target as Element;
        if (!target.closest('.partial-pay-popup-container')) {
           setPartialPayPopupId(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpenId, popperEl, partialPayPopupId]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invoice') {
        const data = await invoiceStore.fetchInvoices(selectedYear);
        setInvoices(data);
      } else if (activeTab === 'dc') {
        const data = await dcStore.fetchDCs(selectedYear);
        setDcs(data);
      } else if (activeTab === 'quotation') {
        const data = await quotationStore.fetchQuotations(selectedYear);
        setQuotations(data);
      }
      setCurrentPage(1);
    } catch {
      toast.error(`Failed to load ${activeTab}s`);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string, type: TabType) => {
    try {
      if (type === 'invoice') { await invoiceStore.deleteInvoice(id); setInvoices(inv => inv.filter(i => i._id !== id)); }
      else if (type === 'dc') { await dcStore.deleteDC(id); setDcs(d => d.filter(d => d._id !== id)); }
      else if (type === 'quotation') { await quotationStore.deleteQuotation(id); setQuotations(q => q.filter(q => q._id !== id)); }
      toast.success('Document deleted');
    } catch { toast.error('Failed to delete document'); }
    finally { setDeleteModalOpen(null); }
  };

  // ── Payment status change ───────────────────────────────────────────────────
  const handlePaymentStatusChange = async (id: string, status: string) => {
    if (activeTab !== 'invoice') return;
    try {
      await invoiceStore.updateInvoicePaymentStatus(id, status);
      setInvoices(inv => inv.map(i => i._id === id ? { ...i, paymentStatus: status } : i));
      toast.success('Payment status updated');
      setDropdownOpenId(null);
    } catch { toast.error('Failed to update payment status'); }
  };

  // ── Apply filters ───────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setFilterCustomer(stagedCustomer);
    setFilterStatus(stagedStatus);
    setFilterFromDate(stagedFromDate);
    setFilterToDate(stagedToDate);
    setCurrentPage(1);
    setFilterPanelOpen(false);
  };

  const handleClearFilters = () => {
    setStagedCustomer(''); setStagedStatus(''); setStagedFromDate(''); setStagedToDate('');
    setFilterCustomer(''); setFilterStatus(''); setFilterFromDate(''); setFilterToDate('');
    setCurrentPage(1);
  };

  const activeFilterCount = [filterCustomer, filterStatus, filterFromDate || filterToDate].filter(Boolean).length;

  // ── Processed items ─────────────────────────────────────────────────────────
  const getProcessedItems = useCallback(() => {
    let items: any[] = [];
    if (activeTab === 'invoice') items = invoices;
    else if (activeTab === 'dc') items = dcs;
    else if (activeTab === 'quotation') items = quotations;

    return items
      .filter(item => {
        const docNum = item.invoiceNumber || item.dcNumber || item.quotationNumber || '';
        const docName = item.buyerName || '';
        const matchesSearch = !searchQuery ||
          docNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
          docName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMonth = !selectedMonth ||
          new Date(item.date).getMonth().toString() === selectedMonth;
        const matchesCustomer = !filterCustomer ||
          docName.toLowerCase().includes(filterCustomer.toLowerCase());
        const matchesStatus = !filterStatus ||
          (item.paymentStatus === filterStatus);
        const itemDate = new Date(item.date);
        const matchesFrom = !filterFromDate || itemDate >= new Date(filterFromDate);
        const matchesTo = !filterToDate || itemDate <= new Date(filterToDate + 'T23:59:59');
        return matchesSearch && matchesMonth && matchesCustomer && matchesStatus && matchesFrom && matchesTo;
      })
      .sort((a, b) => {
        if (sortKey === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortKey === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortKey === 'amount-high') return (b.grandTotal || 0) - (a.grandTotal || 0);
        if (sortKey === 'amount-low') return (a.grandTotal || 0) - (b.grandTotal || 0);
        return 0;
      });
  }, [activeTab, invoices, dcs, quotations, searchQuery, selectedMonth, filterCustomer, filterStatus, filterFromDate, filterToDate, sortKey]);

  const sortedItems = getProcessedItems();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  // ── Summary metrics ─────────────────────────────────────────────────────────
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const invoiceMetrics = (() => {
    const paid = invoices.filter(i => i.paymentStatus === 'Payment Complete').reduce((s, i) => s + i.grandTotal, 0);
    const unpaid = invoices.filter(i => i.paymentStatus === 'Unpaid').reduce((s, i) => s + i.grandTotal, 0);
    const partial = invoices.filter(i => i.paymentStatus === 'Partially Paid').reduce((s, i) => s + i.grandTotal, 0);
    return [
      { label: 'Paid Amount', value: fmt(paid), icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `${invoices.filter(i => i.paymentStatus === 'Payment Complete').length} invoices` },
      { label: 'Unpaid Amount', value: fmt(unpaid), icon: XCircle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', sub: `${invoices.filter(i => i.paymentStatus === 'Unpaid').length} invoices` },
      { label: 'Partially Paid', value: fmt(partial), icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', sub: `${invoices.filter(i => i.paymentStatus === 'Partially Paid').length} invoices` },
      { label: 'Total Invoices', value: invoices.length, icon: ReceiptText, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: `FY ${selectedYear}` },
    ];
  })();

  const dcMetrics = [
    { label: 'Total Challans', value: dcs.length, icon: Truck, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sub: `FY ${selectedYear}` },
    { label: 'This Month', value: dcs.filter(d => new Date(d.date).getMonth() === new Date().getMonth()).length, icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: new Date().toLocaleString('default', { month: 'long' }) },
  ];

  const quotationMetrics = [
    { label: 'Total Quotations', value: quotations.length, icon: FileSpreadsheet, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `FY ${selectedYear}` },
    { label: 'This Month', value: quotations.filter(q => new Date(q.date).getMonth() === new Date().getMonth()).length, icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: new Date().toLocaleString('default', { month: 'long' }) },
  ];

  const currentMetrics = activeTab === 'invoice' ? invoiceMetrics : activeTab === 'dc' ? dcMetrics : quotationMetrics;

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (activeTab !== 'invoice') return toast.error('Export supported for invoices only');
    const exportData = sortedItems.map((invoice: any, index) => {
      const totalTaxable = invoice.items.reduce((s: number, item: any) => s + (item.taxableAmount || 0), 0);
      const isIgst = invoice.taxType === 'igst';
      const totalIgst = invoice.items.reduce((s: number, item: any) => s + (item.igstAmount || 0), 0);
      const totalCgst = invoice.items.reduce((s: number, item: any) => s + (item.cgstAmount || 0), 0);
      const totalSgst = invoice.items.reduce((s: number, item: any) => s + (item.sgstAmount || 0), 0);
      return {
        'S.No': index + 1,
        'Date': new Date(invoice.date).toLocaleDateString('en-IN'),
        'Invoice No': invoice.invoiceNumber,
        'Buyer GST': invoice.buyerGst || '',
        'Buyer Name': invoice.buyerName,
        'Taxable Amount': totalTaxable,
        'IGST': isIgst ? totalIgst : 0,
        'CGST': isIgst ? 0 : totalCgst,
        'SGST': isIgst ? 0 : totalSgst,
        'Grand Total': invoice.grandTotal,
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[addr]) ws[addr].s = { font: { bold: true } };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Invoices_${selectedYear.replace('-', '_')}.xlsx`);
    toast.success('Exported successfully!');
  };

  const linkTypeMap: Record<TabType, string> = { invoice: 'invoice', dc: 'dc', quotation: 'quotation' };
  const activeTabMeta = TABS.find(t => t.key === activeTab)!;
  const EmptyIcon = activeTabMeta.icon;
  const currentSortLabel = SORT_OPTIONS.find(s => s.value === sortKey)?.label || 'Newest First';

  return (
    <div className="space-y-4 pb-10">
      {/* ── Page Header ── */}
      <div className="page-header items-center">
        <div>
          <h1 className="page-title">Bill Library</h1>
        </div>

        {/* Create Document Dropdown Match Reference 3 */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="btn btn-primary bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium"
          >
            Create a Document
            <ChevronDown size={16} className={`transition-transform duration-200 ${createMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {createMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50">
              <button
                onClick={() => { navigate('/generate-bills?type=invoice'); setCreateMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
              >
                <FileText size={18} className="text-slate-500" />
                Invoice
              </button>
              <button
                onClick={() => { navigate('/generate-bills?type=dc'); setCreateMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
              >
                <Truck size={18} className="text-slate-500" />
                Delivery Challan
              </button>
              <button
                onClick={() => { navigate('/generate-bills?type=quotation'); setCreateMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
              >
                <FileSpreadsheet size={18} className="text-slate-500" />
                Quotation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FY/Month selectors ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FY</span>
          <CustomSelect
            value={selectedYear}
            options={availableYears.map(y => ({ value: y, label: y }))}
            onChange={setSelectedYear}
            className="w-[130px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</span>
          <CustomSelect
            value={selectedMonth}
            options={months}
            onChange={v => { setSelectedMonth(v); setCurrentPage(1); }}
            className="w-[140px]"
          />
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      {!loading && (
        <div className={`grid gap-3 ${activeTab === 'invoice' ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'}`}>
          {currentMetrics.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-visible">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          {TABS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setCurrentPage(1); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap min-w-[140px] ${activeTab === key ? TAB_COLORS[color] : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Search + Filter + Sort Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'dc' ? 'challans' : activeTab + 's'}...`}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <button onClick={handleClearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                <X size={11} /> Clear filters ({activeFilterCount})
              </button>
            )}

            {/* Filter button */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={() => setFilterPanelOpen(o => !o)}
                className={`btn btn-secondary btn-sm gap-1.5 ${filterPanelOpen || activeFilterCount > 0 ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
              >
                <SlidersHorizontal size={13} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Dropdown Panel */}
              {filterPanelOpen && (
                <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-5 z-40 flex flex-col gap-4">
                  {/* Customer */}
                  <CustomSelect
                    value={stagedCustomer}
                    placeholder="All Customers"
                    options={[
                      { value: '', label: 'All Customers' },
                      ...Array.from(new Set(
                        (activeTab === 'invoice' ? invoices : activeTab === 'dc' ? dcs : quotations)
                          .map((i: any) => i.buyerName).filter(Boolean)
                      )).map(name => ({ value: String(name), label: String(name) }))
                    ]}
                    onChange={setStagedCustomer}
                    buttonClassName="rounded-full py-2.5 pl-4 pr-3 text-sm border-slate-200 text-slate-700"
                  />

                  {/* Status (invoice only) */}
                  {activeTab === 'invoice' && (
                    <CustomSelect
                      value={stagedStatus}
                      placeholder="All Statuses"
                      options={[
                        { value: '', label: 'All Statuses' },
                        { value: 'Payment Complete', label: 'Payment Complete', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50' },
                        { value: 'Partially Paid', label: 'Partially Paid', colorClass: 'text-amber-700', bgClass: 'bg-amber-50' },
                        { value: 'Unpaid', label: 'Unpaid', colorClass: 'text-rose-700', bgClass: 'bg-rose-50' },
                      ]}
                      onChange={setStagedStatus}
                      buttonClassName="rounded-full py-2.5 pl-4 pr-3 text-sm border-slate-200 text-slate-700"
                    />
                  )}

                  {/* Date range */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 min-w-0">
                      <CustomDatePicker
                        selected={stagedFromDate ? parseISO(stagedFromDate) : null}
                        onChange={(date) => setStagedFromDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        placeholderText="From"
                      />
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <CustomDatePicker
                        selected={stagedToDate ? parseISO(stagedToDate) : null}
                        onChange={(date) => setStagedToDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        placeholderText="To"
                      />
                    </div>
                  </div>

                  {/* Apply */}
                  <button onClick={handleApplyFilters} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-full py-2.5 text-sm font-bold transition-colors w-full mt-2 shadow-sm">
                    Apply Filters
                  </button>
                </div>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                ref={sortBtnRef}
                onClick={() => setSortOpen(o => !o)}
                className={`btn btn-secondary btn-sm gap-1.5 ${sortOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
              >
                <ArrowUpDown size={13} />
                {currentSortLabel}
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {sortOpen && (
                <div ref={sortRef} className="dropdown-panel right-0 top-full mt-2 w-48">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortKey(opt.value); setSortOpen(false); setCurrentPage(1); }}
                      className={`dropdown-item ${sortKey === opt.value ? 'dropdown-item-active font-semibold' : ''}`}
                    >
                      {sortKey === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            {activeTab === 'invoice' && (
              <button onClick={exportToExcel} disabled={loading || sortedItems.length === 0} className="btn btn-secondary btn-sm">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={activeTab === 'dc' ? 4 : activeTab === 'invoice' ? 6 : 5} rows={10} hasTabs={false} />
        ) : currentItems.length > 0 ? (
          <div className="overflow-hidden rounded-b-[24px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="saas-table min-w-full">
                <thead>
                  <tr>
                    <th className="pl-6">Number</th>
                    <th>Date</th>
                    <th>Billed To</th>
                    {activeTab !== 'dc' && <th>Amount</th>}
                    {activeTab === 'invoice' && <th>Payment Status</th>}
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item: any) => {
                    const num = activeTab === 'invoice' ? item.invoiceNumber : activeTab === 'dc' ? item.dcNumber : item.quotationNumber;
                    const linkType = linkTypeMap[activeTab];
                    return (
                      <tr key={item._id} onClick={() => navigate(`/${linkType}-preview/${item._id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <td data-label="Number" className="md:pl-6">
                          <Link to={`/${linkType}-preview/${item._id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                            {num}
                          </Link>
                        </td>
                        <td data-label="Date" className="text-slate-500 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td data-label="Billed To">
                          <span className="text-slate-700 max-w-[200px] truncate block" title={item.buyerName}>
                            {item.buyerName}
                          </span>
                        </td>
                        {activeTab !== 'dc' && (
                          <td data-label="Amount" className="font-medium text-slate-700 whitespace-nowrap">
                            ₹{(item.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        )}
                        {activeTab === 'invoice' && (
                          <td data-label="Payment Status">
                            <div className="flex items-center gap-2">
                              <div className="relative inline-block">
                                <StatusBadge
                                  status={item.paymentStatus}
                                  showCaret
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownRefEl(e.currentTarget);
                                    setDropdownOpenId(dropdownOpenId === item._id ? null : item._id);
                                  }}
                                />
                              </div>
                              {item.paymentStatus === 'Partially Paid' && (
                                <div className="relative partial-pay-popup-container">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPartialPayPopupId(partialPayPopupId === item._id ? null : item._id);
                                    }}
                                    className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-full transition-colors flex-shrink-0"
                                    title="Pending Payment Details"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                  
                                  {partialPayPopupId === item._id && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 w-64" onClick={e => e.stopPropagation()}>
                                      <h4 className="text-sm font-medium text-slate-800 mb-3 border-b border-slate-100 pb-2">Pending Payment Details</h4>
                                      <div className="mb-3">
                                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Amount Received (₹)</label>
                                        <input
                                          type="number"
                                          value={invoiceStore.getReceivedAmount(item._id) || ''}
                                          onChange={(e) => invoiceStore.setReceivedAmount(item._id, Number(e.target.value))}
                                          className="w-full border border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 transition-shadow outline-none"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <p className="text-sm text-slate-700">
                                        Balance Amount: <span className="font-semibold text-slate-900">₹{((item.grandTotal || 0) - (invoiceStore.getReceivedAmount(item._id) || 0)).toFixed(2)}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td data-label="Actions">
                          <div className="flex items-center justify-center gap-1">
                            <Link to={`/generate-bills?type=${activeTab}&edit=${item._id}`} onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Link to={`/${linkType}-preview/${item._id}?action=download`} onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors" title="Download">
                              <Download className="h-4 w-4" />
                            </Link>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteModalOpen({ id: item._id, type: activeTab }); }} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              <EmptyIcon className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              No {activeTab === 'dc' ? 'delivery challans' : activeTab + 's'} found
            </h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              {searchQuery || activeFilterCount > 0 ? 'No documents match your search or filters.' : `No documents recorded for the selected period.`}
            </p>
            <Link to={`/generate-bills?type=${activeTab}`} className="btn btn-primary">
              <PlusCircle className="w-4 h-4" />
              Create {activeTab === 'dc' ? 'Challan' : activeTab === 'quotation' ? 'Quotation' : 'Invoice'}
            </Link>
          </div>
        )}
      </div>

      {/* ── Payment Status Dropdown (Popper) ── */}
      {dropdownOpenId && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpenId(null)} />
          <div
            ref={setPopperEl}
            style={popperStyles.popper}
            {...popperAttrs.popper}
            className="dropdown-panel w-52"
          >
            {(['Payment Complete', 'Partially Paid', 'Unpaid'] as string[]).map(status => (
              <button
                key={status}
                onClick={() => handlePaymentStatusChange(dropdownOpenId, status)}
                className="dropdown-item"
              >
                {status === 'Payment Complete' && <FileCheck className="h-4 w-4 text-emerald-500" />}
                {status === 'Partially Paid' && <Clock className="h-4 w-4 text-amber-500" />}
                {status === 'Unpaid' && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                {status}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Delete Modal ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 text-center mb-1">Delete Document</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModalOpen(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteModalOpen.id, deleteModalOpen.type)} className="btn btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillLibrary;
