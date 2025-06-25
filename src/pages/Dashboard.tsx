import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CreditCard, TrendingUp, PlusCircle, Package } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';

const Dashboard: React.FC = () => {
  const [currentYear, setCurrentYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { invoices, loading: invoicesLoading, error: invoicesError, fetchInvoices } = useInvoiceStore();
  const { inventory, loading: inventoryLoading, error: inventoryError, fetchInventory } = useInventoryStore();

  const loading = invoicesLoading || inventoryLoading;

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

  // Calculate number of Sales and Purchases
  const salesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Sales').length : 0;
  const purchasesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Purchase').length : 0;

  // Calculate Net Revenue and Receivables
  const netRevenue = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0) : 0;
  const totalReceivables = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => sum + (invoice.paymentStatus !== 'Payment Complete' ? invoice.grandTotal : 0), 0) : 0;
  const overdueAmount = totalReceivables; // Assuming all receivables are overdue for this example

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Net Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 font-medium">Net Revenue</p>
              <h2 className="text-3xl font-bold text-slate-800">₹{netRevenue.toFixed(2)}</h2>
              <p className="text-green-600 font-medium">486.9% ↑ Year On Year</p>
            </div>
          </div>
          <div className="h-40">
            <svg className="w-full h-full">
              {/* Simplified graph representation */}
              <path d="M10 120 Q 50 20 90 120 T 170 120" stroke="green" fill="none" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Receivable Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 font-medium">Receivable Summary</p>
              <p className="text-lg font-medium text-slate-800">Total Receivables: ₹{totalReceivables.toFixed(2)}</p>
              <p className="text-orange-600 font-medium">Overdue: ₹{overdueAmount.toFixed(2)}</p>
              <p className="text-slate-500 font-medium">Current: ₹0.00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center border-b border-slate-200 mb-4">
          <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
        </div>
        <div className="flex space-x-4">
          <Link
            to="/generate-invoice"
            className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            New Invoice
          </Link>
          <Link
            to="/invoice-library"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <FileText className="h-5 w-5 mr-2" />
            View Invoice Library
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
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
  );
};

export default Dashboard;