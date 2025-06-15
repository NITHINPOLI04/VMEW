import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useTemplateStore } from './stores/templateStore';
import { useInvoiceStore } from './stores/invoiceStore';
import { useInventoryStore } from './stores/inventoryStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GenerateInvoice from './pages/GenerateInvoice';
import InvoiceLibrary from './pages/InvoiceLibrary';
import Inventory from './pages/Inventory';
import TemplateSetup from './pages/TemplateSetup';
import InvoicePreview from './pages/InvoicePreview';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated, loading } = useAuthStore();
  const { fetchTemplateData } = useTemplateStore();
  const { clearInvoices } = useInvoiceStore();
  const { clearInventory } = useInventoryStore();
  const { clearTemplates } = useTemplateStore();

  // Fetch templates when the user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplateData();
    }
  }, [isAuthenticated, fetchTemplateData]);

  // Clear stores when the user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      clearInvoices();
      clearInventory();
      clearTemplates();
    }
  }, [isAuthenticated, clearInvoices, clearInventory, clearTemplates]);

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
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/generate-invoice" element={<GenerateInvoice />} />
              <Route path="/invoice-library" element={<InvoiceLibrary />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/template-setup" element={<TemplateSetup />} />
              <Route path="/invoice-preview/:id" element={<InvoicePreview />} />
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