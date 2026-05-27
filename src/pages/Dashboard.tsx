import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, PlusCircle, Package,
  AlertTriangle, ShoppingCart, BarChart3, Users, DollarSign, Activity,
  Info, X,
} from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useFinancialYearStore } from '../stores/financialYearStore';
import Chart from 'chart.js/auto';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { parseISO, isAfter, startOfDay } from 'date-fns';

const Dashboard: React.FC = () => {
  const selectedFY = useFinancialYearStore(state => state.selectedFY);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'monthly' | 'weekly'>('monthly');
  const [activeInfoCard, setActiveInfoCard] = useState<'cash' | 'growth' | 'avg' | 'clients' | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    invoices,
    creditNotes,
    debitNotes,
    loading: invoicesLoading,
    fetchInvoices,
    fetchCreditNotes,
    fetchDebitNotes,
    getReceivedAmount,
  } = useInvoiceStore();
  const { loading: inventoryLoading, fetchInventory } = useInventoryStore();

  const loading = invoicesLoading || inventoryLoading;

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        await Promise.all([
          fetchInvoices(selectedFY),
          fetchCreditNotes(selectedFY),
          fetchDebitNotes(selectedFY),
          fetchInventory(selectedFY)
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      }
    };
    loadData();
  }, [fetchInvoices, fetchCreditNotes, fetchDebitNotes, fetchInventory, selectedFY]);

  // ─── Computed ──────────────────────────────────────────
  const inv = useMemo(() => (Array.isArray(invoices) ? invoices : []), [invoices]);
  const cNotes = useMemo(() => (Array.isArray(creditNotes) ? creditNotes : []), [creditNotes]);
  const dNotes = useMemo(() => (Array.isArray(debitNotes) ? debitNotes : []), [debitNotes]);

  // Compute linked notes mapping synchronously
  const invoiceNotes = useMemo(() => {
    const map: Record<string, any[]> = {};
    cNotes.forEach((cn) => {
      if (cn.linkedInvoiceId) {
        if (!map[cn.linkedInvoiceId]) map[cn.linkedInvoiceId] = [];
        map[cn.linkedInvoiceId].push(cn);
      }
    });
    dNotes.forEach((dn) => {
      if (dn.linkedInvoiceId) {
        if (!map[dn.linkedInvoiceId]) map[dn.linkedInvoiceId] = [];
        map[dn.linkedInvoiceId].push(dn);
      }
    });
    return map;
  }, [cNotes, dNotes]);

  // Net adjusted amount calculation
  const getInvoiceNet = useCallback((i: any) => {
    const notes = invoiceNotes[i._id] || [];
    const cnTotal = notes.filter(n => n.documentType === 'credit_note').reduce((s, n) => s + (n.grandTotal || 0), 0);
    const dnTotal = notes.filter(n => n.documentType === 'debit_note').reduce((s, n) => s + (n.grandTotal || 0), 0);
    return i.grandTotal - cnTotal + dnTotal;
  }, [invoiceNotes]);

  const totalPaid = useMemo(() => inv.reduce((s, i) => {
    const netAmt = getInvoiceNet(i);
    if (i.paymentStatus === 'Payment Complete') return s + netAmt;
    if (i.paymentStatus === 'Partially Paid') return s + Math.max(0, Math.min(getReceivedAmount(i._id) || i.receivedAmount || 0, netAmt));
    return s;
  }, 0), [inv, getReceivedAmount, getInvoiceNet]);

  const totalUnpaid = useMemo(() => inv.reduce((s, i) => {
    const netAmt = getInvoiceNet(i);
    if (i.paymentStatus === 'Unpaid') return s + netAmt;
    if (i.paymentStatus === 'Partially Paid') return s + Math.max(0, netAmt - Math.max(0, getReceivedAmount(i._id) || i.receivedAmount || 0));
    return s;
  }, 0), [inv, getReceivedAmount, getInvoiceNet]);

  const totalRevenue = useMemo(() => inv.reduce((s, i) => s + getInvoiceNet(i), 0), [inv, getInvoiceNet]);

  const { now, todayStart } = useMemo(() => {
    const d = new Date();
    return { now: d, todayStart: startOfDay(d) };
  }, []);

  // No dueDate field exists — overdue tracking is not currently implemented
  const overdueCount = 0;

  const trend = useMemo(() => {
    const cur = now.getMonth(), prevM = cur === 0 ? 11 : cur - 1, prevY = cur === 0 ? now.getFullYear() - 1 : now.getFullYear();
    let curSum = 0, prevSum = 0;
    inv.forEach(i => {
      const d = new Date(i.date);
      const netAmt = getInvoiceNet(i);
      if (d.getMonth() === cur && d.getFullYear() === now.getFullYear()) curSum += netAmt;
      if (d.getMonth() === prevM && d.getFullYear() === prevY) prevSum += netAmt;
    });
    if (prevSum === 0) return { dir: 'up' as const, pct: 0 };
    const pct = Math.round(((curSum - prevSum) / prevSum) * 100);
    return { dir: pct >= 0 ? 'up' as const : 'down' as const, pct: Math.abs(pct) };
  }, [inv, now, getInvoiceNet]);

  const monthlyRevenue = useMemo(() => {
    const d = Array(12).fill(0);
    inv.forEach(i => { 
      try {
        const date = i.date ? parseISO(i.date) : null;
        if (date && !isNaN(date.getTime())) {
          const m = (date.getMonth() + 9) % 12; 
          if (m >= 0 && m < 12) d[m] += getInvoiceNet(i);
        }
      } catch (e) {
        console.warn('Invalid date in invoice:', i.date);
      }
    });
    return d;
  }, [inv, getInvoiceNet]);

  const weeklyRevenue = useMemo(() => {
    const w = Array(8).fill(0), ms = 7 * 24 * 60 * 60 * 1000;
    inv.forEach(i => { const a = Math.floor((now.getTime() - new Date(i.date).getTime()) / ms); if (a >= 0 && a < 8) w[7 - a] += getInvoiceNet(i); });
    return w;
  }, [inv, now, getInvoiceNet]);

  // ─── Smart Insights ───────────────────────────────────
  const cashTotal = totalPaid + totalUnpaid;
  const collectionRate = cashTotal > 0 ? Math.round((totalPaid / cashTotal) * 100) : 0;

  let cashHealth = { status: 'Risky', color: 'text-rose-700', icon: AlertTriangle, bg: 'bg-rose-100', dot: 'bg-rose-500' };
  if (collectionRate >= 75) cashHealth = { status: 'Good', color: 'text-emerald-700', icon: Activity, bg: 'bg-emerald-100', dot: 'bg-emerald-500' };
  else if (collectionRate >= 50) cashHealth = { status: 'Moderate', color: 'text-amber-700', icon: Activity, bg: 'bg-amber-100', dot: 'bg-amber-500' };

  const avgInvoice = inv.length > 0 ? Math.round(totalRevenue / inv.length) : 0;
  const activeClients = new Set(inv.map(i => i.buyerName)).size;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // ─── Chart ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const isM = chartMode === 'monthly';
      const labels = isM
        ? ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
        : Array.from({ length: 8 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (7 - i) * 7); return `W${d.getDate()}/${d.getMonth() + 1}`; });
      const data = isM ? monthlyRevenue : weeklyRevenue;

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Revenue (₹)',
            data,
            borderColor: '#3b82f6',
            backgroundColor: (context: any) => {
              const g = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
              g.addColorStop(0, 'rgba(59,130,246,0.18)');
              g.addColorStop(0.6, 'rgba(59,130,246,0.04)');
              g.addColorStop(1, 'rgba(59,130,246,0)');
              return g;
            },
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointHoverBorderWidth: 3,
            pointHoverBackgroundColor: '#2563eb',
            tension: 0.45,
            fill: true,
            borderWidth: 2.5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 12, bottom: 4, left: 0, right: 12 }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              padding: 12,
              cornerRadius: 8,
              bodyFont: { family: 'Inter', size: 12 },
              titleFont: { family: 'Inter', weight: 'bold', size: 12 },
              displayColors: false,
              callbacks: { label: (c: any) => `  ₹${Number(c.raw).toLocaleString('en-IN')}` },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(226,232,240,0.35)' },
              ticks: { font: { family: 'Inter', size: 10 }, color: '#94a3b8', callback: (v: any) => `₹${Number(v).toLocaleString('en-IN')}`, maxTicksLimit: 5 },
              border: { display: false },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 10 }, color: '#94a3b8' },
              border: { display: false },
            },
          },
          interaction: { intersect: false, mode: 'index' },
        },
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [inv, chartMode, monthlyRevenue, weeklyRevenue, now]);

  if (loading) return <DashboardSkeleton />;

  // ─── Action Hub items ─────────────────────────────────
  const actions = [
    { label: 'New Bill', desc: 'Create & send', icon: PlusCircle, to: '/generate-bills', gradient: 'action-hub-blue' },
    { label: 'Purchase Order', desc: 'Issue new PO', icon: ShoppingCart, to: '/purchase-order/new', gradient: 'action-hub-emerald' },
    { label: 'Inventory', desc: 'Manage stock', icon: Package, to: '/inventory', gradient: 'action-hub-amber' },
    { label: 'Bill Library', desc: 'View library', icon: BarChart3, to: '/bill-library', gradient: 'action-hub-teal' },
  ];

  return (
    <div className="dash-premium">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0 h-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Dashboard</h1>
          <p className="text-[11px] text-slate-400 mt-1">FY {selectedFY} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
        </div>
        {overdueCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-rose-50 border border-rose-100 text-rose-600 shadow-sm">
            <AlertTriangle size={12} />
            {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2 shrink-0 shadow-sm">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Smart Insight Cards (Compact View) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* 1. Cash Health */}
        <div 
          className="insight-card insight-grad-green"
          onMouseEnter={() => setActiveInfoCard('cash')}
          onMouseLeave={() => setActiveInfoCard(null)}
        >
          <div className={`kpi-info-overlay transition-all duration-300 ${
            activeInfoCard === 'cash' 
              ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' 
              : 'opacity-0 pointer-events-none translate-y-4 scale-95'
          }`}>
            <div className="flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span className="text-[9.5px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Info size={10} />
                  Cash Health Info
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 leading-normal mb-1.5">
                Calculated as: <span className="font-semibold text-emerald-300">Paid Amount</span> divided by <span className="font-semibold text-slate-100">Total Billed Amount</span>.
              </p>
              <div className="text-[8.5px] text-slate-400 flex flex-wrap gap-x-2.5 gap-y-0.5 leading-tight pt-0.5 border-t border-slate-800/40">
                <span>• <span className="text-emerald-400 font-medium">Excellent</span>: ≥90%</span>
                <span>• <span className="text-amber-400 font-medium">Good</span>: ≥60%</span>
                <span>• <span className="text-rose-400 font-medium">Risky</span>: &lt;60%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${cashHealth.dot}`} />
              Cash Health
              <button
                onClick={(e) => { e.stopPropagation(); setActiveInfoCard(activeInfoCard === 'cash' ? null : 'cash'); }}
                className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                title="How this is calculated"
              >
                <Info size={10} className="ml-1" />
              </button>
            </h3>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cashHealth.bg} shadow-sm border border-white/40`}>
              <cashHealth.icon size={13} className={cashHealth.color} />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-800 leading-tight">{cashHealth.status}</p>
          <p className="text-[10px] text-slate-500 font-medium">{collectionRate}% collected</p>
        </div>

        {/* 2. Business Growth */}
        <div 
          className="insight-card insight-grad-blue"
          onMouseEnter={() => setActiveInfoCard('growth')}
          onMouseLeave={() => setActiveInfoCard(null)}
        >
          <div className={`kpi-info-overlay transition-all duration-300 ${
            activeInfoCard === 'growth' 
              ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' 
              : 'opacity-0 pointer-events-none translate-y-4 scale-95'
          }`}>
            <div className="flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span className="text-[9.5px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Info size={10} />
                  Growth Info
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 leading-normal mb-1.5">
                Calculated as the percentage change in revenue comparing the <span className="font-semibold text-blue-300">Current Month</span> to the <span className="font-semibold text-slate-100">Previous Month</span>.
              </p>
              <p className="text-[8px] text-slate-400 italic font-mono pt-1 border-t border-slate-800/40">
                Formula: ((Current - Prev) / Prev) × 100
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Growth
              <button
                onClick={(e) => { e.stopPropagation(); setActiveInfoCard(activeInfoCard === 'growth' ? null : 'growth'); }}
                className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                title="How this is calculated"
              >
                <Info size={10} className="ml-1" />
              </button>
            </h3>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border border-white/40 ${trend.dir === 'up' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {trend.dir === 'up' ? (
                <TrendingUp size={13} className="text-emerald-700" />
              ) : (
                <TrendingDown size={13} className="text-rose-700" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 leading-tight">
            <p className="text-lg font-bold text-slate-800">
              {trend.dir === 'up' ? '+' : ''}{trend.pct}%
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">vs last period</p>
        </div>

        {/* 3. Average Deal Size */}
        <div 
          className="insight-card insight-grad-orange"
          onMouseEnter={() => setActiveInfoCard('avg')}
          onMouseLeave={() => setActiveInfoCard(null)}
        >
          <div className={`kpi-info-overlay transition-all duration-300 ${
            activeInfoCard === 'avg' 
              ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' 
              : 'opacity-0 pointer-events-none translate-y-4 scale-95'
          }`}>
            <div className="flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span className="text-[9.5px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  <Info size={10} />
                  Avg Deal Size Info
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 leading-normal mb-1.5">
                Calculated as the <span className="font-semibold text-orange-300">Total Revenue</span> divided by the <span className="font-semibold text-slate-100">Total Number of Invoices</span> generated in the selected financial year.
              </p>
              <p className="text-[8px] text-slate-400 italic font-mono pt-1 border-t border-slate-800/40">
                Formula: Total Revenue / Invoice Count
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Avg Deal Size
              <button
                onClick={(e) => { e.stopPropagation(); setActiveInfoCard(activeInfoCard === 'avg' ? null : 'avg'); }}
                className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                title="How this is calculated"
              >
                <Info size={10} className="ml-1" />
              </button>
            </h3>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-100 shadow-sm border border-white/40">
              <DollarSign size={13} className="text-orange-700" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-800 leading-tight">{fmt(avgInvoice)}</p>
          <p className="text-[10px] text-slate-500 font-medium">per invoice</p>
        </div>

        {/* 4. Active Clients */}
        <div 
          className="insight-card insight-grad-teal"
          onMouseEnter={() => setActiveInfoCard('clients')}
          onMouseLeave={() => setActiveInfoCard(null)}
        >
          <div className={`kpi-info-overlay transition-all duration-300 ${
            activeInfoCard === 'clients' 
              ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' 
              : 'opacity-0 pointer-events-none translate-y-4 scale-95'
          }`}>
            <div className="flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span className="text-[9.5px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                  <Info size={10} />
                  Active Clients Info
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 leading-normal">
                Represents the unique count of <span className="font-semibold text-teal-300">Buyer Names</span> across all invoices generated in the selected financial year.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Active Clients
              <button
                onClick={(e) => { e.stopPropagation(); setActiveInfoCard(activeInfoCard === 'clients' ? null : 'clients'); }}
                className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                title="How this is calculated"
              >
                <Info size={10} className="ml-1" />
              </button>
            </h3>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-50 shadow-sm border border-white/40">
              <Users size={13} className="text-teal-700" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-800 leading-tight">{activeClients}</p>
          <p className="text-[10px] text-slate-500 font-medium">unique buyers</p>
        </div>
      </div>

      {/* ─── HERO: Revenue Graph (Takes Remaining Height) ─────── */}
      <div className="hero-chart-card flex-1 min-h-0 flex flex-col relative z-0">
        <div className="hero-chart-bg" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Chart header with bottom border */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 border-b border-slate-100/80 rounded-t-2xl -mx-5 -mt-5 mb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                {trend.pct > 0 && (
                  <span className={`growth-badge ${trend.dir === 'up' ? 'growth-badge-up' : 'growth-badge-down'}`}>
                    {trend.dir === 'up' ? '+' : ''}{trend.pct}%
                  </span>
                )}
              </div>
              <p className="text-[26px] font-extrabold text-slate-900 mt-0.5 leading-none">{fmt(totalRevenue)}</p>
            </div>
            <div className="toggle-group shadow-sm" role="group" aria-label="Chart view mode">
              <button
                onClick={() => setChartMode('monthly')}
                className={`toggle-btn ${chartMode === 'monthly' ? 'toggle-btn-active' : ''}`}
                aria-pressed={chartMode === 'monthly'}
              >
                Monthly
              </button>
              <button
                onClick={() => setChartMode('weekly')}
                className={`toggle-btn ${chartMode === 'weekly' ? 'toggle-btn-active' : ''}`}
                aria-pressed={chartMode === 'weekly'}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Canvas Container fills remaining space */}
          <div className="flex-1 min-h-0 relative w-full pt-1 pb-1">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* ─── ACTION HUB (Compact Version) ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {actions.map(({ label, desc, icon: Icon, to, gradient }) => (
          <Link key={label} to={to} className={`action-hub-card ${gradient} group`}>
            <div className="action-hub-icon group-hover:scale-[1.05] transition-transform duration-300">
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{label}</p>
              <p className="text-[10px] font-medium opacity-70">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;