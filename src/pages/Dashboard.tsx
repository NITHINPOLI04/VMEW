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

  // Ensure recentInvoices is always an array
  const recentInvoices = Array.isArray(invoices) ? invoices.slice(0, 5) : [];

  // Calculate number of Sales and Purchases
  const salesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Sales').length : 0;
  const purchasesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Purchase').length : 0;

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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Recent Invoices</h2>
          <Link to="/invoice-library" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        ) : recentInvoices.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {recentInvoices.map((invoice) => (
              <Link
                key={invoice._id}
                to={`/invoice-preview/${invoice._id}`}
                className="p-6 flex items-center hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Invoice #{invoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">{invoice.buyerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">₹{invoice.grandTotal.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">{new Date(invoice.date).toLocaleDateString()}</p>
                </div>
                <div className="ml-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      invoice.paymentStatus === 'Payment Complete'
                        ? 'bg-green-100 text-green-800'
                        : invoice.paymentStatus === 'Partially Paid'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {invoice.paymentStatus}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-medium text-slate-700 mb-2">No invoices created yet</h3>
            <p className="text-slate-500 mb-6">Get started by creating your first invoice</p>
            <Link
              to="/generate-invoice"
              className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create your first invoice
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;