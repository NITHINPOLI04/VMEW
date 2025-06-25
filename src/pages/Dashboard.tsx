import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { FileText, CreditCard, TrendingUp, PlusCircle, Package, Eye } from 'lucide-react'; // Import icons for visual elements
import { useInvoiceStore } from '../stores/invoiceStore'; // Custom hook for invoice data management
import { useInventoryStore } from '../stores/inventoryStore'; // Custom hook for inventory data management

const Dashboard: React.FC = () => {
  // State to track the current financial year
  const [currentYear, setCurrentYear] = useState('');
  // State to handle errors during data fetching
  const [error, setError] = useState<string | null>(null);

  // Destructure invoice store methods and data
  const { invoices, loading: invoicesLoading, error: invoicesError, fetchInvoices, getReceivedAmount } = useInvoiceStore();
  // Destructure inventory store methods and data
  const { inventory, loading: inventoryLoading, error: inventoryError, fetchInventory } = useInventoryStore();

  // Combine loading states for both invoices and inventory
  const loading = invoicesLoading || inventoryLoading;
  // Reference for the canvas element to draw the revenue plot
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Effect to fetch initial data when the component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null); // Clear any previous errors

        const today = new Date(); // Get current date
        const month = today.getMonth(); // 0-11, where 3 is April (start of financial year)
        const year = today.getFullYear(); // Current year
        // Determine financial year (April to March)
        const financialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        setCurrentYear(financialYear); // Set the current financial year

        // Fetch invoices and inventory data in parallel
        await Promise.all([
          fetchInvoices(financialYear),
          fetchInventory(financialYear),
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err); // Log error for debugging
        setError('Failed to load dashboard data. Please try again later.'); // Set error message
      }
    };

    loadData(); // Execute the data loading function
  }, [fetchInvoices, fetchInventory]); // Dependencies: re-run if fetch methods change

  // Effect to render the revenue plot when invoices data updates
  useEffect(() => {
    if (canvasRef.current && Array.isArray(invoices)) {
      const ctx = canvasRef.current.getContext('2d'); // Get 2D rendering context
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear previous drawing

        const months = []; // Array to store the last 12 month labels
        const today = new Date(); // Current date for month calculation
        for (let i = 11; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1); // Start of each month
          months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' })); // e.g., "Jun 25"
        }

        const monthlyRevenue = Array(12).fill(0); // Initialize array for 12 months of revenue
        invoices.forEach(invoice => {
          const invoiceDate = new Date(invoice.date); // Convert invoice date to Date object
          const monthIndex = (today.getMonth() - invoiceDate.getMonth() + 12) % 12; // Calculate month index (0-11)
          if (monthIndex >= 0 && monthIndex < 12) {
            if (invoice.paymentStatus === 'Payment Complete') {
              monthlyRevenue[monthIndex] += invoice.grandTotal; // Add full amount for paid invoices
            } else if (invoice.paymentStatus === 'Partially Paid') {
              const received = getReceivedAmount(invoice._id) || 0; // Get received amount from store
              monthlyRevenue[monthIndex] += received; // Add received amount for partial payments
            }
          }
        });

        ctx.beginPath(); // Start drawing path
        ctx.strokeStyle = '#3b82f6'; // Set line color (blue)
        ctx.lineWidth = 2; // Set line thickness
        const maxRevenue = Math.max(...monthlyRevenue, 1000); // Set minimum scale to 1000
        const xStep = canvasRef.current.width / (months.length - 1); // Calculate x-axis step
        const yScale = 200 / maxRevenue; // Calculate y-axis scale (200px height)

        monthlyRevenue.forEach((revenue, index) => {
          const x = index * xStep; // X position for each month
          const y = 250 - (revenue * yScale); // Y position scaled to revenue
          if (index === 0) ctx.moveTo(x, y); // Move to first point
          else ctx.lineTo(x, y); // Draw line to next point
        });
        ctx.stroke(); // Render the line

        ctx.fillStyle = '#3b82f6'; // Set fill color for data points
        monthlyRevenue.forEach((revenue, index) => {
          const x = index * xStep;
          const y = 250 - (revenue * yScale);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2); // Draw circle for each data point
          ctx.fill();
        });

        ctx.fillStyle = '#1e293b'; // Set text color for labels
        ctx.font = '12px Arial'; // Set font for labels
        ctx.textAlign = 'center'; // Center-align month labels
        months.forEach((month, index) => {
          const x = index * xStep;
          ctx.fillText(month, x, 270); // Add month labels below the plot
        });

        ctx.save(); // Save current state
        ctx.translate(10, 130); // Move origin for y-axis label
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees for vertical text
        ctx.fillText('Revenue (₹)', 0, 0); // Add y-axis label
        ctx.restore(); // Restore state
      }
    }
  }, [invoices, getReceivedAmount]); // Re-render when invoices or received amounts change

  // Calculate number of sales transactions
  const salesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Sales').length : 0;
  // Calculate number of purchase transactions
  const purchasesCount = Array.isArray(inventory) ? inventory.filter(item => item.transactionType === 'Purchase').length : 0;

  // Calculate total paid amount (includes received amount for partial payments)
  const totalPaid = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    if (invoice.paymentStatus === 'Payment Complete') return sum + invoice.grandTotal;
    if (invoice.paymentStatus === 'Partially Paid') return sum + (getReceivedAmount(invoice._id) || 0);
    return sum;
  }, 0) : 0;

  // Calculate total unpaid amount (includes remaining balance for partial payments)
  const totalUnpaid = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => {
    if (invoice.paymentStatus === 'Unpaid') return sum + invoice.grandTotal;
    if (invoice.paymentStatus === 'Partially Paid') {
      const received = getReceivedAmount(invoice._id) || 0;
      return sum + (invoice.grandTotal - received);
    }
    return sum;
  }, 0) : 0;

  // Calculate total partially paid amount (sum of received amounts)
  const totalPartiallyPaid = Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'Partially Paid').reduce((sum, invoice) => sum + (getReceivedAmount(invoice._id) || 0), 0) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span> {/* Display error message if present */}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Invoices box with blue border */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-blue-500">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Total Invoices</p>
            <h2 className="text-3xl font-bold text-slate-800">{Array.isArray(invoices) ? invoices.length : 0}</h2>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900">
            <FileText className="h-5 w-5" /> {/* Icon for invoices */}
          </div>
        </div>

        {/* Current Year box with emerald border */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-emerald-500">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Current Year</p>
            <h2 className="text-3xl font-bold text-slate-800">{currentYear || 'N/A'}</h2>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900">
            <CreditCard className="h-5 w-5" /> {/* Icon for current year */}
          </div>
        </div>

        {/* Inventory Details box with purple border */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center h-36 border-2 border-purple-500">
          <div className="flex-1">
            <p className="text-slate-500 font-medium mb-2">Inventory</p>
            <p className="text-lg font-medium text-slate-800">Sales: {salesCount}</p>
            <p className="text-lg font-medium text-slate-800">Purchases: {purchasesCount}</p>
          </div>
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-900">
            <Package className="h-5 w-5" /> {/* Icon for inventory */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Revenue Overview (Last 12 Months)</h2>
          <canvas ref={canvasRef} width="400" height="300"></canvas> {/* Canvas for revenue plot */}
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