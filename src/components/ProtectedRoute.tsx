import React, { useEffect } from 'react';
import AppSkeleton from './AppSkeleton';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useTemplateStore } from '../stores/templateStore';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading, isInitializing } = useAuthStore();
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

  if (isInitializing || (isAuthenticated && loading)) {
    return <AppSkeleton />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;