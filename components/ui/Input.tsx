'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input (when no error) */
  helperText?: string;
  /** Icon displayed on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon displayed on the right side of the input */
  rightIcon?: React.ReactNode;
  /** Size variant */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      fullWidth = true,
      id: providedId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-base min-h-[44px]',
      lg: 'px-5 py-4 text-lg min-h-[52px]',
    };

    const iconSizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'mb-2 font-pixel text-xs uppercase tracking-wider',
              disabled ? 'text-gray-500' : 'text-gray-300'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none',
                iconSizeStyles[inputSize]
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              // Base styles
              'w-full font-retro text-white',
              'bg-retro-darker',
              // Pixel-art border
              'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
              // Inner shadow for depth
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]',
              // Placeholder
              'placeholder:text-gray-500 placeholder:font-retro',
              // Focus state
              'focus:outline-none focus:border-bomber-blue focus:ring-1 focus:ring-bomber-blue/50',
              // Transition
              'transition-all duration-150',
              // Size
              sizeStyles[inputSize],
              // Icon padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              // Error state
              error && 'border-bomber-red focus:border-bomber-red focus:ring-bomber-red/50',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed bg-retro-dark',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400',
                iconSizeStyles[inputSize]
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 font-retro text-xs',
              error ? 'text-bomber-red' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
