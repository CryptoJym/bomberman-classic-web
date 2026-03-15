'use client';

import { cn } from '@/lib/utils/cn';
import type { PlayerColor } from '@/types/game';

/**
 * Player color palette
 * Maps color indices to actual color values
 */
const COLOR_PALETTE: Record<PlayerColor, { bg: string; border: string; name: string }> = {
  0: { bg: 'bg-white', border: 'border-white', name: 'White' },
  1: { bg: 'bg-bomber-red', border: 'border-bomber-red', name: 'Red' },
  2: { bg: 'bg-bomber-blue', border: 'border-bomber-blue', name: 'Blue' },
  3: { bg: 'bg-bomber-green', border: 'border-bomber-green', name: 'Green' },
  4: { bg: 'bg-bomber-yellow', border: 'border-bomber-yellow', name: 'Yellow' },
  5: { bg: 'bg-bomber-purple', border: 'border-bomber-purple', name: 'Purple' },
  6: { bg: 'bg-bomber-orange', border: 'border-bomber-orange', name: 'Orange' },
  7: { bg: 'bg-bomber-cyan', border: 'border-bomber-cyan', name: 'Cyan' },
};

export interface ColorPickerProps {
  /** Currently selected color */
  selectedColor: PlayerColor;
  /** Callback when color is selected */
  onColorSelect: (color: PlayerColor) => void;
  /** Colors that are unavailable (already taken) */
  unavailableColors?: PlayerColor[];
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Display mode */
  mode?: 'grid' | 'row';
  /** Size of color swatches */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * Color picker component for player color selection
 * Displays available player colors with visual feedback
 */
export function ColorPicker({
  selectedColor,
  onColorSelect,
  unavailableColors = [],
  disabled = false,
  mode = 'grid',
  size = 'md',
  className,
}: ColorPickerProps) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const containerStyles = {
    grid: 'grid grid-cols-4 gap-2',
    row: 'flex flex-wrap gap-2',
  };

  const colors = Object.keys(COLOR_PALETTE).map(Number) as PlayerColor[];

  return (
    <div className={cn(containerStyles[mode], className)}>
      {colors.map((color) => {
        const isSelected = color === selectedColor;
        const isUnavailable = unavailableColors.includes(color);
        const colorData = COLOR_PALETTE[color];

        return (
          <button
            key={color}
            type="button"
            onClick={() => !isUnavailable && !disabled && onColorSelect(color)}
            disabled={disabled || isUnavailable}
            className={cn(
              'relative flex items-center justify-center',
              'border-2 transition-all duration-150',
              sizeStyles[size],
              colorData.bg,
              // Selected state
              isSelected &&
                'ring-4 ring-accent-gold ring-offset-2 ring-offset-retro-dark scale-110',
              // Border
              isSelected ? 'border-accent-gold' : colorData.border,
              // Hover state
              !isUnavailable &&
                !disabled &&
                !isSelected &&
                'hover:scale-105 hover:shadow-[0_0_12px_rgba(255,255,255,0.3)]',
              // Disabled/unavailable state
              isUnavailable &&
                'opacity-30 cursor-not-allowed relative after:absolute after:inset-0 after:bg-black/50',
              disabled && !isUnavailable && 'opacity-50 cursor-not-allowed',
              // Pixel-art shadow
              'shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]'
            )}
            title={
              isUnavailable
                ? `${colorData.name} (Taken)`
                : isSelected
                ? `${colorData.name} (Selected)`
                : colorData.name
            }
            aria-label={`Select ${colorData.name} color`}
            aria-pressed={isSelected}
          >
            {/* Checkmark for selected */}
            {isSelected && (
              <svg
                className="w-1/2 h-1/2 text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}

            {/* X for unavailable */}
            {isUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-1/2 h-1/2 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact color badge for displaying a player's color
 */
export interface ColorBadgeProps {
  color: PlayerColor;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function ColorBadge({ color, size = 'md', showName = false, className }: ColorBadgeProps) {
  const colorData = COLOR_PALETTE[color];

  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-shrink-0',
          sizeStyles[size],
          colorData.bg,
          'border-2',
          colorData.border,
          'shadow-[1px_1px_0_0_rgba(0,0,0,0.5)]'
        )}
        title={colorData.name}
      />
      {showName && (
        <span className="font-pixel text-xs uppercase text-gray-300">{colorData.name}</span>
      )}
    </div>
  );
}
