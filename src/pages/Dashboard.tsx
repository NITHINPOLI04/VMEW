import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CreditCard, TrendingUp, PlusCircle, Package, Eye } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import Chart from 'chart.js/auto';

const Dashboard: React.FC = () => {
  const [currentYear, setCurrentYear] = useState('2025-2026');
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { invoices, loading: invoicesLoading, error: invoicesError, fetchInvoices, getReceivedAmount } = useInvoiceStore();
  const { inventory, loading: inventoryLoading, error: inventoryError, fetchInventory } = useInventoryStore();

  const loading = invoicesLoading || inventoryLoading;

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        await Promise.all([
          fetchInvoices('2025-2026'),
          fetchInventory('2025-2026'),
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      }
    };

    loadData();
  }, [fetchInvoices, fetchInventory]);

  useEffect(() => {
    if (canvasRef.current && Array.isArray(invoices)) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx && !chartRef.current) {
        // Define months for the current financial year (April 2025 - March 2026)
        const months = [
          'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25',
          'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26'
        ];

        // Initialize monthly revenue array
        const monthlyRevenue = Array(12).fill(0);

        // Process invoices from store
        invoices.forEach(invoice => {
          const invoiceDate = new Date(invoice.date);
          const monthIndex = invoiceDate.getMonth() - 3; // April = 0, May = 1, etc.
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyRevenue[monthIndex] += invoice.grandTotal;
          }
        });

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: months,
            datasets: [{
              label: 'Revenue (₹)',
              data: monthlyRevenue,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              pointBackgroundColor: '#ef4444', // Red points
              pointBorderColor: '#fff', // White border
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.4, // Smooth curve
            }],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Amount (₹)',
                },
              },
              x: {
                title: {
                  display: true,
                  text: 'Months',
                },
              },
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
              },
            },
          },
        });
      }
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [invoices]);

  const salesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Sales').length : 0;
  const purchasesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Purchase').length : 0;

  const totalPaid = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    if (invoice.paymentStatus === 'Payment Complete') return sum + invoice.grandTotal;
    if (invoice.paymentStatus === 'Partially Paid') {
      const received = getReceivedAmount(invoice._id) || 0;
      if (received >= invoice.grandTotal) return sum + invoice.grandTotal; // Treat as fully paid if received >= grandTotal
      return sum + received; // Otherwise, add only the received amount
    }
    return sum;
  }, 0) : 0;

  const totalUnpaid = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    if (invoice.paymentStatus === 'Unpaid') return sum + invoice.grandTotal;
    if (invoice.paymentStatus === 'Partially Paid') {
      const received = getReceivedAmount(invoice._id) || 0;
      if (received >= invoice.grandTotal) return sum + 0; // Fully paid, no unpaid amount
      return sum + (invoice.grandTotal - received); // Add unpaid portion
    }
    return sum;
  }, 0) : 0;

  const totalBasicAmount = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    const itemBasicAmount = invoice.items ? invoice.items.reduce((itemSum, item) => itemSum + (item.taxableAmount || 0), 0) : 0;
    return sum + itemBasicAmount;
  }, 0) : 0;

  const totalTaxAmount = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    const invoiceTotalBasic = invoice.items ? invoice.items.reduce((itemSum, item) => itemSum + (item.taxableAmount || 0), 0) : 0;
    return sum + (invoice.grandTotal - invoiceTotalBasic);
  }, 0) : 0;

  const totalRevenue = totalBasicAmount + totalTaxAmount;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-blue-500">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Total Invoices</p>
            <h2 className="text-3xl font-bold text-slate-800">{Array.isArray(invoices) ? invoices.length : 0}</h2>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-emerald-500">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Current Year</p>
            <h2 className="text-3xl font-bold text-slate-800">{currentYear || 'N/A'}</h2>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-purple-500">
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
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Revenue Overview (FY 2025-2026)</h2>
          <canvas ref={canvasRef} width="400" height="300"></canvas>
        </div>
        <div className="grid grid-rows-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Invoice Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Paid Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Unpaid Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalUnpaid.toFixed(2)}</span>
              </div>
              <div className="w-full h-0.5 bg-gray-300 my-2"></div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Basic Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalBasicAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Tax Amount:</span>
                <span className="text-slate-800 font-medium">₹{totalTaxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Revenue:</span>
                <span className="text-slate-800 font-medium">₹{totalRevenue.toFixed(2)}</span>
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