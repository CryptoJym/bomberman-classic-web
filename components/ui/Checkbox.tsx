'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: string;
  /** Description text below the label */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, size = 'md', error, disabled, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const sizeStyles = {
      sm: {
        box: 'w-4 h-4',
        check: 'w-2 h-2',
        label: 'text-sm',
        description: 'text-xs',
      },
      md: {
        box: 'w-5 h-5',
        check: 'w-2.5 h-2.5',
        label: 'text-base',
        description: 'text-sm',
      },
      lg: {
        box: 'w-6 h-6',
        check: 'w-3 h-3',
        label: 'text-lg',
        description: 'text-base',
      },
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              'block cursor-pointer',
              sizeStyles[size].box,
              // Base styles
              'bg-retro-darker',
              // Pixel-art border
              'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
              // Shadow
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]',
              // States
              'peer-focus-visible:ring-2 peer-focus-visible:ring-bomber-blue peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-retro-dark',
              'peer-checked:bg-bomber-blue peer-checked:border-bomber-blue',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              error && 'border-bomber-red',
              'transition-all duration-150'
            )}
          >
            {/* Pixel-art checkmark */}
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'opacity-0 peer-checked:opacity-100',
                'transition-opacity duration-100'
              )}
            >
              <span
                className={cn(
                  sizeStyles[size].check,
                  'bg-white',
                  // Pixel checkmark shape using box-shadow
                  'relative',
                  'after:absolute after:bg-white',
                  'after:w-1 after:h-[3px] after:bottom-0 after:left-0 after:rotate-45',
                  'before:absolute before:bg-white',
                  'before:w-[3px] before:h-[6px] before:bottom-0 before:right-0 before:rotate-45'
                )}
              />
            </span>
          </label>
          {/* Simple checkmark using pseudo elements */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
              'opacity-0 peer-checked:opacity-100',
              'transition-opacity duration-100'
            )}
          >
            <svg
              className={cn(sizeStyles[size].check, 'text-white')}
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              {/* Pixel art checkmark */}
              <rect x="1" y="5" width="2" height="2" />
              <rect x="3" y="7" width="2" height="2" />
              <rect x="5" y="5" width="2" height="2" />
              <rect x="7" y="3" width="2" height="2" />
              <rect x="7" y="1" width="2" height="2" />
            </svg>
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'font-retro cursor-pointer',
                  sizeStyles[size].label,
                  disabled ? 'text-gray-500' : 'text-white'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                className={cn(
                  'font-retro mt-0.5',
                  sizeStyles[size].description,
                  'text-gray-400'
                )}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
