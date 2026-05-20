/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm?: () => Promise<void> | void;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleConfirm = async () => {
    if (state?.onConfirm) {
      setLoading(true);
      try {
        await state.onConfirm();
        state.resolve(true);
        setState(null);
      } catch (err: any) {
        state.resolve(false);
        setState(null);
      } finally {
        setLoading(false);
      }
    } else {
      state?.resolve(true);
      setState(null);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    state?.resolve(false);
    setState(null);
    setLoading(false);
  };

  // Focus cancel button on open, trap escape
  useEffect(() => {
    if (!state) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isDanger = state?.variant === 'danger' || !state?.variant;
  const ModalIcon = isDanger ? Trash2 : AlertTriangle;
  const iconBg = isDanger ? 'bg-rose-100' : 'bg-amber-100';
  const iconColor = isDanger ? 'text-rose-600' : 'text-amber-600';
  const confirmBg = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 confirm-overlay"
            onClick={handleCancel}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden confirm-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <ModalIcon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-center text-slate-900 mb-1">
                  {state.title}
                </h3>
                {state.description && (
                  <p className="text-sm text-slate-500 text-center mb-6 px-2">
                    {state.description}
                  </p>
                )}
                {!state.description && <div className="mb-6" />}
                <div className="flex gap-3">
                  <button
                    ref={cancelRef}
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {state.cancelLabel || 'Cancel'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors shadow-sm ${confirmBg} disabled:opacity-70 flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      state.confirmLabel || 'Confirm'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}
