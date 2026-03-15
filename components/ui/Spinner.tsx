'use client';

import { cn } from '@/lib/utils/cn';

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  /** Additional class names */
  className?: string;
  /** Accessible label */
  label?: string;
}

/**
 * Pixel-art style loading spinner
 */
export function Spinner({ size = 'md', variant = 'default', className, label = 'Loading' }: SpinnerProps) {
  const sizeStyles = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const pixelSizeStyles = {
    xs: 'w-1 h-1',
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const colorStyles = {
    default: 'bg-bomber-yellow',
    primary: 'bg-bomber-blue',
    secondary: 'bg-game-wall',
    white: 'bg-white',
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', sizeStyles[size], className)}
      role="status"
      aria-label={label}
    >
      {/* Bomb-style spinner - rotating pixel dots */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '0.8s' }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className={cn(
              'absolute',
              pixelSizeStyles[size],
              colorStyles[variant],
              'transition-opacity'
            )}
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 45}deg) translateY(-150%)`,
              opacity: 1 - i * 0.1,
            }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface LoadingDotsProps {
  /** Additional class names */
  className?: string;
  /** Text to display */
  text?: string;
}

/**
 * Animated loading dots text
 */
export function LoadingDots({ className, text = 'LOADING' }: LoadingDotsProps) {
  return (
    <span className={cn('font-pixel text-bomber-yellow inline-flex items-center', className)} role="status">
      {text}
      <span className="inline-flex ml-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </span>
  );
}

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Text to display */
  text?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Full-screen or container loading overlay
 */
export function LoadingOverlay({ isLoading, text = 'LOADING', className }: LoadingOverlayProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-40',
        'flex flex-col items-center justify-center gap-4',
        'bg-retro-dark/90 backdrop-blur-sm',
        className
      )}
    >
      <Spinner size="lg" />
      <LoadingDots text={text} />
    </div>
  );
}

export interface SkeletonProps {
  /** Additional class names */
  className?: string;
  /** Animation variant */
  variant?: 'pulse' | 'shimmer';
}

/**
 * Skeleton loading placeholder with pixel aesthetic
 */
export function Skeleton({ className, variant = 'pulse' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-game-wall/30',
        'border border-game-wall/20',
        variant === 'pulse' && 'animate-pulse',
        variant === 'shimmer' &&
          'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className
      )}
    />
  );
}
