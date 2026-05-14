type Severity = 'success' | 'error' | 'warning' | 'info';

interface NotificationPayload {
  id: string;
  message: string;
  severity: Severity;
  duration: number;
}

type Listener = (notifications: NotificationPayload[]) => void;

const DURATIONS: Record<Severity, number> = {
  success: 2500,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const MAX_VISIBLE = 3;

let notifications: NotificationPayload[] = [];
let listeners: Listener[] = [];
let counter = 0;

function emit() {
  const visible = notifications.slice(0, MAX_VISIBLE);
  listeners.forEach((fn) => fn(visible));
}

function push(message: string, severity: Severity, durationOverride?: number): string {
  const id = `n-${++counter}-${Date.now()}`;
  const duration = durationOverride ?? DURATIONS[severity];

  notifications = [{ id, message, severity, duration }, ...notifications];
  emit();

  if (duration !== Infinity) {
    setTimeout(() => dismiss(id), duration);
  }

  return id;
}

function dismiss(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

function dismissAll() {
  notifications = [];
  emit();
}

function subscribe(fn: Listener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export const notify = {
  success: (msg: string, duration?: number) => push(msg, 'success', duration),
  error: (msg: string, duration?: number) => push(msg, 'error', duration),
  warning: (msg: string, duration?: number) => push(msg, 'warning', duration),
  info: (msg: string, duration?: number) => push(msg, 'info', duration),
  dismiss,
  dismissAll,
  subscribe,

  /** Special network handler — persistent offline, auto-dismiss online */
  network(online: boolean) {
    if (!online) {
      // Dismiss any previous network toast, then show persistent
      notifications = notifications.filter((n) => n.id !== 'net-offline');
      notifications = [
        { id: 'net-offline', message: 'No connection', severity: 'error', duration: Infinity },
        ...notifications,
      ];
      emit();
    } else {
      dismiss('net-offline');
      push('Back online', 'success', 2000);
    }
  },
};

export type { NotificationPayload, Severity, Listener };
