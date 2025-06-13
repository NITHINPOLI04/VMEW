import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useTemplateStore } from '../stores/templateStore';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore();
  const fetchInvoices = useInvoiceStore((state) => state.fetchInvoices);
  const fetchInventory = useInventoryStore((state) => state.fetchInventory);
  const fetchTemplateData = useTemplateStore((state) => state.fetchTemplateData);

  useEffect(() => {
    if (isAuthenticated) {
      const currentYear = new Date().getFullYear();
      const financialYear = new Date().getMonth() >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
      fetchInvoices(financialYear);
      fetchInventory(financialYear);
      fetchTemplateData();
    }
  }, [isAuthenticated, fetchInvoices, fetchInventory, fetchTemplateData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;