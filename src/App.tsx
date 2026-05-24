import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { notify } from './utils/notify';
import NotificationHost from './components/Sonner';
import { ConfirmProvider } from './components/ConfirmDialog';
import { useAuthStore } from './stores/authStore';
import AppSkeleton from './components/AppSkeleton';
import NauticalLoader from './components/NauticalLoader';
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
import ErrorBoundary from './components/ErrorBoundary';

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
      notify.network(navigator.onLine);
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
    return <NauticalLoader />;
  }

  return (
    <ConfirmProvider>
      <ErrorBoundary>
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
      </ErrorBoundary>

      <NotificationHost />
    </ConfirmProvider>
  );
}

export default App;