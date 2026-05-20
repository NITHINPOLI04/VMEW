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

function Pill({ item, onDismiss }: { item: NotificationPayload; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 180);
  }, [item.id, onDismiss]);

  const Icon = item.message === 'No connection' ? WifiOff : ICON_MAP[item.severity];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        notify-pill
        ${ACCENT[item.severity]}
        ${exiting ? 'notify-exit' : 'notify-enter'}
      `}
    >
      {Icon && (
        <Icon
          size={15}
          className={
            item.severity === 'success' ? 'text-emerald-500 flex-shrink-0' :
            item.severity === 'error' ? 'text-rose-500 flex-shrink-0' :
            item.severity === 'warning' ? 'text-amber-500 flex-shrink-0' :
            'text-blue-500 flex-shrink-0'
          }
        />
      )}
      <span className="notify-text">{item.message}</span>
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
