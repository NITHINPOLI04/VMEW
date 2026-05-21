import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, PlusCircle, Search, Edit, Trash2, Download, ArrowUpDown, PackagePlus, PackageMinus, IndianRupee, ChevronDown, X, Clock, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { useFinancialYearStore } from '../stores/financialYearStore';
import { useAuthStore } from '../stores/authStore';
import CustomSelect from '../components/CustomSelect';
import { InventoryItem } from '../types';
import { notify } from '../utils/notify';
import { useConfirm } from '../components/ConfirmDialog';
import * as XLSX from 'xlsx';
import TableSkeleton from '../components/TableSkeleton';
import { MetricSkeleton } from '../components/Skeleton';
import { getProductBuyers } from '../utils/api';

const MetricCard: React.FC<{ label: string; value: string | number; icon: any; iconBg: string; iconColor: string; sub?: string }> = ({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
  <div className="card p-4 flex items-start gap-3 min-w-0">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={16} className={iconColor} />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    'In Stock': { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'Low Stock': { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    'Out of Stock': { label: 'Out of Stock', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
  };

  const config = map[status] || map['In Stock'];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${config.cls}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

const Inventory: React.FC = () => {
  const { fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventoryStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedYear = useFinancialYearStore(state => state.selectedFY);
  const setSelectedYear = useFinancialYearStore(state => state.setSelectedFY);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'Sales' | 'Purchase'>('Sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'newest' | 'oldest' | 'price-high' | 'price-low'>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedYear, sortKey]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const confirm = useConfirm();

  // View Buyers State
  const [buyersModalOpen, setBuyersModalOpen] = useState(false);
  const [selectedProductForBuyers, setSelectedProductForBuyers] = useState<InventoryItem | null>(null);
  const [productBuyers, setProductBuyers] = useState<any[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  const token = useAuthStore(state => state.token);


  const [formData, setFormData] = useState({
    description: '',
    hsnSacCode: '',
    quantity: 1,
    unit: 'Nos' as 'Nos' | 'Mts' | 'Lts' | 'Pkt' | 'Kgs',
    rate: 0,
    transactionType: 'Sales' as 'Sales' | 'Purchase',
    status: 'In Stock',
    financialYear: '',
  });

  useEffect(() => {
    if (isModalOpen && !isEditing && formData.description.trim() !== '') {
      const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
      const descNorm = normalize(formData.description);
      
      const exists = inventory.some(item => 
        normalize(item.description) === descNorm &&
        item.transactionType === formData.transactionType &&
        item.hsnSacCode === (formData.hsnSacCode || '') &&
        item.unit === formData.unit &&
        Number(item.rate) === Number(formData.rate)
      );
      setDuplicateWarning(exists);
    } else {
      setDuplicateWarning(false);
    }
  }, [formData, isModalOpen, isEditing, inventory]);

  const sortRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortRef.current && sortBtnRef.current && !sortRef.current.contains(target) && !sortBtnRef.current.contains(target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen]);

  // Removed automatic calculation of tax fields

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
    if (selectedYear) {
      loadInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // Overflow lock and Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setSortOpen(false);
      }
    };

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory(selectedYear);
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      notify.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBuyers = async (item: InventoryItem) => {
    if (!token) return;
    setSelectedProductForBuyers(item);
    setBuyersModalOpen(true);
    setLoadingBuyers(true);
    setProductBuyers([]);
    
    try {
      const normalizeProductKey = (desc: string) => desc.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._]/g, '');
      const productKey = (item as any).productKey || normalizeProductKey(item.description);
      const buyers = await getProductBuyers(selectedYear, productKey, token);
      setProductBuyers(buyers);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      notify.error('Failed to fetch buyers');
    } finally {
      setLoadingBuyers(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({
      description: '',
      hsnSacCode: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      transactionType: activeTab,
      status: 'In Stock',
      financialYear: selectedYear,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setIsEditing(true);
    setCurrentItem(item);
    setFormData({
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      unit: item.unit as 'Nos' | 'Mts' | 'Lts' | 'Pkt' | 'Kgs',
      rate: item.rate,
      transactionType: item.transactionType,
      status: item.status || 'In Stock',
      financialYear: item.financialYear,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name: prefixedName, value } = e.target;
    const name = prefixedName.replace('field_v_', '');
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'rate' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentItem) {
        await updateInventoryItem(currentItem.id, formData);
        notify.success('Item updated');
      } else {
        await addInventoryItem(formData);
        notify.success('Item added');
      }
      await loadInventory();
      closeModal();
    } catch (error: any) {
      notify.error(error.message || (isEditing ? 'Failed to update item' : 'Failed to add item'));
    }
  };

  const exportToExcel = () => {
    const type = activeTab;
    const filteredData = filteredItems.map(item => ({
      Description: item.description,
      'HSN/SAC Code': item.hsnSacCode,
      Quantity: item.quantity,
      Unit: item.unit,
      'Rate (₹)': item.rate,
      Total: item.rate * item.quantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type);
    XLSX.writeFile(workbook, `${type}_Inventory_${selectedYear}.xlsx`);
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = inventory.find(item => item.id === id);
    const itemName = itemToDelete?.description ? ` "${itemToDelete.description}"` : '';

    await confirm({
      title: 'Delete Item',
      description: `Are you sure you want to delete${itemName}? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteInventoryItem(id);
          setInventory(inventory.filter(item => item.id !== id));
          notify.success('Item deleted');
        } catch (error: any) {
          notify.error(error.message || 'Failed to delete item');
          throw error;
        }
      }
    });
  };

  const filteredItems = inventory
    .filter(item => item.transactionType === activeTab && item.financialYear === selectedYear)
    .filter(item =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hsnSacCode.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === 'price-high') return b.rate - a.rate;
      if (sortKey === 'price-low') return a.rate - b.rate;
      return 0;
    });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const metrics = (() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((acc, item) => acc + (item.rate * item.quantity), 0);
    const soldCount = inventory.filter(i => i.transactionType === 'Sales').length;
    const purchaseCount = inventory.filter(i => i.transactionType === 'Purchase').length;

    return [
      { label: 'Inventory Overview', value: totalItems, icon: Package, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: 'Total items tracked' },
      { label: 'Total Inventory Value', value: `₹${totalValue.toLocaleString('en-IN')}`, icon: IndianRupee, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `FY ${selectedYear}` },
      { label: 'Sold Inventory', value: soldCount, icon: PackageMinus, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', sub: 'Items sold' },
      { label: 'Purchased Inventory', value: purchaseCount, icon: PackagePlus, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sub: 'Items purchased' },
    ];
  })();

  return (
    <div className="space-y-4 pb-10">
      <div className="page-header items-center">
        <div>
          <h1 className="page-title">Inventory</h1>
        </div>
        <button
          onClick={openAddModal}
          className="btn btn-primary bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium"
        >
          <PlusCircle size={18} />
          Add Item
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FY</span>
          <CustomSelect
            value={selectedYear}
            options={availableYears.map(y => ({ value: y, label: y }))}
            onChange={setSelectedYear}
            className="w-[130px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-visible">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('Sales')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap min-w-[140px] ${activeTab === 'Sales' ? 'border-blue-600 text-blue-700 bg-blue-50/60' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <PackageMinus className="w-4 h-4" />
            Sales
          </button>
          <button
            onClick={() => setActiveTab('Purchase')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap min-w-[140px] ${activeTab === 'Purchase' ? 'border-amber-500 text-amber-700 bg-amber-50/60' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <PackagePlus className="w-4 h-4" />
            Purchase
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                ref={sortBtnRef}
                onClick={() => setSortOpen(!sortOpen)}
                className={`btn btn-secondary btn-sm gap-1.5 ${sortOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
              >
                <ArrowUpDown size={13} />
                {sortKey === 'newest' ? 'Newest First' : sortKey === 'oldest' ? 'Oldest First' : sortKey === 'price-high' ? 'Price: High-Low' : 'Price: Low-High'}
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {sortOpen && (
                <div ref={sortRef} className="dropdown-panel right-0 top-full mt-2 w-48">
                  {[
                    { value: 'newest', label: 'Newest First' },
                    { value: 'oldest', label: 'Oldest First' },
                    { value: 'price-high', label: 'Price: High → Low' },
                    { value: 'price-low', label: 'Price: Low → High' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortKey(opt.value as any); setSortOpen(false); }}
                      className={`dropdown-item ${sortKey === opt.value ? 'dropdown-item-active font-semibold' : ''}`}
                    >
                      {sortKey === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={exportToExcel} className="btn btn-secondary btn-sm">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={6} rows={10} hasTabs={false} />
        ) : filteredItems.length > 0 ? (
          <div className="overflow-hidden rounded-b-[24px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="saas-table min-w-full">
                <thead>
                  <tr>
                    <th className="pl-6 w-[45%]">Product Name</th>
                    <th className="whitespace-nowrap">HSN Code</th>
                    <th className="whitespace-nowrap">Price</th>
                    <th className="whitespace-nowrap">Stock</th>
                    <th className="whitespace-nowrap">Status</th>
                    <th className="text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr
                      key={`${item.id}-${index}`}
                      onClick={() => openEditModal(item)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td data-label="Product Name" className="md:pl-6 font-medium text-slate-900 description-cell">{item.description}</td>
                      <td data-label="HSN Code" className="text-slate-500 whitespace-nowrap">{item.hsnSacCode}</td>
                      <td data-label="Price" className="font-medium text-slate-700 whitespace-nowrap">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td data-label="Stock" className="text-slate-600 whitespace-nowrap">{item.transactionType === 'Purchase' && item.currentStock !== undefined ? item.currentStock : item.quantity} {item.unit}</td>
                      <td data-label="Status" className="whitespace-nowrap">
                        {item.transactionType === 'Purchase' ? (
                          <StatusBadge status={item.status || 'In Stock'} />
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {activeTab === 'Sales' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewBuyers(item); }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                              title="View Buyers"
                            >
                              <Building2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete"
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
            {filteredItems.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredItems.length)}</span> of <span className="font-semibold text-slate-700">{filteredItems.length}</span>
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
            )}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No items found</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              {searchQuery ? 'No items match your search.' : `No items recorded for the selected period.`}
            </p>
            <button onClick={openAddModal} className="btn btn-primary">
              <PlusCircle className="w-4 h-4" />
              Add First Item
            </button>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
          <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[500px] overflow-hidden flex flex-col">
            <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
              <h3 className="text-[18px] font-semibold text-white tracking-tight">
                {isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex bg-[#F1F5F9] p-1 rounded-[10px] mb-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, transactionType: 'Sales' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${formData.transactionType === 'Sales' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-slate-800'}`}
                >
                  <PackageMinus size={16} />
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, transactionType: 'Purchase' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${formData.transactionType === 'Purchase' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-slate-800'}`}
                >
                  <PackagePlus size={16} />
                  Purchase
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">Description</label>
                  <input
                    type="text"
                    name="field_v_description"
                    value={formData.description}
                    onChange={handleInputChange}
                    autoFocus
                    className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                    required
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">HSN/SAC Code</label>
                  <input
                    type="text"
                    name="field_v_hsnSacCode"
                    value={formData.hsnSacCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">Quantity</label>
                    <input
                      type="number"
                      name="field_v_quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      autoComplete="off"
                      className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">Unit</label>
                    <div className="relative">
                      <select
                        name="field_v_unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] appearance-none focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                      >
                        <option value="Nos">Nos</option>
                        <option value="Mts">Mts</option>
                        <option value="Lts">Lts</option>
                        <option value="Pkt">Pkt</option>
                        <option value="Kgs">Kgs</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">Rate (₹)</label>
                  <input
                    type="number"
                    name="field_v_rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                    required
                  />
                </div>
              </div>

              {duplicateWarning && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Item already exists.</p>
                    <p className="opacity-90 mt-0.5">Quantity will be updated on the existing record instead of creating a duplicate.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center items-center gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-[14px] font-semibold text-[#64748B] hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-[#2563EB] text-white text-[14px] font-bold rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-[0.98]"
                >
                  {isEditing ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}


      {buyersModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
          <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[800px] overflow-hidden flex flex-col">
            <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
              <div className="min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                    Buyers Log
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    · FY {selectedYear}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-white mt-2 leading-snug break-words" title={selectedProductForBuyers?.description}>
                  {selectedProductForBuyers?.description}
                </h3>
              </div>
              <button
                onClick={() => setBuyersModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {loadingBuyers ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : productBuyers.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Company Name</th>
                        <th className="px-4 py-3 font-medium">GST</th>
                        <th className="px-4 py-3 font-medium">Invoice #</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Qty Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productBuyers.map((invoice, idx) => {
                        const normalizeProductKey = (desc: string) => desc.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._]/g, '');
                        const targetKey = (selectedProductForBuyers as any)?.productKey || normalizeProductKey(selectedProductForBuyers?.description || '');
                        const matchedItem = invoice.items.find((i: any) => (i.productKey || normalizeProductKey(i.description)) === targetKey);

                        return (
                          <tr key={invoice._id || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                            <td className="px-4 py-3 font-medium text-slate-900">{invoice.buyerName}</td>
                            <td className="px-4 py-3 text-slate-500">{invoice.buyerGst}</td>
                            <td className="px-4 py-3 text-slate-500">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(invoice.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{matchedItem ? matchedItem.quantity : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Building2 className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-700">No sales records found</h4>
                  <p className="text-sm text-slate-500 mt-1">This product has not been sold to any company in {selectedYear}.</p>
                </div>
              )}
            </div>
            
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setBuyersModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-[14px] font-semibold rounded-[10px] hover:bg-slate-50 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Inventory;