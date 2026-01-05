import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, ChevronDown, Trash2, Eye, FileCheck, Clock, AlertTriangle, Download } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { Invoice } from '../types';
import { toast } from 'react-hot-toast';
import { usePopper } from 'react-popper';
import * as XLSX from 'xlsx-js-style';  // Required for bold headers and styling

const InvoiceLibrary: React.FC = () => {
  const { fetchInvoices, deleteInvoice, updateInvoicePaymentStatus, setReceivedAmount, getReceivedAmount } = useInvoiceStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Month filter
  const [searchQuery, setSearchQuery] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dialogRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const dialogContentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [dropdownReferenceElement, setDropdownReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(dropdownReferenceElement, popperElement, {
    placement: 'bottom-start',
    modifiers: [
      { name: 'offset', options: { offset: [0, 4] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
    ],
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Month options
  const months = [
    { value: '', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

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
    setSelectedYear(currentFinancialYear);
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadInvoices();
      setSelectedMonth(''); // Reset month when year changes
    }
  }, [selectedYear]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && dropdownRefs.current[dropdownOpen] && !dropdownRefs.current[dropdownOpen].contains(event.target as Node)) {
        setDropdownOpen(null);
      }
      if (dialogOpen) {
        const dialogButton = dialogRefs.current[dialogOpen];
        const dialogContent = dialogContentRefs.current[dialogOpen];
        if (dialogButton && !dialogButton.contains(event.target as Node) && dialogContent && !dialogContent.contains(event.target as Node)) {
          setDialogOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, dialogOpen]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices(selectedYear);
      setInvoices(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoice(id);
      setInvoices(invoices.filter(invoice => invoice._id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete invoice');
    } finally {
      setDeleteModalOpen(null);
    }
  };

  const handlePaymentStatusChange = async (id: string, status: string) => {
    try {
      await updateInvoicePaymentStatus(id, status);
      setInvoices(invoices.map(invoice => 
        invoice._id === id ? { ...invoice, paymentStatus: status } : invoice
      ));
      toast.success('Payment status updated');
      setDropdownOpen(null);
      if (status !== 'Partially Paid') {
        setReceivedAmount(id, 0);
        setDialogOpen(null);
      }
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const toggleDropdown = (invoiceId: string) => {
    setDropdownOpen(dropdownOpen === invoiceId ? null : invoiceId);
    setDropdownReferenceElement(dropdownRefs.current[invoiceId]?.querySelector('button') || null);
    setPopperElement(dropdownRefs.current[invoiceId]?.querySelector('div') || null);
  };

  const toggleDialog = (invoiceId: string) => {
    setDialogOpen(dialogOpen === invoiceId ? null : invoiceId);
  };

  const handleReceivedAmountChange = (id: string, value: string) => {
    const invoice = invoices.find(invoice => invoice._id === id);
    if (!invoice) return;
    const newAmount = Math.max(0, Math.min(Number(value) || 0, invoice.grandTotal));
    setReceivedAmount(id, newAmount);
  };

  const getBalanceAmount = (id: string) => {
    const invoice = invoices.find(invoice => invoice._id === id);
    if (!invoice) return 0;
    const received = getReceivedAmount(id) || 0;
    let balance = invoice.grandTotal - received;
    const decimalPart = balance % 1;
    if (decimalPart >= 0.50) {
      balance = Math.ceil(balance);
    }
    return balance;
  };

  // FILTER: Search + Month
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.buyerName.toLowerCase().includes(searchQuery.toLowerCase());

    const invoiceMonth = new Date(invoice.date).getMonth().toString();
    const matchesMonth = selectedMonth === '' || invoiceMonth === selectedMonth;

    return matchesSearch && matchesMonth;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = sortedInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Export Summary (one row per invoice) — Numbers + Bold headers
  const exportToExcel = () => {
    const exportData = sortedInvoices.map((invoice, index) => {
      const totalTaxable = invoice.items.reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
      const totalIgst = invoice.items.reduce((sum, item) => sum + (item.igstAmount || 0), 0);
      const totalCgst = invoice.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
      const totalSgst = invoice.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);

      const isIgst = invoice.taxType === 'igst';

      return {
        'S.No': index + 1,
        'Date of Invoice': new Date(invoice.date).toLocaleDateString('en-IN'),
        'Invoice No': invoice.invoiceNumber,
        'Buyer GST No': invoice.buyerGst || '',
        'Buyer Name': invoice.buyerName,
        'Total Taxable Amount': totalTaxable,           // Number
        'IGST Amount': isIgst ? totalIgst : 0,          // Number
        'CGST Amount': isIgst ? 0 : totalCgst,         // Number
        'SGST Amount': isIgst ? 0 : totalSgst,         // Number
        'Grand Total': invoice.grandTotal,             // Number
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Bold headers
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = { font: { bold: true } };
      }
    }

    worksheet['!cols'] = [
      { wch: 6 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 25 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    const fileName = `Invoices_${selectedYear.replace('-', '_')}${selectedMonth ? `_${months.find(m => m.value === selectedMonth)?.label}` : ''}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Summary exported!');
  };

  // Export Detailed Items (all line items) — No blank rows + Numbers + Bold headers
  const exportDetailedItemsToExcel = () => {
    if (sortedInvoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }

    const detailedRows: any[] = [];

    sortedInvoices.forEach((invoice) => {
      invoice.items.forEach((item, itemIndex) => {
        const isIgst = invoice.taxType === 'igst';

        detailedRows.push({
          'Invoice No': invoice.invoiceNumber,
          'Date': new Date(invoice.date).toLocaleDateString('en-IN'),
          'Buyer Name': invoice.buyerName,
          'Buyer GST': invoice.buyerGst || '',
          'S.No': itemIndex + 1,
          'Description of Goods': item.description,
          'HSN/SAC Code': item.hsnSacCode,
          'Qty': item.quantity,
          'Unit': item.unit,
          'Rate': item.rate,                                      // Number
          'Taxable Amount': item.taxableAmount,                   // Number
          'IGST %': isIgst ? `${item.igstPercentage}%` : '',
          'IGST Amount': isIgst ? item.igstAmount : 0,             // Number
          'SGST %': !isIgst ? `${item.sgstPercentage}%` : '',
          'SGST Amount': !isIgst ? item.sgstAmount : 0,            // Number
          'CGST %': !isIgst ? `${item.cgstPercentage}%` : '',
          'CGST Amount': !isIgst ? item.cgstAmount : 0,            // Number
          'Item Total (incl. tax)': item.taxableAmount + (isIgst ? item.igstAmount : item.sgstAmount + item.cgstAmount), // Number
        });
      });
      // No blank row added — clean continuous data
    });

    const worksheet = XLSX.utils.json_to_sheet(detailedRows);

    // Bold headers
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = { font: { bold: true } };
      }
    }

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 6 },
      { wch: 45 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
      { wch: 10 }, { wch: 14 }, { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Items');

    const yearPart = selectedYear.replace('-', '_');
    const monthLabel = selectedMonth ? `_${months.find(m => m.value === selectedMonth)?.label || ''}` : '';
    const fileName = `Detailed_Items_${yearPart}${monthLabel}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Items exported!');
  };

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Invoice Library</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Financial Year */}
              <div className="flex items-center">
                <span className="text-slate-700 mr-2">Financial Year:</span>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center">
                <span className="text-slate-700 mr-2">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={exportToExcel}
                disabled={loading || sortedInvoices.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md font-medium transition-colors duration-200 whitespace-nowrap"
                title="Export invoice summary"
              >
                <Download className="h-5 w-5 mr-1" />
                Summary
              </button>

              <button
                onClick={exportDetailedItemsToExcel}
                disabled={loading || sortedInvoices.length === 0}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-md font-medium transition-colors duration-200 whitespace-nowrap"
                title="Export all line items"
              >
                <Download className="h-5 w-5 mr-1" />
                Items
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        ) : currentInvoices.length > 0 ? (
          <div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {currentInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-900 mr-2" />
                        {invoice.invoiceNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {invoice.buyerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ₹{invoice.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <div className="relative inline-flex items-center" ref={el => dropdownRefs.current[invoice._id] = el}>
                        <button
                          ref={setDropdownReferenceElement}
                          onClick={() => toggleDropdown(invoice._id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                            invoice.paymentStatus === 'Payment Complete'
                              ? 'bg-green-100 text-green-800'
                              : invoice.paymentStatus === 'Partially Paid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {invoice.paymentStatus === 'Payment Complete' && <FileCheck className="h-3 w-3 mr-1" />}
                          {invoice.paymentStatus === 'Partially Paid' && <Clock className="h-3 w-3 mr-1" />}
                          {invoice.paymentStatus === 'Unpaid' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {invoice.paymentStatus}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </button>
                        {dropdownOpen === invoice._id && (
                          <div
                            ref={setPopperElement}
                            style={styles.popper}
                            {...attributes.popper}
                            className="z-20 w-48 bg-white rounded-md shadow-lg py-1 border border-slate-200"
                          >
                            <button
                              onClick={() => handlePaymentStatusChange(invoice._id, 'Payment Complete')}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <FileCheck className="h-4 w-4 mr-2 text-green-600" />
                              Payment Complete
                            </button>
                            <button
                              onClick={() => handlePaymentStatusChange(invoice._id, 'Partially Paid')}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                              Partially Paid
                            </button>
                            <button
                              onClick={() => handlePaymentStatusChange(invoice._id, 'Unpaid')}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                              Unpaid
                            </button>
                          </div>
                        )}
                        {invoice.paymentStatus === 'Partially Paid' && (
                          <div className="relative ml-2">
                            <button
                              ref={el => dialogRefs.current[invoice._id] = el}
                              onClick={() => toggleDialog(invoice._id)}
                              className="text-yellow-800 hover:text-yellow-600 p-1 rounded"
                            >
                              <Clock className="h-5 w-5" />
                            </button>
                            {dialogOpen === invoice._id && (
                              <div
                                ref={el => dialogContentRefs.current[invoice._id] = el}
                                className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg p-4 border border-slate-200 z-30"
                                style={{ top: '100%', transform: 'translateX(-50%)' }}
                              >
                                <div className="text-sm text-slate-700 mb-2">Pending Payment Details</div>
                                <div className="mb-2">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount Received (₹)</label>
                                  <input
                                    type="number"
                                    value={getReceivedAmount(invoice._id) || ''}
                                    onChange={(e) => handleReceivedAmountChange(invoice._id, e.target.value)}
                                    min="0"
                                    max={invoice.grandTotal}
                                    className="w-full px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                </div>
                                <div className="text-sm text-slate-800">
                                  Balance Amount: ₹{getBalanceAmount(invoice._id).toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/invoice-preview/${invoice._id}`}
                          className="text-blue-900 hover:bg-blue-100 p-1 rounded"
                          title="View Invoice"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => setDeleteModalOpen(invoice._id)}
                          className="text-red-600 hover:bg-red-100 p-1 rounded"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-6 flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedInvoices.length)} of {sortedInvoices.length} invoices
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-medium text-slate-700 mb-2">No invoices found</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery 
                ? 'No invoices match your search query' 
                : selectedMonth 
                  ? `No invoices found for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                  : `There are no invoices for the financial year ${selectedYear}`}
            </p>
            <Link
              to="/generate-invoice"
              className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Create New Invoice
            </Link>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-medium text-slate-800 mb-2">Delete Invoice</h2>
            <p className="text-sm text-slate-600 mb-6">Are you sure you would like to do this?</p>
            <div className="flex justify-between">
              <button
                onClick={() => setDeleteModalOpen(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteInvoice(deleteModalOpen)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
};

export default InvoiceLibrary;