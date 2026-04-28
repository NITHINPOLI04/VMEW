import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import AppSkeleton from './components/AppSkeleton';
import { useTemplateStore } from './stores/templateStore';
import { useInvoiceStore } from './stores/invoiceStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useDCStore } from './stores/dcStore';
import { useQuotationStore } from './stores/quotationStore';
import { usePOStore } from './stores/poStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GenerateBills from './pages/GenerateBills';
import BillLibrary from './pages/BillLibrary';
import Inventory from './pages/Inventory';
import Companies from './pages/Companies';
import TemplateSetup from './pages/TemplateSetup';
import InvoicePreview from './pages/InvoicePreview';
import DCPreview from './pages/DCPreview';
import QuotationPreview from './pages/QuotationPreview';
import PurchaseOrderWorkspace from './pages/PurchaseOrderWorkspace';
import PurchaseOrderLibrary from './pages/PurchaseOrderLibrary';
import PurchaseOrderForm from './components/PurchaseOrderForm';
import PurchaseOrderPreview from './pages/PurchaseOrderPreview';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const { isAuthenticated, loading, isInitializing, checkAuth } = useAuthStore();
  const { fetchTemplateData, clearTemplates } = useTemplateStore();
  const { clearInvoices } = useInvoiceStore();
  const { clearInventory } = useInventoryStore();
  const { clearDCs } = useDCStore();
  const { clearQuotations } = useQuotationStore();
  const { clearPOs } = usePOStore();

  // Initialize auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch templates when the user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplateData();
    }
  }, [isAuthenticated, fetchTemplateData]);

  // Clear ALL stores when the user logs out to prevent data leakage between sessions
  useEffect(() => {
    if (!isAuthenticated) {
      clearInvoices();
      clearInventory();
      clearTemplates();
      clearDCs();
      clearQuotations();
      clearPOs();
    }
  }, [isAuthenticated, clearInvoices, clearInventory, clearTemplates, clearDCs, clearQuotations, clearPOs]);

  // Network status detection
  useEffect(() => {
    const handleNetworkChange = () => {
      if (!navigator.onLine) {
        toast.error('No network connected :(', {
          id: 'network-offline',
          duration: Infinity,
          position: 'top-center',
          className: '!bg-red-50 !text-red-900 !border !border-red-200',
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fff',
          },
          style: {
            padding: '16px',
            borderRadius: '12px',
            background: '#fff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        });
      } else {
        toast.dismiss('network-offline');
        toast.success('Back online!', {
          duration: 3000,
          position: 'top-center',
          className: '!bg-emerald-50 !text-emerald-900 !border !border-emerald-200',
          iconTheme: {
            primary: '#059669',
            secondary: '#fff',
          },
          style: {
            padding: '16px',
            borderRadius: '12px',
            background: '#fff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        });
      }
    };

    handleNetworkChange();

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  if (isInitializing) {
    return <AppSkeleton />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/generate-bills" element={<GenerateBills />} />
              <Route path="/bill-library" element={<BillLibrary />} />
              <Route path="/purchase-order" element={<PurchaseOrderWorkspace />}>
                <Route index element={<PurchaseOrderLibrary />} />
                <Route path="new" element={<PurchaseOrderForm />} />
              </Route>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/template-setup" element={<TemplateSetup />} />
              <Route path="/invoice-preview/:id" element={<InvoicePreview />} />
              <Route path="/dc-preview/:id" element={<DCPreview />} />
              <Route path="/quotation-preview/:id" element={<QuotationPreview />} />
              <Route path="/po-preview/:id" element={<PurchaseOrderPreview />} />
            </Route>
          </Route>
        </Routes>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            className: '!bg-emerald-50 !text-emerald-900 !border !border-emerald-200',
            iconTheme: {
              primary: '#059669',
              secondary: '#fff',
            },
            style: {
              padding: '16px',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
          error: {
            className: '!bg-red-50 !text-red-900 !border !border-red-200',
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
            style: {
              padding: '16px',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
          loading: {
            className: '!bg-blue-50 !text-blue-900 !border !border-blue-200',
            iconTheme: {
              primary: '#2563eb',
              secondary: '#fff',
            },
            style: {
              padding: '16px',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
        }}
      />
    </>
  );
}

export default App;