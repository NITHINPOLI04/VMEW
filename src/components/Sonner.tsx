import { useEffect, useState, useCallback } from 'react';
import { X, AlertTriangle, Info, WifiOff, CheckCircle2 } from 'lucide-react';
import { notify, type NotificationPayload, type Severity } from '../utils/notify';

const ACCENT: Record<Severity, string> = {
  success: 'bg-emerald-50 border border-emerald-200',
  error: 'bg-rose-50 border border-rose-200',
  warning: 'bg-amber-50 border border-amber-200',
  info: 'bg-blue-50 border border-blue-200',
};

const ICON_MAP: Record<Severity, React.ElementType> = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

interface ParsedStockDetail {
  item: string;
  available: string;
  required: string;
}

interface ParsedStockWarning {
  item: string;
  remaining: string;
}

function parseNotificationMessage(message: string) {
  let cleanMessage = message;
  if (cleanMessage.startsWith('Stock validation failed — ')) {
    cleanMessage = cleanMessage.replace('Stock validation failed — ', '');
  }

  const parts = cleanMessage.split(' | ').map((p) => p.trim());
  const parsedDetails: ParsedStockDetail[] = [];
  const parsedWarnings: ParsedStockWarning[] = [];

  const stockErrorRegex = /^Out of stock for\s+(.+?)\.\s*Available:\s*([\d.-]+),\s*(?:Additional\s+)?Required:\s*([\d.-]+)/i;
  const stockWarningRegex = /^"(.+?)"\s*stock:\s*([\d.-]+)\s*remaining/i;

  let allParsed = true;

  for (const part of parts) {
    const errorMatch = part.match(stockErrorRegex);
    if (errorMatch) {
      parsedDetails.push({
        item: errorMatch[1].trim(),
        available: errorMatch[2].trim(),
        required: errorMatch[3].trim(),
      });
      continue;
    }

    const warningMatch = part.match(stockWarningRegex);
    if (warningMatch) {
      parsedWarnings.push({
        item: warningMatch[1].trim(),
        remaining: warningMatch[2].trim(),
      });
      continue;
    }

    allParsed = false;
    break;
  }

  if (allParsed && parsedDetails.length > 0) {
    return {
      type: 'stock_error' as const,
      details: parsedDetails,
    };
  }

  if (allParsed && parsedWarnings.length > 0) {
    return {
      type: 'stock_warning' as const,
      warnings: parsedWarnings,
    };
  }

  return null;
}

function Pill({ item, onDismiss }: { item: NotificationPayload; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 180);
  }, [item.id, onDismiss]);

  const Icon = item.message === 'No connection' ? WifiOff : ICON_MAP[item.severity];
  const parsed = parseNotificationMessage(item.message);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        notify-pill
        ${ACCENT[item.severity]}
        ${exiting ? 'notify-exit' : 'notify-enter'}
        ${parsed ? 'items-start pt-3' : 'items-center'}
      `}
    >
      {Icon && (
        <Icon
          size={15}
          className={`flex-shrink-0 ${parsed ? 'mt-0.5' : ''} ${
            item.severity === 'success' ? 'text-emerald-500' :
            item.severity === 'error' ? 'text-rose-500' :
            item.severity === 'warning' ? 'text-amber-500' :
            'text-blue-500'
          }`}
        />
      )}
      
      {parsed ? (
        parsed.type === 'stock_error' ? (
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="text-[10px] font-bold tracking-wider uppercase text-rose-500 mb-0.5">
              Out of Stock Alert
            </div>
            <div className="space-y-3">
              {parsed.details.map((detail, idx) => (
                <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? 'pt-2.5 border-t border-rose-100' : ''}`}>
                  <p className="text-xs font-semibold text-slate-800 break-words leading-tight">
                    {detail.item}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      Available: <strong className="ml-1 text-slate-700">{detail.available}</strong>
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold">
                      Required: <strong className="ml-1 text-rose-700">{detail.required}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="text-[10px] font-bold tracking-wider uppercase text-amber-600 mb-0.5">
              Low Stock Warning
            </div>
            <div className="space-y-3">
              {parsed.warnings.map((warning, idx) => (
                <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? 'pt-2.5 border-t border-amber-100' : ''}`}>
                  <p className="text-xs font-semibold text-slate-800 break-words leading-tight">
                    {warning.item}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">
                      Remaining: <strong className="ml-1 text-amber-800">{warning.remaining}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <span className="notify-text">{item.message}</span>
      )}

      <button
        onClick={handleDismiss}
        className="notify-close"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function NotificationHost() {
  const [items, setItems] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    return notify.subscribe(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[360px] w-full sm:w-auto"
      style={{ minWidth: 260 }}
    >
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <Pill item={item} onDismiss={notify.dismiss} />
        </div>
      ))}
    </div>
  );
}
