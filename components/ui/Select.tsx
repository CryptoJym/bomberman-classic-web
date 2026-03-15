'use client';

import { forwardRef, useId, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Label text displayed above the select */
  label?: string;
  /** Error message displayed below the select */
  error?: string;
  /** Helper text displayed below the select (when no error) */
  helperText?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Full width select */
  fullWidth?: boolean;
  /** ID for the select */
  id?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select...',
      label,
      error,
      helperText,
      disabled,
      size = 'md',
      className,
      fullWidth = true,
      id: providedId,
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, []);

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-base min-h-[44px]',
      lg: 'px-5 py-4 text-lg min-h-[52px]',
    };

    const handleSelect = (optionValue: string) => {
      if (!disabled) {
        onChange?.(optionValue);
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className={cn('relative flex flex-col', fullWidth && 'w-full')}>
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

        <button
          ref={ref}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'relative w-full font-retro text-white text-left',
            'bg-retro-darker',
            'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
            'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]',
            'focus:outline-none focus:border-bomber-blue focus:ring-1 focus:ring-bomber-blue/50',
            'transition-all duration-150',
            sizeStyles[size],
            error && 'border-bomber-red focus:border-bomber-red focus:ring-bomber-red/50',
            disabled && 'opacity-50 cursor-not-allowed bg-retro-dark',
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={cn(!selectedOption && 'text-gray-500')}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>

          {/* Dropdown arrow */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-150',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            className={cn(
              'absolute top-full left-0 right-0 z-50 mt-1',
              'bg-retro-darker',
              'border-2 border-game-wall',
              'shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]',
              'max-h-60 overflow-auto'
            )}
            role="listbox"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                className={cn(
                  'w-full px-4 py-3 text-left font-retro',
                  'flex items-center gap-2',
                  'transition-colors duration-100',
                  option.value === value
                    ? 'bg-bomber-blue/30 text-bomber-yellow'
                    : 'text-white hover:bg-game-wall/30',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                role="option"
                aria-selected={option.value === value}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        )}

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

Select.displayName = 'Select';
