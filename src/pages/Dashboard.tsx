import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CreditCard, TrendingUp, PlusCircle, Package, Eye } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';

const Dashboard: React.FC = () => {
  const [currentYear, setCurrentYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { invoices, loading: invoicesLoading, error: invoicesError, fetchInvoices } = useInvoiceStore();
  const { inventory, loading: inventoryLoading, error: inventoryError, fetchInventory } = useInventoryStore();

  const loading = invoicesLoading || inventoryLoading;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);

        // Get current financial year in format YYYY-YYYY
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        const financialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        setCurrentYear(financialYear);

        // Fetch invoices and inventory in parallel
        await Promise.all([
          fetchInvoices(financialYear),
          fetchInventory(financialYear),
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      }
    };

    loadData();
  }, [fetchInvoices, fetchInventory]);

  // Calculate monthly revenue from paid invoices
  useEffect(() => {
    if (canvasRef.current && Array.isArray(invoices)) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Get last 12 months (June 2024 - May 2025)
        const months = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        }

        // Calculate revenue per month (only paid invoices)
        const monthlyRevenue = Array(12).fill(0);
        invoices.forEach(invoice => {
          if (invoice.paymentStatus === 'Payment Complete') {
            const invoiceDate = new Date(invoice.date);
            const monthIndex = (today.getMonth() - invoiceDate.getMonth() + 12) % 12;
            if (monthIndex >= 0 && monthIndex < 12) {
              monthlyRevenue[monthIndex] += invoice.grandTotal;
            }
          }
        });

        // Draw line plot
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        const maxRevenue = Math.max(...monthlyRevenue, 1000); // Minimum 1000 for scale
        const xStep = canvasRef.current.width / (months.length - 1);
        const yScale = 200 / maxRevenue;

        monthlyRevenue.forEach((revenue, index) => {
          const x = index * xStep;
          const y = 250 - (revenue * yScale);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Add data points
        ctx.fillStyle = '#3b82f6';
        monthlyRevenue.forEach((revenue, index) => {
          const x = index * xStep;
          const y = 250 - (revenue * yScale);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        // Add month labels
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        months.forEach((month, index) => {
          const x = index * xStep;
          ctx.fillText(month, x, 270);
        });

        // Add y-axis label (revenue)
        ctx.save();
        ctx.translate(10, 130);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Revenue (₹)', 0, 0);
        ctx.restore();
      }
    }
  }, [invoices]);

  // Calculate number of Sales and Purchases
  const salesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Sales').length : 0;
  const purchasesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Purchase').length : 0;

  // Calculate total amounts
  const totalPaid = Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'Payment Complete').reduce((sum, invoice) => sum + invoice.grandTotal, 0) : 0;
  const totalUnpaid = Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'Unpaid').reduce((sum, invoice) => sum + invoice.grandTotal, 0) : 0;
  const totalPartiallyPaid = Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'Partially Paid').reduce((sum, invoice) => sum + invoice.grandTotal, 0) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Invoices */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Total Invoices</p>
            <h2 className="text-3xl font-bold text-slate-800">{Array.isArray(invoices) ? invoices.length : 0}</h2>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Current Year */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Current Year</p>
            <h2 className="text-3xl font-bold text-slate-800">{currentYear || 'N/A'}</h2>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        {/* Inventory Details */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Inventory</p>
            <p className="text-lg font-medium text-slate-800">Sales: {salesCount}</p>
            <p className="text-lg font-medium text-slate-800">Purchases: {purchasesCount}</p>
          </div>
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-900">
            <Package className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Revenue Overview (Last 12 Months)</h2>
          <canvas ref={canvasRef} width="400" height="300"></canvas>
        </div>
        <div className="grid grid-rows-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Invoice Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Paid Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unpaid Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalUnpaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Partially Paid Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalPartiallyPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div className="space-x-4">
              <Link
                to="/generate-invoice"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Generate Invoice
              </Link>
              <Link
                to="/invoice-library"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Eye className="h-4 w-4 mr-2" /> View Invoice Library
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;