import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, Search, Pencil, Trash2, Download, Check } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { InventoryItem } from '../types';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const Inventory: React.FC = () => {
  const { fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventoryStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [modalTransactionType, setModalTransactionType] = useState<'Sales' | 'Purchase'>('Sales');
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()); // Track selected item IDs

  const [formData, setFormData] = useState({
    description: '',
    hsnSacCode: '',
    quantity: 1,
    unit: 'Nos' as 'Nos' | 'Mts' | 'Lts' | 'Pkt',
    rate: 0,
    transactionType: 'Sales' as 'Sales' | 'Purchase',
    financialYear: selectedYear,
    partyGstNo: '',
    partyName: '',
    basicAmt: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    total: 0,
    transport: 0,
    gstPercentage: 0,
    taxType: 'sgstcgst' as 'sgstcgst' | 'igst',
  });

  useEffect(() => {
    const basicAmt = formData.quantity * formData.rate;

    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    if (formData.taxType === 'igst') {
      igst = (basicAmt * formData.gstPercentage) / 100;
    } else {
      cgst = (basicAmt * (formData.gstPercentage / 2)) / 100;
      sgst = (basicAmt * (formData.gstPercentage / 2)) / 100;
    }

    const total = basicAmt + igst + cgst + sgst;

    setFormData(prev => ({
      ...prev,
      basicAmt,
      igst,
      cgst,
      sgst,
      total,
    }));
  }, [formData.quantity, formData.rate, formData.gstPercentage, formData.taxType]);

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
      loadInventory();
    }
  }, [selectedYear]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory(selectedYear);
      setInventory(data);
      setSelectedItems(new Set()); // Reset selected items when loading new data
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  const handleSearchChange = (type: 'Sales' | 'Purchase') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'Sales') {
      setSalesSearchQuery(e.target.value);
    } else {
      setPurchaseSearchQuery(e.target.value);
    }
  };

  const openAddModal = (transactionType: 'Sales' | 'Purchase') => {
    setIsEditing(false);
    setCurrentItem(null);
    setModalTransactionType(transactionType);
    setFormData({
      description: '',
      hsnSacCode: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      transactionType,
      financialYear: selectedYear,
      partyGstNo: '',
      partyName: '',
      basicAmt: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      total: 0,
      transport: 0,
      gstPercentage: 0,
      taxType: 'sgstcgst',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setIsEditing(true);
    setCurrentItem(item);
    setModalTransactionType(item.transactionType);
    setFormData({
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      unit: item.unit as 'Nos' | 'Mts' | 'Lts' | 'Pkt',
      rate: item.rate,
      transactionType: item.transactionType,
      financialYear: item.financialYear,
      partyGstNo: item.partyGstNo,
      partyName: item.partyName,
      basicAmt: item.basicAmt,
      igst: item.igst,
      cgst: item.cgst,
      sgst: item.sgst,
      total: item.total,
      transport: item.transport,
      gstPercentage: item.gstPercentage,
      taxType: item.taxType,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'rate' || name === 'transport' || name === 'gstPercentage' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentItem) {
        await updateInventoryItem(currentItem.id, formData);
        setInventory(inventory.map(item =>
          item.id === currentItem.id ? { ...item, ...formData } : item
        ));
        toast.success('Item updated successfully');
      } else {
        const newItem = await addInventoryItem(formData);
        setInventory([...inventory, newItem]);
        toast.success('Item added successfully');
      }
      closeModal();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update item' : 'Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      setInventory(inventory.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setDeleteModalOpen(null);
    }
  };

  const handleDeleteSelected = async () => {
    setBulkDeleteConfirmOpen(true);
  };

  const confirmDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected for deletion');
      setBulkDeleteConfirmOpen(false);
      return;
    }

    try {
      await Promise.all([...selectedItems].map(id => deleteInventoryItem(id)));
      setInventory(inventory.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      toast.success('Selected items deleted successfully');
    } catch (error) {
      toast.error('Failed to delete selected items');
    } finally {
      setBulkDeleteConfirmOpen(false);
    }
  };

  const cancelDeleteSelected = () => {
    setBulkDeleteConfirmOpen(false);
  };

  const handleSelectItem = (id: string) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(id)) {
      newSelectedItems.delete(id);
    } else {
      newSelectedItems.add(id);
    }
    setSelectedItems(newSelectedItems);
  };

  const exportToExcel = (type: 'Sales' | 'Purchase') => {
    const filteredData = inventory
      .filter(item => item.transactionType === type && item.financialYear === selectedYear)
      .filter(item => item.hsnSacCode.toLowerCase().includes(type === 'Sales' ? salesSearchQuery.toLowerCase() : purchaseSearchQuery.toLowerCase()))
      .map(item => ({
        'Party GST No': item.partyGstNo,
        'Party Name': item.partyName,
        Description: item.description,
        'HSN/SAC Code': item.hsnSacCode,
        Quantity: item.quantity,
        Unit: item.unit,
        'Rate (₹)': item.rate,
        'Basic Amount': item.basicAmt,
        IGST: item.igst,
        CGST: item.cgst,
        SGST: item.sgst,
        Total: item.total,
        Transport: item.transport,
        'GST %': item.gstPercentage,
      }));

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type);
    XLSX.writeFile(workbook, `${type}_Inventory_${selectedYear}.xlsx`);
  };

  const filteredSales = inventory
    .filter(item => item.transactionType === 'Sales' && item.financialYear === selectedYear)
    .filter(item => item.hsnSacCode.toLowerCase().includes(salesSearchQuery.toLowerCase()));

  const filteredPurchase = inventory
    .filter(item => item.transactionType === 'Purchase' && item.financialYear === selectedYear)
    .filter(item => item.hsnSacCode.toLowerCase().includes(purchaseSearchQuery.toLowerCase()));

  const renderInventoryTable = (items: InventoryItem[], type: 'Sales' | 'Purchase') => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Party GST No</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Party Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HSN/SAC Code</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate (₹)</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Basic Amt</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IGST</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CGST</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SGST</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transport</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">GST %</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {items.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-slate-50 ${selectedItems.has(item.id) ? 'bg-blue-100' : ''}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button') === null) handleSelectItem(item.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex items-center">
                {selectedItems.has(item.id) && <Check className="h-4 w-4 text-blue-600 mr-2" />}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.partyGstNo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.partyName}</td>
              <td className="px-6 py-4 text-sm text-slate-800">
                <div className="flex items-start max-w-md">
                  <span className="truncate">{item.description}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.hsnSacCode}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.unit}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.rate.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.basicAmt.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.igst.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.cgst.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.sgst.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.total.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.transport.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.gstPercentage}%</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                    className="text-blue-900 hover:bg-blue-100 p-1 rounded"
                    title="Edit Item"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(item.id); }}
                    className="text-red-600 hover:bg-red-100 p-1 rounded"
                    title="Delete Item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Inventory Management</h1>

      <div className="mb-6 flex items-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">Sales</h2>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter by HSN/SAC Code..."
                    value={salesSearchQuery}
                    onChange={handleSearchChange('Sales')}
                    className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToExcel('Sales')}
                    className="inline-flex items-center px-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                    title="Export to Excel"
                  >
                    <Download className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => openAddModal('Sales')}
                    className="inline-flex items-center px-3 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                    title="Add Sales Item"
                  >
                    <PlusCircle className="h-6 w-6" />
                  </button>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center px-3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                      title="Delete Selected"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-900"></div>
            </div>
          ) : filteredSales.length > 0 ? (
            renderInventoryTable(filteredSales, 'Sales')
          ) : (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-medium text-slate-700 mb-2">No sales items found</h3>
              <p className="text-slate-500 mb-6">
                {salesSearchQuery ? 'No items match your search query' : 'Start by adding your first sales item'}
              </p>
              <button
                onClick={() => openAddModal('Sales')}
                className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Sales Item
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">Purchase</h2>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter by HSN/SAC Code..."
                    value={purchaseSearchQuery}
                    onChange={handleSearchChange('Purchase')}
                    className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToExcel('Purchase')}
                    className="inline-flex items-center px-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                    title="Export to Excel"
                  >
                    <Download className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => openAddModal('Purchase')}
                    className="inline-flex items-center px-3 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                    title="Add Purchase Item"
                  >
                    <PlusCircle className="h-6 w-6" />
                  </button>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center px-3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 w-12 h-12 justify-center"
                      title="Delete Selected"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-900"></div>
            </div>
          ) : filteredPurchase.length > 0 ? (
            renderInventoryTable(filteredPurchase, 'Purchase')
          ) : (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-medium text-slate-700 mb-2">No purchase items found</h3>
              <p className="text-slate-500 mb-6">
                {purchaseSearchQuery ? 'No items match your search query' : 'Start by adding your first purchase item'}
              </p>
              <button
                onClick={() => openAddModal('Purchase')}
                className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Purchase Item
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-fit max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? `Edit ${modalTransactionType} Item` : `Add ${modalTransactionType} Item`}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-slate-700 mb-3">Party Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="partyGstNo" className="block text-sm font-medium text-slate-700 mb-1">
                        Party GST No
                      </label>
                      <input
                        type="text"
                        id="partyGstNo"
                        name="partyGstNo"
                        value={formData.partyGstNo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="partyName" className="block text-sm font-medium text-slate-700 mb-1">
                        Party Name
                      </label>
                      <input
                        type="text"
                        id="partyName"
                        name="partyName"
                        value={formData.partyName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="financialYear" className="block text-sm font-medium text-slate-700 mb-1">
                        Financial Year
                      </label>
                      <select
                        id="financialYear"
                        name="financialYear"
                        value={formData.financialYear}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        required
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-slate-700 mb-3">Item Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                        Description of Goods
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="hsnSacCode" className="block text-sm font-medium text-slate-700 mb-1">
                          HSN/SAC Code
                        </label>
                        <input
                          type="text"
                          id="hsnSacCode"
                          name="hsnSacCode"
                          value={formData.hsnSacCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            id="quantity"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            min="1"
                            className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-1">
                            Unit of Measurement
                          </label>
                          <select
                            id="unit"
                            name="unit"
                            value={formData.unit}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                            required
                          >
                            <option value="Nos">Nos</option>
                            <option value="Mts">Mts</option>
                            <option value="Lts">Lts</option>
                            <option value="Pkt">Pkt</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="rate" className="block text-sm font-medium text-slate-700 mb-1">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          id="rate"
                          name="rate"
                          value={formData.rate}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-slate-700 mb-3">Tax Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="taxType" className="block text-sm font-medium text-slate-700 mb-1">
                          Tax Type
                        </label>
                        <select
                          id="taxType"
                          name="taxType"
                          value={formData.taxType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          required
                        >
                          <option value="sgstcgst">SGST + CGST</option>
                          <option value="igst">IGST</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="gstPercentage" className="block text-sm font-medium text-slate-700 mb-1">
                          GST (%)
                        </label>
                        <input
                          type="number"
                          id="gstPercentage"
                          name="gstPercentage"
                          value={formData.gstPercentage}
                          onChange={handleInputChange}
                          min="0"
                          step="0.1"
                          className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="basicAmt" className="block text-sm font-medium text-slate-700 mb-1">
                          Basic Amount (₹)
                        </label>
                        <input
                          type="number"
                          id="basicAmt"
                          name="basicAmt"
                          value={formData.basicAmt.toFixed(2)}
                          className="w-full px-4 py-2 rounded-md border border-slate-300 bg-gray-100 cursor-not-allowed shadow-sm"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="igst" className="block text-sm font-medium text-slate-700 mb-1">
                            IGST (₹)
                          </label>
                          <input
                            type="number"
                            id="igst"
                            name="igst"
                            value={formData.igst.toFixed(2)}
                            className="w-full px-4 py-2 rounded-md border border-slate-300 bg-gray-100 cursor-not-allowed shadow-sm"
                            readOnly
                          />
                        </div>
                        <div>
                          <label htmlFor="cgst" className="block text-sm font-medium text-slate-700 mb-1">
                            CGST (₹)
                          </label>
                          <input
                            type="number"
                            id="cgst"
                            name="cgst"
                            value={formData.cgst.toFixed(2)}
                            className="w-full px-4 py-2 rounded-md border border-slate-300 bg-gray-100 cursor-not-allowed shadow-sm"
                            readOnly
                          />
                        </div>
                        <div>
                          <label htmlFor="sgst" className="block text-sm font-medium text-slate-700 mb-1">
                            SGST (₹)
                          </label>
                          <input
                            type="number"
                            id="sgst"
                            name="sgst"
                            value={formData.sgst.toFixed(2)}
                            className="w-full px-4 py-2 rounded-md border border-slate-300 bg-gray-100 cursor-not-allowed shadow-sm"
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="total" className="block text-sm font-medium text-slate-700 mb-1">
                          Total (₹)
                        </label>
                        <input
                          type="number"
                          id="total"
                          name="total"
                          value={formData.total.toFixed(2)}
                          className="w-full px-4 py-2 rounded-md border border-slate-300 bg-gray-100 cursor-not-allowed shadow-sm"
                          readOnly
                        />
                      </div>
                      <div>
                        <label htmlFor="transport" className="block text-sm font-medium text-slate-700 mb-1">
                          Transport (₹)
                        </label>
                        <input
                          type="number"
                          id="transport"
                          name="transport"
                          value={formData.transport}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow-sm"
                >
                  {isEditing ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-medium text-slate-800 mb-2">Delete Item</h2>
            <p className="text-sm text-slate-600 mb-6">Are you sure you would like to do this?</p>
            <div className="flex justify-between">
              <button
                onClick={() => setDeleteModalOpen(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(deleteModalOpen)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-medium text-slate-800 mb-2">Delete Selected Items</h2>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to delete {selectedItems.size} selected item(s)?</p>
            <div className="flex justify-between">
              <button
                onClick={cancelDeleteSelected}
                className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;