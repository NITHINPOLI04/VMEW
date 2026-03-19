import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, ChevronLeft } from 'lucide-react';

const PurchaseOrderWorkspace: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isCreatePage = location.pathname.includes('/new') || location.search.includes('?edit=');
  const isEditingPage = location.search.includes('?edit=');

  return (
    <div className="space-y-4 pb-0 bg-slate-50/80">
      {/* Page Header */}
      <div className="page-header items-center pb-2">
        <div className="flex items-center gap-3">
          {isEditingPage && (
            <button
              onClick={() => navigate('/purchase-order')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="page-title">{isCreatePage ? 'Generate PO' : 'PO Library'}</h1>
        </div>
        {!isCreatePage && (
          <Link
            to="/purchase-order/new"
            className="btn btn-primary bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            Create PO
          </Link>
        )}
      </div>

      {/* Content */}
      <div className={isCreatePage ? "relative" : ""}>
        <Outlet />
      </div>
    </div>
  );
};

export default PurchaseOrderWorkspace;
