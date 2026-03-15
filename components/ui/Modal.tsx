'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether clicking outside closes the modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing escape closes the modal */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, handleClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && closeOnOverlayClick) {
      handleClose();
    }
  };

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  if (!isOpen || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/80 backdrop-blur-sm',
        'transition-opacity duration-150',
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          'bg-gradient-to-b from-retro-navy to-retro-darker',
          // Pixel-art border
          'border-4 border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
          // Shadow
          'shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]',
          // Animation
          'transition-all duration-150',
          isAnimating
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-95 translate-y-4 opacity-0',
          sizeStyles[size],
          className
        )}
      >
        {/* Corner decorations for retro feel */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-game-wall" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-game-wall" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-retro-dark" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-retro-dark" />

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b-2 border-game-wall/30 px-6 py-4 bg-retro-navy/50">
            {title && (
              <h2
                id="modal-title"
                className="font-pixel text-sm uppercase tracking-wider text-bomber-yellow"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className={cn(
                  'w-8 h-8 flex items-center justify-center',
                  'font-pixel text-lg text-gray-500',
                  'border-2 border-transparent',
                  'hover:text-bomber-red hover:border-bomber-red/50',
                  'transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-bomber-red/50'
                )}
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t-2 border-game-wall/30 px-6 py-4 bg-retro-navy/30">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Compound component for modal actions */
export function ModalActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}
