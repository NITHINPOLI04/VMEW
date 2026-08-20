import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, FileText, Download } from 'lucide-react';
import { Invoice } from '../types';
import { generatePaymentReceiptPDF } from '../engines/paymentReceiptPDF';

interface PaymentLedgerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentLedgerPanel: React.FC<PaymentLedgerPanelProps> = ({ isOpen, onClose, invoice }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'entries'>('summary');

  // Body scroll lock + Escape
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setActiveTab('summary');
  }, [isOpen]);

  const payments = useMemo(() => invoice?.payments || [], [invoice]);
  const grossReceived = useMemo(() => payments.reduce((s, p) => s + p.grossAmount, 0), [payments]);
  const totalPermanent = useMemo(() => payments.reduce((s, p) => s + p.totalPermanentDeductions, 0), [payments]);
  const totalRecoverable = useMemo(() => payments.reduce((s, p) => s + p.totalRecoverableDeductions, 0), [payments]);
  const netReceived = useMemo(() => payments.reduce((s, p) => s + p.netAmount, 0), [payments]);

  const handleDownloadReceipt = async () => {
    if (!invoice) return;
    try {
      await generatePaymentReceiptPDF(invoice);
    } catch {
      // Silently fail — notification will be shown by PDF generator
    }
  };

  if (!isOpen || !invoice) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[6px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200 transition-all w-screen h-screen">
      <div className="bg-white rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-[640px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Dark Header */}
        <div className="px-8 py-5 flex items-center justify-between bg-[#0F172A] relative">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
                Payment Ledger
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                · Read-only
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mt-2 leading-snug break-words">
              {invoice.invoiceNumber} · {invoice.buyerName}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-950/40 text-emerald-400 border-emerald-800/50">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'summary'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'entries'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payment entries ({payments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-5 max-h-[60vh]">
          {activeTab === 'summary' ? (
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Summary</h3>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <SummaryRow label="Invoice total" value={fmt(invoice.grandTotal)} />
                <SummaryRow label="Gross received" value={fmt(grossReceived)} />
                {totalPermanent > 0 && (
                  <SummaryRow label="Permanent deductions (LD)" value={`−${fmt(totalPermanent)}`} valueColor="text-rose-600" />
                )}
                <SummaryRow
                  label="Recoverable deductions"
                  value={totalRecoverable > 0 ? `−${fmt(totalRecoverable)}` : fmt(0)}
                  valueColor={totalRecoverable > 0 ? 'text-amber-600' : undefined}
                />
                <SummaryRow label="Net received" value={fmt(netReceived)} bold />
                <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Revenue recognised
                    </span>
                    <span className="text-sm font-bold text-emerald-700">{fmt(netReceived)}</span>
                  </div>
                </div>
              </div>

              {/* Completion note */}
              {totalPermanent > 0 && (
                <div className="mt-4 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                  <FileText size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>All payments recorded. {fmt(netReceived)} added to revenue. This invoice is fully settled — {fmt(totalPermanent)} written off as LD deduction.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p, idx) => (
                <div key={p._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Payment {idx + 1} of {payments.length}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{p.mode}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Net received</span>
                      <span className="font-bold text-emerald-700">{fmt(p.netAmount)}</span>
                    </div>
                    {p.utrNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">UTR</span>
                        <span className="font-medium text-slate-700 font-mono text-xs">{p.utrNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross amount</span>
                      <span className="font-semibold text-slate-700">{fmt(p.grossAmount)}</span>
                    </div>
                    {(p.totalPermanentDeductions > 0 || p.totalRecoverableDeductions > 0) && (
                      <>
                        {p.ldRecovery > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">LD recovery</span>
                            <span className="text-rose-500">−{fmt(p.ldRecovery)}</span>
                          </div>
                        )}
                        {p.itTds > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">IT-TDS</span>
                            <span className="text-rose-500">−{fmt(p.itTds)}</span>
                          </div>
                        )}
                        {p.otherPermanent > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">Other permanent{p.otherPermanentNote ? ` (${p.otherPermanentNote})` : ''}</span>
                            <span className="text-rose-500">−{fmt(p.otherPermanent)}</span>
                          </div>
                        )}
                        {p.gstTds > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">GST-TDS</span>
                            <span className="text-amber-500">−{fmt(p.gstTds)}</span>
                          </div>
                        )}
                        {p.gstRetention > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">GST Retention</span>
                            <span className="text-amber-500">−{fmt(p.gstRetention)}</span>
                          </div>
                        )}
                        {p.securityDeposit > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">Security deposit</span>
                            <span className="text-amber-500">−{fmt(p.securityDeposit)}</span>
                          </div>
                        )}
                        {p.bankGuarantee > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">Bank guarantee</span>
                            <span className="text-amber-500">−{fmt(p.bankGuarantee)}</span>
                          </div>
                        )}
                        {p.otherRecoverable > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 pl-2">Other recoverable{p.otherRecoverableNote ? ` (${p.otherRecoverableNote})` : ''}</span>
                            <span className="text-amber-500">−{fmt(p.otherRecoverable)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-[14px] font-semibold rounded-[10px] hover:bg-slate-50 transition-all shadow-sm"
          >
            Close
          </button>
          <button
            onClick={handleDownloadReceipt}
            className="px-6 py-2.5 text-[14px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[10px] transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={14} />
            Download receipt
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Summary Row Helper ──────────────────────────────────────────────────────
const SummaryRow: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({ label, value, valueColor, bold }) => (
  <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0 ${bold ? 'bg-slate-50' : ''}`}>
    <span className={`text-sm ${bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{label}</span>
    <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'font-semibold'} ${valueColor || 'text-slate-800'}`}>{value}</span>
  </div>
);

export default PaymentLedgerPanel;
