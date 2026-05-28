import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import { useDraftsStore } from '../stores/draftsStore';

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} min ago`;
  return 'some time ago';
};

const PurchaseOrderWorkspace: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditingPage = searchParams.has('edit');
  const isCreatePage = location.pathname.includes('/new') || isEditingPage;

  // Draft info
  const lastSaved = useDraftsStore(state => state.lastSaved);
  const saveStatus = useDraftsStore(state => state.saveStatus);
  const [timeAgoText, setTimeAgoText] = useState('just now');

  useEffect(() => {
    if (!lastSaved) return;
    
    const update = () => {
      setTimeAgoText(formatTimeAgo(lastSaved));
    };
    
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  const showPill = isCreatePage && !isEditingPage && saveStatus !== 'idle';
  const showSub = isCreatePage && !isEditingPage && lastSaved;

  return (
    <div className="space-y-4 pb-0 bg-slate-50/80">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          {(isEditingPage || (isCreatePage && !isEditingPage)) && (
            <button
              onClick={() => navigate('/purchase-order')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="page-title">{isCreatePage ? 'Generate PO' : 'PO Library'}</h1>
            {showSub && (
              <p className="text-xs text-slate-500 mt-1 font-medium animate-in fade-in duration-200">
                Purchase Order · Draft saved {timeAgoText}
              </p>
            )}
            {isCreatePage && !isEditingPage && !lastSaved && (
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Purchase Order
              </p>
            )}
          </div>
        </div>

        {/* Auto-saved Pill */}
        {showPill && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
            saveStatus === 'saving'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}></span>
            {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
          </div>
        )}

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
