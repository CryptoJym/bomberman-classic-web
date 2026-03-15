'use client';

import { cn } from '@/lib/utils/cn';

export interface ProgressProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'health' | 'mana' | 'experience' | 'danger';
  /** Show percentage label */
  showLabel?: boolean;
  /** Label format function */
  formatLabel?: (value: number, max: number) => string;
  /** Whether to animate the progress */
  animated?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Pixel-art progress bar component
 */
export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  formatLabel,
  animated = true,
  className,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const variantStyles = {
    default: {
      bg: 'bg-game-wall/30',
      fill: 'bg-gradient-to-r from-bomber-blue to-bomber-cyan',
      glow: 'shadow-[0_0_8px_rgba(0,130,200,0.5)]',
    },
    health: {
      bg: 'bg-red-900/30',
      fill: percentage > 50
        ? 'bg-gradient-to-r from-green-600 to-bomber-green'
        : percentage > 25
        ? 'bg-gradient-to-r from-yellow-600 to-bomber-yellow'
        : 'bg-gradient-to-r from-red-700 to-bomber-red',
      glow: percentage > 50
        ? 'shadow-[0_0_8px_rgba(60,180,75,0.5)]'
        : percentage > 25
        ? 'shadow-[0_0_8px_rgba(255,225,25,0.5)]'
        : 'shadow-[0_0_8px_rgba(230,25,75,0.5)]',
    },
    mana: {
      bg: 'bg-blue-900/30',
      fill: 'bg-gradient-to-r from-blue-600 to-bomber-blue',
      glow: 'shadow-[0_0_8px_rgba(0,130,200,0.5)]',
    },
    experience: {
      bg: 'bg-purple-900/30',
      fill: 'bg-gradient-to-r from-bomber-purple to-purple-400',
      glow: 'shadow-[0_0_8px_rgba(145,30,180,0.5)]',
    },
    danger: {
      bg: 'bg-red-900/30',
      fill: 'bg-gradient-to-r from-bomber-red to-bomber-orange',
      glow: 'shadow-[0_0_8px_rgba(230,25,75,0.5)]',
    },
  };

  const variantConfig = variantStyles[variant];
  const label = formatLabel
    ? formatLabel(value, max)
    : `${Math.round(percentage)}%`;

  return (
    <div className={cn('relative', className)}>
      {/* Background track */}
      <div
        className={cn(
          'relative w-full overflow-hidden',
          sizeStyles[size],
          variantConfig.bg,
          // Pixel-art border
          'border-2 border-t-gray-800 border-l-gray-800 border-b-gray-600 border-r-gray-600',
          // Inner shadow
          'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]'
        )}
      >
        {/* Fill bar */}
        <div
          className={cn(
            'h-full',
            variantConfig.fill,
            animated && 'transition-all duration-300 ease-out',
            percentage > 0 && variantConfig.glow
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Pixel highlights on the fill */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40" />
          </div>
        </div>

        {/* Segment lines for retro feel */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-black/20 last:border-r-0"
            />
          ))}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'font-pixel text-xs',
            size === 'sm' && 'text-[8px]',
            size === 'lg' && 'text-sm',
            'text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)]'
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export interface HealthBarProps {
  /** Current health */
  current: number;
  /** Maximum health */
  max: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show numerical label */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Game-specific health bar with hearts or numerical display
 */
export function HealthBar({ current, max, size = 'md', showLabel = true, className }: HealthBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Heart icon */}
      <div
        className={cn(
          'flex-shrink-0',
          size === 'sm' && 'w-4 h-4',
          size === 'md' && 'w-5 h-5',
          size === 'lg' && 'w-6 h-6'
        )}
      >
        <svg viewBox="0 0 10 10" fill="currentColor" className="text-bomber-red">
          {/* Pixel heart */}
          <rect x="1" y="2" width="2" height="2" />
          <rect x="3" y="1" width="2" height="2" />
          <rect x="5" y="2" width="2" height="2" />
          <rect x="7" y="2" width="2" height="2" />
          <rect x="1" y="4" width="2" height="2" />
          <rect x="3" y="4" width="4" height="2" />
          <rect x="7" y="4" width="2" height="2" />
          <rect x="2" y="6" width="6" height="2" />
          <rect x="3" y="8" width="4" height="1" />
          <rect x="4" y="9" width="2" height="1" />
        </svg>
      </div>

      {/* Progress bar */}
      <Progress
        value={current}
        max={max}
        variant="health"
        size={size}
        showLabel={showLabel}
        formatLabel={(v, m) => `${v}/${m}`}
        className="flex-1"
      />
    </div>
  );
}

export interface TimerBarProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Total time in seconds */
  totalTime: number;
  /** Whether to show warning state */
  warningThreshold?: number;
  /** Whether to show critical state */
  criticalThreshold?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Game timer bar that changes color as time runs out
 */
export function TimerBar({
  timeRemaining,
  totalTime,
  warningThreshold = 30,
  criticalThreshold = 10,
  className,
}: TimerBarProps) {
  const variant =
    timeRemaining <= criticalThreshold
      ? 'danger'
      : timeRemaining <= warningThreshold
      ? 'experience'
      : 'default';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'font-pixel text-xs',
          timeRemaining <= criticalThreshold && 'text-bomber-red animate-flash',
          timeRemaining <= warningThreshold && timeRemaining > criticalThreshold && 'text-bomber-yellow'
        )}
      >
        {formatTime(timeRemaining)}
      </span>
      <Progress
        value={timeRemaining}
        max={totalTime}
        variant={variant}
        size="sm"
        animated={false}
        className="flex-1"
      />
    </div>
  );
}
