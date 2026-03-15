'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

// Toast types
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  title?: string;
}

// Toast Context
interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, title?: string) => {
    addToast({ message, title, variant: 'success', duration: 4000 });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    addToast({ message, title, variant: 'error', duration: 6000 });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    addToast({ message, title, variant: 'warning', duration: 5000 });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    addToast({ message, title, variant: 'info', duration: 4000 });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {mounted && createPortal(<ToastContainer />, document.body)}
    </ToastContext.Provider>
  );
}

// Toast Container
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Toast Item
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    const duration = toast.duration ?? 4000;
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
    }, duration);

    return () => clearTimeout(dismissTimer);
  }, [toast.duration]);

  useEffect(() => {
    if (isLeaving) {
      const removeTimer = setTimeout(() => onRemove(toast.id), 200);
      return () => clearTimeout(removeTimer);
    }
  }, [isLeaving, onRemove, toast.id]);

  const handleClose = () => {
    setIsLeaving(true);
  };

  const variantStyles = {
    success: {
      bg: 'bg-bomber-green/90',
      border: 'border-green-400',
      icon: '✓',
      iconColor: 'text-green-200',
    },
    error: {
      bg: 'bg-bomber-red/90',
      border: 'border-red-400',
      icon: '✕',
      iconColor: 'text-red-200',
    },
    warning: {
      bg: 'bg-bomber-yellow/90',
      border: 'border-yellow-400',
      icon: '!',
      iconColor: 'text-yellow-900',
    },
    info: {
      bg: 'bg-bomber-blue/90',
      border: 'border-blue-400',
      icon: 'i',
      iconColor: 'text-blue-200',
    },
  };

  const variant = variantStyles[toast.variant];

  return (
    <div
      className={cn(
        'pointer-events-auto',
        'transform transition-all duration-200',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
      role="alert"
    >
      <div
        className={cn(
          'relative overflow-hidden',
          variant.bg,
          'border-2',
          variant.border,
          'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
          'backdrop-blur-sm'
        )}
      >
        {/* Corner pixels for retro feel */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-white/20" />
        <div className="absolute top-0 right-0 w-1 h-1 bg-white/20" />

        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 flex items-center justify-center',
              'font-pixel text-sm',
              variant.iconColor,
              toast.variant === 'warning' ? 'text-black' : 'text-white'
            )}
          >
            {variant.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p
                className={cn(
                  'font-pixel text-xs uppercase mb-1',
                  toast.variant === 'warning' ? 'text-black' : 'text-white'
                )}
              >
                {toast.title}
              </p>
            )}
            <p
              className={cn(
                'font-retro text-sm',
                toast.variant === 'warning' ? 'text-black/80' : 'text-white/90'
              )}
            >
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={cn(
              'flex-shrink-0 w-6 h-6 flex items-center justify-center',
              'font-pixel text-xs',
              toast.variant === 'warning' ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white',
              'transition-colors'
            )}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-black/20">
          <div
            className={cn(
              'h-full bg-white/30',
              'animate-[shrink_linear_forwards]'
            )}
            style={{
              animationDuration: `${toast.duration ?? 4000}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Standalone Toast component for manual usage
export interface StandaloneToastProps {
  variant?: ToastVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function ToastMessage({ variant = 'info', title, message, onClose, className }: StandaloneToastProps) {
  const variantStyles = {
    success: 'bg-bomber-green/20 border-bomber-green text-bomber-green',
    error: 'bg-bomber-red/20 border-bomber-red text-bomber-red',
    warning: 'bg-bomber-yellow/20 border-bomber-yellow text-bomber-yellow',
    info: 'bg-bomber-blue/20 border-bomber-blue text-bomber-blue',
  };

  return (
    <div
      className={cn(
        'p-4 border-2',
        variantStyles[variant],
        'shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && <p className="font-pixel text-xs uppercase mb-1">{title}</p>}
          <p className="font-retro text-sm opacity-90">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="font-pixel text-xs hover:opacity-70 transition-opacity"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
