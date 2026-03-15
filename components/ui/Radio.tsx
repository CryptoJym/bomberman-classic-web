'use client';

import { forwardRef, useId, createContext, useContext } from 'react';
import { cn } from '@/lib/utils/cn';

// Radio Group Context
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** Group name for all radio buttons */
  name: string;
  /** Currently selected value */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Label for the group */
  label?: string;
  /** Error message */
  error?: string;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Size variant for all radios */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Additional class names */
  className?: string;
  /** Radio children */
  children: React.ReactNode;
}

export function RadioGroup({
  name,
  value,
  onChange,
  label,
  error,
  disabled,
  size = 'md',
  direction = 'vertical',
  className,
  children,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled, size }}>
      <div
        className={cn('flex flex-col gap-2', className)}
        role="radiogroup"
        aria-labelledby={label ? `${name}-label` : undefined}
      >
        {label && (
          <span
            id={`${name}-label`}
            className={cn(
              'font-pixel text-xs uppercase tracking-wider mb-1',
              disabled ? 'text-gray-500' : 'text-gray-300'
            )}
          >
            {label}
          </span>
        )}
        <div
          className={cn(
            'flex gap-3',
            direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}
        >
          {children}
        </div>
        {error && <p className="font-retro text-xs text-bomber-red mt-1">{error}</p>}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: string;
  /** Description text below the label */
  description?: string;
  /** Size variant (overrides group size) */
  size?: 'sm' | 'md' | 'lg';
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, size: sizeProp, disabled: disabledProp, value, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const context = useContext(RadioGroupContext);

    const size = sizeProp ?? context?.size ?? 'md';
    const disabled = disabledProp ?? context?.disabled;
    const isChecked = context?.value === value;

    const sizeStyles = {
      sm: {
        box: 'w-4 h-4',
        dot: 'w-1.5 h-1.5',
        label: 'text-sm',
        description: 'text-xs',
      },
      md: {
        box: 'w-5 h-5',
        dot: 'w-2 h-2',
        label: 'text-base',
        description: 'text-sm',
      },
      lg: {
        box: 'w-6 h-6',
        dot: 'w-2.5 h-2.5',
        label: 'text-lg',
        description: 'text-base',
      },
    };

    const handleChange = () => {
      if (!disabled && value !== undefined) {
        context?.onChange?.(value as string);
      }
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="radio"
            id={id}
            name={context?.name}
            value={value}
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              'block cursor-pointer rounded-full',
              sizeStyles[size].box,
              // Base styles
              'bg-retro-darker',
              // Pixel-art border (slightly rounded for radio)
              'border-2 border-gray-600',
              // Shadow
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]',
              // States
              'peer-focus-visible:ring-2 peer-focus-visible:ring-bomber-blue peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-retro-dark',
              'peer-checked:border-bomber-blue',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              'transition-all duration-150'
            )}
          />
          {/* Radio dot */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
              'opacity-0 peer-checked:opacity-100',
              'transition-opacity duration-100'
            )}
          >
            <span
              className={cn(
                sizeStyles[size].dot,
                'bg-bomber-yellow rounded-sm',
                'shadow-[0_0_4px_rgba(255,215,0,0.5)]'
              )}
            />
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

Radio.displayName = 'Radio';
