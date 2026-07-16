import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calculator, ChevronDown, ChevronLeft, Download, RotateCcw,
  AlertTriangle, CheckCircle2, MoreVertical, FileSpreadsheet, FileText,
  Zap, Hash, TrendingUp, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import { MetricSkeleton, TableRowSkeleton } from '../components/Skeleton';
import { useFinancialYearStore, getCurrentFY } from '../stores/financialYearStore';
import { useAuthStore } from '../stores/authStore';
import { getHsnSummary, getHsnDetail } from '../utils/api';
import { exportHsnSummaryCsv, exportGroupedExcel } from '../utils/excelExport';
import { notify } from '../utils/notify';
import { HsnSummaryRow, HsnSummaryTotals, HsnDetailRow } from '../types';

type PeriodType = 'full' | 'q1' | 'q2' | 'q3' | 'q4' | 'month' | 'custom';
type ViewMode = 'summary' | 'detail';

const PERIOD_OPTIONS = [
  { value: 'full', label: 'Full Year' },
  { value: 'q1', label: 'Q1 (Apr – Jun)' },
  { value: 'q2', label: 'Q2 (Jul – Sep)' },
  { value: 'q3', label: 'Q3 (Oct – Dec)' },
  { value: 'q4', label: 'Q4 (Jan – Mar)' },
  { value: 'month', label: 'Single Month' },
  { value: 'custom', label: 'Custom Range' },
];

const getFyMonths = (fy: string) => {
  const startYr = parseInt(fy.split('-')[0]);
  return [
    { value: `${startYr}-04`, label: `April ${startYr}` },
    { value: `${startYr}-05`, label: `May ${startYr}` },
    { value: `${startYr}-06`, label: `June ${startYr}` },
    { value: `${startYr}-07`, label: `July ${startYr}` },
    { value: `${startYr}-08`, label: `August ${startYr}` },
    { value: `${startYr}-09`, label: `September ${startYr}` },
    { value: `${startYr}-10`, label: `October ${startYr}` },
    { value: `${startYr}-11`, label: `November ${startYr}` },
    { value: `${startYr}-12`, label: `December ${startYr}` },
    { value: `${startYr + 1}-01`, label: `January ${startYr + 1}` },
    { value: `${startYr + 1}-02`, label: `February ${startYr + 1}` },
    { value: `${startYr + 1}-03`, label: `March ${startYr + 1}` },
  ];
};

const getMonthEnd = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
};

const getDateRange = (
  periodType: PeriodType,
  selectedYear: string,
  selectedMonth: string,
  fromDate: string,
  toDate: string
): { from: string; to: string } => {
  const startYr = parseInt(selectedYear.split('-')[0]);
  const map: Record<string, { from: string; to: string }> = {
    full: { from: `${startYr}-04-01`, to: `${startYr + 1}-03-31` },
    q1: { from: `${startYr}-04-01`, to: `${startYr}-06-30` },
    q2: { from: `${startYr}-07-01`, to: `${startYr}-09-30` },
    q3: { from: `${startYr}-10-01`, to: `${startYr}-12-31` },
    q4: { from: `${startYr + 1}-01-01`, to: `${startYr + 1}-03-31` },
    month: { from: `${selectedMonth}-01`, to: getMonthEnd(selectedMonth) },
    custom: { from: fromDate, to: toDate },
  };
  return map[periodType];
};

const formatINR = (val: number) =>
  val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getPeriodLabel = (periodType: PeriodType, selectedYear: string, selectedMonth: string, fromDate: string, toDate: string) => {
  const opt = PERIOD_OPTIONS.find(o => o.value === periodType);
  if (periodType === 'month') {
    const months = getFyMonths(selectedYear);
    const m = months.find(m => m.value === selectedMonth);
    return m ? m.label : opt?.label || '';
  }
  if (periodType === 'custom') return `${fromDate} to ${toDate}`;
  return opt?.label || 'Full Year';
};

const HsnCalculator: React.FC = () => {
  // ── Config state ──
  const selectedYear = useFinancialYearStore(state => state.selectedFY);
  const [periodType, setPeriodType] = useState<PeriodType>('full');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Data state ──
  const [summaryData, setSummaryData] = useState<HsnSummaryRow[]>([]);
  const [totals, setTotals] = useState<HsnSummaryTotals | null>(null);
  const [detailRows, setDetailRows] = useState<HsnDetailRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── View state ──
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { token } = useAuthStore();
  const navigate = useNavigate();

  // ── Available FY list ──
  const availableYears = useMemo(() => {
    const current = getCurrentFY();
    const startYr = parseInt(current.split('-')[0]);
    return [
      current,
      `${startYr - 1}-${startYr}`,
      `${startYr - 2}-${startYr - 1}`,
    ];
  }, []);

  // ── Set default month when period = month ──
  useEffect(() => {
    if (periodType === 'month' && !selectedMonth) {
      const months = getFyMonths(selectedYear);
      setSelectedMonth(months[0].value);
    }
  }, [periodType, selectedMonth, selectedYear]);

  // ── Close menu on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mixed UQC detection ──
  const mixedUqcHsns = useMemo(() => {
    const hsnUnits: Record<string, Set<string>> = {};
    summaryData.forEach(row => {
      if (!hsnUnits[row.hsnSacCode]) hsnUnits[row.hsnSacCode] = new Set();
      hsnUnits[row.hsnSacCode].add(row.unit);
    });
    return Object.entries(hsnUnits)
      .filter(([, units]) => units.size > 1)
      .map(([hsn]) => hsn);
  }, [summaryData]);

  // ── Detail rows grouped by HSN ──
  const groupedDetailRows = useMemo(() => {
    const groups: Record<string, HsnDetailRow[]> = {};
    detailRows.forEach(row => {
      const key = row.hsnSacCode || 'No HSN';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'No HSN') return 1;
      if (b === 'No HSN') return -1;
      return a.localeCompare(b);
    });
  }, [detailRows]);

  const handleReset = () => {
    setPeriodType('full');
    setSelectedMonth('');
    setFromDate('');
    setToDate('');
    setSummaryData([]);
    setTotals(null);
    setDetailRows([]);
    setHasGenerated(false);
    setError('');
    setViewMode('summary');
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { from, to } = getDateRange(periodType, selectedYear, selectedMonth, fromDate, toDate);
      if (!from || !to) {
        setError('Please select valid date range.');
        setLoading(false);
        return;
      }
      const [sumRes, detRes] = await Promise.all([
        getHsnSummary(selectedYear, from, to, token!),
        getHsnDetail(selectedYear, from, to, token!),
      ]);
      setSummaryData(sumRes.summary);
      setTotals(sumRes.totals);
      setDetailRows(detRes.rows);
      setHasGenerated(true);
    } catch (e: any) {
      setError(e.message || 'Failed to generate HSN summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!summaryData.length) return notify.error('No data to export');
    const label = getPeriodLabel(periodType, selectedYear, selectedMonth, fromDate, toDate);
    exportHsnSummaryCsv(
      summaryData,
      label,
      `HSN_Summary_${selectedYear.replace('-', '_')}_${label.replace(/\s+/g, '_')}.csv`
    );
    notify.success('CSV exported successfully!');
    setMenuOpen(false);
  };

  const handleExportExcel = () => {
    if (!detailRows.length) return notify.error('No detail data to export');
    const label = getPeriodLabel(periodType, selectedYear, selectedMonth, fromDate, toDate);
    const flatRows = detailRows.map((row, i) => ({
      'Invoice No': row.invoiceNumber,
      'Date': new Date(row.date).toLocaleDateString('en-IN'),
      'Buyer Name': row.buyerName,
      'Buyer GST': row.buyerGst || '',
      'S.No': i + 1,
      'Description': row.description,
      'HSN/SAC Code': row.hsnSacCode || '',
      'Qty': row.quantity,
      'Unit': row.unit,
      'Rate': row.rate,
      'Taxable Amount': row.taxableAmount || 0,
      'IGST %': row.taxType === 'igst' ? row.igstPercentage || 0 : 0,
      'IGST Amount': row.taxType === 'igst' ? row.igstAmount || 0 : 0,
      'SGST %': row.taxType === 'igst' ? 0 : row.sgstPercentage || 0,
      'SGST Amount': row.taxType === 'igst' ? 0 : row.sgstAmount || 0,
      'CGST %': row.taxType === 'igst' ? 0 : row.cgstPercentage || 0,
      'CGST Amount': row.taxType === 'igst' ? 0 : row.cgstAmount || 0,
      'Item Total': (row.taxableAmount || 0) + (row.igstAmount || 0) + (row.sgstAmount || 0) + (row.cgstAmount || 0),
    }));
    exportGroupedExcel(flatRows, 'HSN Detail', `HSN_Detail_${selectedYear.replace('-', '_')}_${label.replace(/\s+/g, '_')}.xlsx`);
    notify.success('Excel exported successfully!');
    setMenuOpen(false);
  };

  const periodLabel = getPeriodLabel(periodType, selectedYear, selectedMonth, fromDate, toDate);

  return (
    <div className="space-y-4 pb-10">
      {/* ── Page Header ── */}
      <div className="page-header items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tools')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0"
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title !mb-0">HSN Summary Calculator</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              GSTR-1 Table 12 · Aggregated by HSN/SAC code
            </p>
          </div>
        </div>

        {/* Export Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={!hasGenerated || loading}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MoreVertical size={16} className="text-slate-500" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50">
              <p className="px-4 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Export</p>
              <button
                onClick={handleExportCsv}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
              >
                <FileText size={16} className="text-emerald-500" />
                Export Summary (CSV)
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
              >
                <FileSpreadsheet size={16} className="text-blue-500" />
                Export Detailed (Excel)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Config Bar ── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Financial Year */}
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Financial Year
            </label>
            <CustomSelect
              value={selectedYear}
              onChange={(v) => useFinancialYearStore.getState().setSelectedFY(v)}
              options={availableYears.map(y => ({ value: y, label: y }))}
              buttonClassName="rounded-lg py-2 pl-3 pr-2.5"
            />
          </div>

          {/* Period */}
          <div className="min-w-[170px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Period
            </label>
            <CustomSelect
              value={periodType}
              onChange={(v) => {
                setPeriodType(v as PeriodType);
                if (v !== 'month') setSelectedMonth('');
                if (v !== 'custom') { setFromDate(''); setToDate(''); }
              }}
              options={PERIOD_OPTIONS}
              buttonClassName="rounded-lg py-2 pl-3 pr-2.5"
            />
          </div>

          {/* Month selector (visible when period = month) */}
          {periodType === 'month' && (
            <div className="min-w-[170px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Month
              </label>
              <CustomSelect
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={getFyMonths(selectedYear)}
                buttonClassName="rounded-lg py-2 pl-3 pr-2.5"
              />
            </div>
          )}

          {/* Custom date pickers */}
          {periodType === 'custom' && (
            <>
              <div className="min-w-[160px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  From
                </label>
                <CustomDatePicker
                  selected={fromDate ? new Date(fromDate) : null}
                  onChange={(d) => setFromDate(d ? d.toISOString().split('T')[0] : '')}
                  placeholderText="Start date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>
              <div className="flex items-end pb-2.5">
                <span className="text-slate-300 text-sm font-medium">—</span>
              </div>
              <div className="min-w-[160px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  To
                </label>
                <CustomDatePicker
                  selected={toDate ? new Date(toDate) : null}
                  onChange={(d) => setToDate(d ? d.toISOString().split('T')[0] : '')}
                  placeholderText="End date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || (periodType === 'custom' && (!fromDate || !toDate))}
              className="px-5 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
          <button
            onClick={handleGenerate}
            className="text-sm font-semibold text-rose-600 hover:text-rose-800 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Mixed UQC Warning ── */}
      {hasGenerated && mixedUqcHsns.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            HSN{' '}
            {mixedUqcHsns.map((hsn, i) => (
              <React.Fragment key={hsn}>
                {i > 0 && ' and '}
                <span className="font-bold text-amber-900">{hsn}</span>
              </React.Fragment>
            ))}{' '}
            have items with mixed units ({mixedUqcHsns.map(hsn => {
              const units = [...new Set(summaryData.filter(r => r.hsnSacCode === hsn).map(r => r.unit))];
              return units.join(' + ');
            }).join(', ')}). They are split into separate rows below — verify UQC before filing.
          </p>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <MetricSkeleton key={i} />)}
          </div>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="animate-shimmer rounded-lg bg-slate-100 h-5 w-48" />
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="animate-shimmer rounded bg-slate-100 h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={8} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Stat Cards ── */}
      {hasGenerated && !loading && totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Taxable Value"
            value={`₹${formatINR(totals.totalTaxableAmt)}`}
            sub={`across ${totals.invoiceCount} invoices`}
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Total IGST"
            value={`₹${formatINR(totals.totalIgstAmt)}`}
            sub="inter-state transactions"
            icon={Zap}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            label="Total SGST + CGST"
            value={`₹${formatINR(totals.totalSgstAmt + totals.totalCgstAmt)}`}
            sub="intra-state transactions"
            icon={Layers}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            label="Distinct HSN Codes"
            value={totals.distinctHsnCount}
            sub={`FY ${selectedYear} · ${periodLabel}`}
            icon={Hash}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
        </div>
      )}

      {/* ── Data Table ── */}
      {hasGenerated && !loading && (
        <div className="card overflow-hidden">
          {/* Table Header with view toggle */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-800">
                GSTR-1 Table 12 — HSN Summary
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {periodLabel} · FY {selectedYear}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode tabs */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'summary'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewMode('detail')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'detail'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Detail View
                </button>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 size={12} />
                Ready to copy into GST portal
              </span>
            </div>
          </div>

          {/* Summary Table */}
          {viewMode === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">HSN / SAC</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">UQC</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Qty</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxable Value (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Integrated Tax (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Central Tax (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">State Tax (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                        No data found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    summaryData.map((row, idx) => (
                      <tr key={`${row.hsnSacCode}-${row.unit}-${row.taxType}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {row.hsnSacCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={row.description}>
                          {row.description}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-medium">{row.unit} <span className="uppercase text-slate-400">{row.unit.toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{row.totalQty.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatINR(row.totalTaxableAmt)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">{row.totalIgstAmt ? formatINR(row.totalIgstAmt) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">{row.totalCgstAmt ? formatINR(row.totalCgstAmt) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">{row.totalSgstAmt ? formatINR(row.totalSgstAmt) : '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatINR(row.totalValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {totals && summaryData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300">
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-slate-700">
                        TOTAL ({totals.distinctHsnCount} HSN codes · {periodLabel} FY {selectedYear})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">—</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatINR(totals.totalTaxableAmt)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{totals.totalIgstAmt ? formatINR(totals.totalIgstAmt) : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{totals.totalCgstAmt ? formatINR(totals.totalCgstAmt) : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{totals.totalSgstAmt ? formatINR(totals.totalSgstAmt) : '—'}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">{formatINR(totals.totalValue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Detail Table */}
          {viewMode === 'detail' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice No</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Buyer Name</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">HSN</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rate</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxable (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">IGST (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">SGST (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">CGST (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDetailRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-slate-400 text-sm">
                        No detail data found.
                      </td>
                    </tr>
                  ) : (
                    groupedDetailRows.map(([hsn, items]) => {
                      const grpTaxable = items.reduce((s, r) => s + (r.taxableAmount || 0), 0);
                      const grpTax = items.reduce((s, r) => s + (r.igstAmount || 0) + (r.sgstAmount || 0) + (r.cgstAmount || 0), 0);
                      return (
                        <React.Fragment key={hsn}>
                          {/* Group header */}
                          <tr className="bg-blue-50/60 border-y border-blue-100">
                            <td colSpan={13} className="px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">{hsn}</span>
                                  <span className="text-sm font-semibold text-blue-800">{items[0]?.description}</span>
                                </div>
                                <span className="text-xs text-blue-500 font-medium">
                                  {items.length} items · Taxable ₹{formatINR(grpTaxable)} · Tax ₹{formatINR(grpTax)}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* Item rows */}
                          {items.map((row, idx) => {
                            const itemTotal = (row.taxableAmount || 0) + (row.igstAmount || 0) + (row.sgstAmount || 0) + (row.cgstAmount || 0);
                            return (
                              <tr key={`${hsn}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2.5 text-slate-700 font-medium text-xs">{row.invoiceNumber}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-xs">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                                <td className="px-3 py-2.5 text-slate-700 text-xs max-w-[120px] truncate" title={row.buyerName}>{row.buyerName}</td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-[11px] font-bold text-amber-700">{row.hsnSacCode}</span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 text-xs max-w-[150px] truncate" title={row.description}>{row.description}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-slate-800 text-xs">{row.quantity}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-xs">{row.unit}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 text-xs">{formatINR(row.rate)}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-slate-800 text-xs">{formatINR(row.taxableAmount)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 text-xs">{row.igstAmount ? formatINR(row.igstAmount) : '—'}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 text-xs">{row.sgstAmount ? formatINR(row.sgstAmount) : '—'}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 text-xs">{row.cgstAmount ? formatINR(row.cgstAmount) : '—'}</td>
                                <td className="px-3 py-2.5 text-right font-bold text-slate-900 text-xs">{formatINR(itemTotal)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State (before Generate) ── */}
      {!hasGenerated && !loading && !error && (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Calculator size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-500 mb-1.5">
              Generate HSN Summary
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Select a period above and click <strong>Generate</strong> to produce your HSN summary for GSTR-1 filing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stat Card sub-component ──
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
  <div className="card p-4 flex items-start gap-3 min-w-0">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={16} className={iconColor} />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold leading-tight truncate text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

export default HsnCalculator;
