import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => onDismiss(item.id), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [item.id, onDismiss]);

  const bg =
    item.kind === 'success'
      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  const Icon = item.kind === 'success' ? CheckCircle : XCircle;
  const color = item.kind === 'success' ? 'text-green-600' : 'text-red-600';

  return (
    <div
      className={`${bg} border rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 transition-all ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon size={18} className={`${color} flex-shrink-0 mt-0.5`} />
      <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{item.text}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}