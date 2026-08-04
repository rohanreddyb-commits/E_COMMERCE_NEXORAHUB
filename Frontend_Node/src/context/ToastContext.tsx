'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { icon: string; className: string }> = {
  success: { icon: 'check_circle', className: 'border-secondary bg-secondary-container text-on-secondary-container' },
  error: { icon: 'error', className: 'border-error bg-error-container text-on-error-container' },
  warning: { icon: 'warning', className: 'border-outline bg-surface-container-high text-on-surface' },
  info: { icon: 'info', className: 'border-outline-variant bg-surface-container-lowest text-on-surface' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, 'success'),
      error: (message) => toast(message, 'error'),
      info: (message) => toast(message, 'info'),
      warning: (message) => toast(message, 'warning'),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="fixed bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-3 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 shadow-xl backdrop-blur-md',
                'animate-in slide-in-from-bottom-4 fade-in duration-300',
                style.className
              )}
            >
              <span className="material-symbols-outlined text-xl shrink-0">{style.icon}</span>
              <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
              <button
                onClick={() => dismiss(item.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
