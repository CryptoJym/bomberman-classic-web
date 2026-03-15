'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Shows loading spinner and disables button */
  isLoading?: boolean;
  /** Optional left icon */
  leftIcon?: React.ReactNode;
  /** Optional right icon */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      disabled,
      children,
      leftIcon,
      rightIcon,
      fullWidth,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'relative inline-flex items-center justify-center gap-2',
      'font-pixel uppercase tracking-wider text-white',
      'transition-all duration-100 select-none',
      'focus:outline-none focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-retro-dark',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:translate-y-0'
    );

    const variantStyles = {
      primary: cn(
        'bg-gradient-to-b from-bomber-red to-red-700',
        'border-2 border-t-red-400 border-l-red-400 border-b-red-900 border-r-red-900',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.8),inset_2px_2px_0_0_rgba(255,255,255,0.2)]',
        'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]',
        'active:translate-y-1 active:shadow-none active:border-t-red-900 active:border-l-red-900'
      ),
      secondary: cn(
        'bg-gradient-to-b from-game-wall to-gray-700',
        'border-2 border-t-gray-400 border-l-gray-400 border-b-gray-800 border-r-gray-800',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.8),inset_2px_2px_0_0_rgba(255,255,255,0.2)]',
        'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]',
        'active:translate-y-1 active:shadow-none'
      ),
      danger: cn(
        'bg-gradient-to-b from-red-600 to-red-800',
        'border-2 border-t-red-400 border-l-red-400 border-b-red-900 border-r-red-900',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.8),inset_2px_2px_0_0_rgba(255,255,255,0.2)]',
        'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]',
        'active:translate-y-1 active:shadow-none'
      ),
      success: cn(
        'bg-gradient-to-b from-bomber-green to-green-700',
        'border-2 border-t-green-400 border-l-green-400 border-b-green-900 border-r-green-900',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.8),inset_2px_2px_0_0_rgba(255,255,255,0.2)]',
        'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]',
        'active:translate-y-1 active:shadow-none'
      ),
      warning: cn(
        'bg-gradient-to-b from-bomber-yellow to-yellow-600 text-black',
        'border-2 border-t-yellow-300 border-l-yellow-300 border-b-yellow-700 border-r-yellow-700',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.8),inset_2px_2px_0_0_rgba(255,255,255,0.3)]',
        'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]',
        'active:translate-y-1 active:shadow-none'
      ),
      ghost: cn(
        'bg-transparent',
        'border-2 border-game-wall',
        'shadow-none',
        'hover:bg-game-wall/30 hover:border-bomber-blue',
        'active:bg-game-wall/50'
      ),
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-[10px] min-h-[32px]',
      md: 'px-5 py-2.5 text-xs min-h-[44px]',
      lg: 'px-8 py-3.5 text-sm min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <PixelSpinner />
            <span className="animate-pulse">LOADING</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/** Small pixel loading spinner for buttons */
function PixelSpinner() {
  return (
    <span className="relative w-4 h-4 inline-block">
      <span className="absolute inset-0 animate-spin">
        <span className="absolute top-0 left-1/2 w-1 h-1 bg-current -translate-x-1/2" />
        <span className="absolute top-1/2 right-0 w-1 h-1 bg-current -translate-y-1/2 opacity-75" />
        <span className="absolute bottom-0 left-1/2 w-1 h-1 bg-current -translate-x-1/2 opacity-50" />
        <span className="absolute top-1/2 left-0 w-1 h-1 bg-current -translate-y-1/2 opacity-25" />
      </span>
    </span>
  );
}

export { Button };
