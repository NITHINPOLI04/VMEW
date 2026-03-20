import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Search, X, Users, Truck, Filter, ChevronDown, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useContactStore } from '../stores/contactStore';
import { toast } from 'react-hot-toast';
import TableSkeleton from '../components/TableSkeleton';
import { MetricSkeleton } from '../components/Skeleton';

interface CompanyRow {
  originalId: string;
  name: string;
  type: 'Customer' | 'Supplier';
  gstNo: string;
  address: string;
}

const TypeBadge: React.FC<{ type: 'Customer' | 'Supplier' }> = ({ type }) => {
  const isCustomer = type === 'Customer';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        isCustomer
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}
    >
      {type}
    </span>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; icon: any; iconBg: string; iconColor: string; sub?: string }> = ({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
  <div className="card p-4 flex items-start gap-3 min-w-0 bg-white rounded-[24px] border border-slate-200 shadow-sm">
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

const Companies: React.FC = () => {
  const { customers, suppliers, fetchCustomers, fetchSuppliers, updateCustomer, updateSupplier, deleteCustomer, deleteSupplier } = useContactStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Customer' | 'Supplier'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [formData, setFormData] = useState({ name: '', gstNo: '', address: '' });
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState<CompanyRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true);
      try {
        await Promise.all([fetchCustomers(), fetchSuppliers()]);
      } catch {
        toast.error('Failed to load companies');
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape key + body scroll lock + outside click for dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setFilterOpen(false);
        setDeleteModalOpen(null);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && filterBtnRef.current && !filterRef.current.contains(target) && !filterBtnRef.current.contains(target)) {
        setFilterOpen(false);
      }
    };

    if (isModalOpen || deleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen, filterOpen, deleteModalOpen]);

  const companies: CompanyRow[] = useMemo(() => {
    const mapped: CompanyRow[] = [
      ...customers.map((c) => ({
        originalId: c._id,
        name: c.name,
        type: 'Customer' as const,
        gstNo: c.gstNo || '',
        address: c.address || '',
      })),
      ...suppliers.map((s) => ({
        originalId: s._id,
        name: s.name,
        type: 'Supplier' as const,
        gstNo: s.gstNo || '',
        address: s.address || '',
      })),
    ];
    return mapped;
  }, [customers, suppliers]);

  const filteredCompanies = useMemo(() => {
    let result = companies;
    if (typeFilter !== 'All') {
      result = result.filter(c => c.type === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.gstNo.toLowerCase().includes(q)
      );
    }
    // Sort customers first, then suppliers, then alphabetically
    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'Customer' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [companies, searchQuery, typeFilter]);

  const metrics = useMemo(() => {
    return [
      { label: 'Total Companies', value: companies.length, icon: Building2, iconBg: 'bg-slate-50', iconColor: 'text-slate-600', sub: 'All contacts' },
      { label: 'Total Customers', value: customers.length, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: 'Active clients' },
      { label: 'Total Suppliers', value: suppliers.length, icon: Truck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: 'Active vendors' },
    ];
  }, [companies.length, customers.length, suppliers.length]);

  const openEditModal = (company: CompanyRow) => {
    setEditingCompany(company);
    setFormData({ name: company.name, gstNo: company.gstNo, address: company.address });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name: prefixedName, value } = e.target;
    // Prefix stripping since some automated forms use it to prevent browser autofill
    const name = prefixedName.replace('field_v_', '');
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        name: formData.name,
        gstNo: formData.gstNo,
        address: formData.address
      };

      if (editingCompany.type === 'Customer') {
        await updateCustomer(editingCompany.originalId, updateData);
      } else {
        await updateSupplier(editingCompany.originalId, updateData);
      }
      toast.success('Company updated successfully');
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalOpen) return;
    setIsDeleting(true);
    try {
      if (deleteModalOpen.type === 'Customer') {
        await deleteCustomer(deleteModalOpen.originalId);
      } else {
        await deleteSupplier(deleteModalOpen.originalId);
      }
      toast.success(`${deleteModalOpen.type} deleted successfully`);
      setDeleteModalOpen(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete company');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Page Header */}
      <div className="page-header items-center">
        <div>
          <h1 className="page-title">Companies</h1>
        </div>
      </div>

      {/* Summary Metric Cards */}
      {pageLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-visible">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white rounded-t-[24px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or GST..."
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={() => setFilterOpen(!filterOpen)}
                className={`btn btn-secondary btn-sm gap-1.5 ${filterOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : ''}`}
              >
                <Filter size={13} />
                {typeFilter === 'All' ? 'All Types' : typeFilter}
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {filterOpen && (
                <div ref={filterRef} className="dropdown-panel right-0 top-full mt-2 w-40 z-50 overflow-hidden">
                  {['All', 'Customer', 'Supplier'].map(opt => {
                    let typeClass = 'hover:bg-slate-50 text-slate-700';
                    if (opt === 'Customer') typeClass = 'hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-50/50 data-[active=true]:text-blue-700';
                    if (opt === 'Supplier') typeClass = 'hover:bg-emerald-50 hover:text-emerald-700 data-[active=true]:bg-emerald-50/50 data-[active=true]:text-emerald-700';
                    
                    return (
                      <button
                        key={opt}
                        onClick={() => { setTypeFilter(opt as any); setFilterOpen(false); }}
                        data-active={typeFilter === opt}
                        className={`w-full text-left px-4 py-2 text-[13px] font-medium transition-colors ${typeClass}`}
                      >
                        {opt === 'All' ? 'All Types' : opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block border-l"></div>
            
            <span className="text-xs font-medium text-slate-400 hidden sm:block pl-1">
              {filteredCompanies.length} {filteredCompanies.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>

        {/* Table */}
        {pageLoading ? (
          <TableSkeleton columns={5} rows={8} hasTabs={false} />
        ) : filteredCompanies.length > 0 ? (
          <div className="overflow-hidden rounded-b-[24px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="saas-table min-w-full">
                <thead>
                  <tr>
                    <th className="pl-6">Name</th>
                    <th>Type</th>
                    <th>GST Number</th>
                    <th>Address</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr
                      key={`${company.type}-${company.originalId}`}
                      onClick={() => openEditModal(company)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td data-label="Name" className="md:pl-6 font-medium text-slate-900">
                        {company.name}
                      </td>
                      <td data-label="Type">
                        <TypeBadge type={company.type} />
                      </td>
                      <td data-label="GST Number" className="text-slate-500 font-mono text-sm">
                        {company.gstNo || '—'}
                      </td>
                      <td data-label="Address" className="text-slate-500 max-w-[260px] truncate">
                        {company.address || '—'}
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(company);
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalOpen(company);
                            }}
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
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No companies found</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              {searchQuery || typeFilter !== 'All'
                ? 'No companies match your current filters.'
                : 'No customers or suppliers have been added yet.'}
            </p>
            {(searchQuery || typeFilter !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setTypeFilter('All'); }}
                className="btn btn-secondary text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen &&
        editingCompany &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
            <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[500px] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
                <div className="flex items-center gap-3">
                  <h3 className="text-[18px] font-semibold text-white tracking-tight">
                    Edit Company
                  </h3>
                  <TypeBadge type={editingCompany.type} />
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="field_v_name"
                      value={formData.name}
                      onChange={handleInputChange}
                      autoFocus
                      className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all"
                      required
                      autoComplete="off"
                    />
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">
                      GST Number
                    </label>
                    <input
                      type="text"
                      name="field_v_gstNo"
                      value={formData.gstNo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] uppercase font-mono transition-all"
                      autoComplete="off"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#475569] mb-1.5 ml-0.5">
                      Address
                    </label>
                    <textarea
                      name="field_v_address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 text-[14px] rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all resize-none"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center items-center gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-[14px] font-semibold text-[#64748B] hover:text-slate-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-8 py-2.5 bg-[#2563EB] text-white text-[14px] font-bold rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Update Company'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 mx-auto">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Delete {deleteModalOpen.type}?</h3>
                <p className="text-center text-slate-500 mb-6 px-4">
                  Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteModalOpen.name}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeleteModalOpen(null)}
                    disabled={isDeleting}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-5 py-2.5 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm shadow-rose-200 disabled:opacity-70 flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Companies;
