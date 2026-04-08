import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Trash2, ShoppingBag, PlusCircle, Edit, Download,
  Calendar, CheckCircle2, ReceiptText, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { usePOStore } from '../stores/poStore';
import { useFinancialYearStore } from '../stores/financialYearStore';
import { PurchaseOrder } from '../types';
import { toast } from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import TableSkeleton from '../components/TableSkeleton';
import { MetricSkeleton } from '../components/Skeleton';
import { exportStandardExcel, exportGroupedExcel } from '../utils/excelExport';

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

const PurchaseOrderLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { fetchPOs, deletePO } = usePOStore();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedYear = useFinancialYearStore(state => state.selectedFY);
  const setSelectedYear = useFinancialYearStore(state => state.setSelectedFY);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ id: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const sortBtnRef = React.useRef<HTMLButtonElement>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? 'Sort';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortRef.current && sortBtnRef.current && !sortRef.current.contains(target) && !sortBtnRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (exportRef.current && exportBtnRef.current && !exportRef.current.contains(target) && !exportBtnRef.current.contains(target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen, exportOpen]);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const currentFinancialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    const yearsList = [
      currentFinancialYear,
      `${parseInt(currentFinancialYear.split('-')[0]) - 1}-${parseInt(currentFinancialYear.split('-')[1]) - 1}`,
      `${parseInt(currentFinancialYear.split('-')[0]) - 2}-${parseInt(currentFinancialYear.split('-')[1]) - 2}`,
    ];
    setAvailableYears(yearsList);
  }, []);

  useEffect(() => {
    if (selectedYear) { loadData(); setSelectedMonth(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPOs(selectedYear);
      setPurchaseOrders(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load Purchase Orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePO(id);
      setPurchaseOrders(purchaseOrders.filter(p => p._id !== id));
      toast.success('Purchase Order deleted successfully');
    } catch (error) {
      toast.error('Failed to delete Purchase Order');
    } finally {
      setDeleteModalOpen(null);
    }
  };

  // Metrics
  const totalValue = purchaseOrders.reduce((s, p) => s + (p.grandTotal || 0), 0);
  const thisMonthCount = purchaseOrders.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).length;

  const metrics: MetricCardProps[] = [
    { label: 'Total Orders', value: purchaseOrders.length, icon: ReceiptText, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: `FY ${selectedYear}` },
    { label: 'Total Value', value: fmt(totalValue), icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `FY ${selectedYear}` },
    { label: 'This Month', value: thisMonthCount, icon: Calendar, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sub: new Date().toLocaleString('default', { month: 'long' }) },
  ];

  const sortedItems = purchaseOrders.filter(item => {
    const matchesSearch =
      (item.poNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const itemMonth = new Date(item.date).getMonth().toString();
    const matchesMonth = selectedMonth === '' || itemMonth === selectedMonth;
    return matchesSearch && matchesMonth;
  }).sort((a, b) => {
    switch (sortKey) {
      case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-high': return (b.grandTotal || 0) - (a.grandTotal || 0);
      case 'amount-low': return (a.grandTotal || 0) - (b.grandTotal || 0);
      default: return 0;
    }
  });

  const handleStandardExport = () => {
    const exportData = sortedItems.map((po: any, index) => {
      const totalTaxable = po.items.reduce((s: number, item: any) => s + (item.taxableAmount || 0), 0);
      const isIgst = po.taxType === 'igst';
      const totalIgst = po.items.reduce((s: number, item: any) => s + (item.igstAmount || 0), 0);
      const totalCgst = po.items.reduce((s: number, item: any) => s + (item.cgstAmount || 0), 0);
      const totalSgst = po.items.reduce((s: number, item: any) => s + (item.sgstAmount || 0), 0);
      return {
        'S.No': index + 1,
        'Date': new Date(po.date).toLocaleDateString('en-IN'),
        'PO Number': po.poNumber,
        'Supplier Name': po.supplierName,
        'Taxable Amount': totalTaxable,
        'IGST': isIgst ? totalIgst : 0,
        'CGST': isIgst ? 0 : totalCgst,
        'SGST': isIgst ? 0 : totalSgst,
        'Grand Total': po.grandTotal,
      };
    });
    
    exportStandardExcel(exportData, 'Purchase Orders', `Purchase_Orders_${selectedYear.replace('-', '_')}.xlsx`);
    toast.success('Exported successfully!');
  };

  const handleGroupedExport = () => {
    const allItems: any[] = [];
    sortedItems.forEach((po: any) => {
      const isIgst = po.taxType === 'igst';
      po.items.forEach((item: any, itemIndex: number) => {
        allItems.push({
          'PO Number': po.poNumber,
          'Date': new Date(po.date).toLocaleDateString('en-IN'),
          'Supplier Name': po.supplierName,
          'S.No': itemIndex + 1,
          'Description': item.description,
          'HSN/SAC Code': item.hsnSacCode || '',
          'Qty': item.quantity,
          'Unit': item.unit,
          'Rate': item.rate,
          'Taxable Amount': item.taxableAmount || 0,
          'IGST %': isIgst ? item.igstPercentage || 0 : 0,
          'IGST Amount': isIgst ? item.igstAmount || 0 : 0,
          'SGST %': isIgst ? 0 : item.sgstPercentage || 0,
          'SGST Amount': isIgst ? 0 : item.sgstAmount || 0,
          'CGST %': isIgst ? 0 : item.cgstPercentage || 0,
          'CGST Amount': isIgst ? 0 : item.cgstAmount || 0,
          'Item Total': (item.taxableAmount || 0) + (item.igstAmount || 0) + (item.sgstAmount || 0) + (item.cgstAmount || 0)
        });
      });
    });

    exportGroupedExcel(allItems, 'HSN Summary', `HSN_Summary_Sheet_PO_${selectedYear.replace('-', '_')}.xlsx`);
    toast.success('Exported successfully!');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  return (
    <div className="space-y-4 pb-10">
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
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
          {metrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-visible">
        {/* Toolbar: Search + Sort */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
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
                <div ref={sortRef} className="dropdown-panel right-0 top-full mt-2 w-48 z-40">
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

            {/* Export Dropdown */}
            <div className="relative">
              <button
                ref={exportBtnRef}
                onClick={() => setExportOpen(o => !o)}
                disabled={loading || sortedItems.length === 0}
                className={`btn btn-secondary btn-sm gap-1.5 ${exportOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {exportOpen && (
                <div ref={exportRef} className="dropdown-panel right-0 top-full mt-2 w-56 z-50">
                  <button
                    onClick={() => { handleStandardExport(); setExportOpen(false); }}
                    className="dropdown-item"
                  >
                    Export (Standard)
                  </button>
                  <button
                    onClick={() => { handleGroupedExport(); setExportOpen(false); }}
                    className="dropdown-item"
                  >
                    Export (Grouped by HSN)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <TableSkeleton columns={5} rows={10} hasTabs={false} />
        ) : currentItems.length > 0 ? (
          <div className="overflow-hidden rounded-b-[24px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="saas-table min-w-full">
                <thead>
                  <tr>
                    <th className="pl-6">PO Number</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Amount</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item: any) => (
                    <tr
                      key={item._id}
                      onClick={() => navigate(`/po-preview/${item._id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td data-label="PO Number" className="md:pl-6">
                        <Link
                          to={`/po-preview/${item._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {item.poNumber}
                        </Link>
                      </td>
                      <td data-label="Date" className="text-slate-500 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td data-label="Supplier">
                        <span className="text-slate-700 max-w-[200px] truncate block" title={item.supplierName}>
                          {item.supplierName}
                        </span>
                      </td>
                      <td data-label="Amount" className="font-medium text-slate-700 whitespace-nowrap">
                        ₹{(item.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/purchase-order/new?edit=${item._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/po-preview/${item._id}?action=download`); }}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteModalOpen({ id: item._id }); }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete PO"
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
              <ShoppingBag className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No purchase orders found</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              {searchQuery ? 'No POs match your search query.' : 'No purchase orders recorded for the selected period.'}
            </p>
            <Link to="/purchase-order/new" className="btn btn-primary btn-sm">
              <PlusCircle className="w-4 h-4" /> Create PO
            </Link>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 text-center mb-1">Delete Purchase Order</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModalOpen(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteModalOpen.id)} className="btn btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderLibrary;
