import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => string;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 4000);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((message: string) => showToast('success', message), [showToast]);
  const error = useCallback((message: string) => showToast('error', message), [showToast]);
  const loading = useCallback((message: string) => showToast('loading', message), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, loading }}>
      {children}
      <div className="cms-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`cms-toast cms-toast--${toast.type}`} onClick={() => removeToast(toast.id)}>
            {toast.type === 'loading' && <span className="cms-toast__spinner" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
