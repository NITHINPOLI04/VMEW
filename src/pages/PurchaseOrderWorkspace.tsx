import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

const PurchaseOrderWorkspace: React.FC = () => {
  const location = useLocation();
  const isCreatePage = location.pathname.includes('/new') || location.search.includes('?edit=');

  return (
    <div className="space-y-4 pb-0 bg-slate-50/80">
      {/* Page Header */}
      <div className="page-header items-center pb-2">
        <div>
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
