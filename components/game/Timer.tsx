'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TimerProps {
  /** Initial time in seconds */
  initialTime: number;
  /** Whether the timer is running */
  isRunning?: boolean;
  /** Callback when timer reaches zero */
  onComplete?: () => void;
  /** Callback on each tick */
  onTick?: (timeRemaining: number) => void;
  /** Warning threshold in seconds */
  warningThreshold?: number;
  /** Critical threshold in seconds */
  criticalThreshold?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show progress bar */
  showProgress?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Game timer component with countdown
 */
export function Timer({
  initialTime,
  isRunning = true,
  onComplete,
  onTick,
  warningThreshold = 30,
  criticalThreshold = 10,
  size = 'md',
  showProgress = false,
  className,
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        onTick?.(next);

        if (next <= 0) {
          onComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, onComplete, onTick]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimeColor = () => {
    if (timeRemaining <= criticalThreshold) {
      return 'text-bomber-red';
    }
    if (timeRemaining <= warningThreshold) {
      return 'text-bomber-yellow';
    }
    return 'text-white';
  };

  const sizeStyles = {
    sm: {
      container: 'px-2 py-1',
      time: 'text-xs',
      label: 'text-[6px]',
    },
    md: {
      container: 'px-3 py-2',
      time: 'text-sm',
      label: 'text-[8px]',
    },
    lg: {
      container: 'px-4 py-3',
      time: 'text-lg',
      label: 'text-xs',
    },
  };

  const config = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        'bg-black/60 backdrop-blur-sm',
        'border border-game-wall/50',
        config.container,
        className
      )}
    >
      <span className={cn('font-pixel text-gray-500 uppercase', config.label)}>
        TIME
      </span>
      <span
        className={cn(
          'font-pixel',
          config.time,
          getTimeColor(),
          timeRemaining <= criticalThreshold && 'animate-flash'
        )}
      >
        {formatTime(timeRemaining)}
      </span>

      {showProgress && (
        <div className="w-full h-1 mt-1 bg-gray-800">
          <div
            className={cn(
              'h-full transition-all duration-1000 linear',
              timeRemaining <= criticalThreshold
                ? 'bg-bomber-red'
                : timeRemaining <= warningThreshold
                ? 'bg-bomber-yellow'
                : 'bg-bomber-blue'
            )}
            style={{
              width: `${(timeRemaining / initialTime) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export interface CountdownProps {
  /** Countdown start number */
  from: number;
  /** Whether the countdown is active */
  active?: boolean;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional class names */
  className?: string;
}

/**
 * Pre-game countdown component (3, 2, 1, GO!)
 */
export function Countdown({
  from = 3,
  active = true,
  onComplete,
  size = 'lg',
  className,
}: CountdownProps) {
  const [count, setCount] = useState(from);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    setCount(from);
    setVisible(true);

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 1000);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, from, onComplete]);

  const sizeStyles = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  if (!visible) {
    return null;
  }

  const displayText = count > 0 ? count.toString() : 'GO!';
  const displayColor = count > 0 ? 'text-bomber-yellow' : 'text-bomber-green';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'bg-black/70 backdrop-blur-sm',
        className
      )}
    >
      <div
        key={count}
        className={cn(
          'font-pixel',
          sizeStyles[size],
          displayColor,
          'animate-in zoom-in-50 duration-200',
          'drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]'
        )}
      >
        {displayText}
      </div>
    </div>
  );
}

export interface RoundTimerProps {
  /** Round number */
  round: number;
  /** Total rounds */
  totalRounds: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Total time per round */
  totalTime: number;
  /** Additional class names */
  className?: string;
}

/**
 * Combined round and timer display for game HUD
 */
export function RoundTimer({
  round,
  totalRounds,
  timeRemaining,
  totalTime,
  className,
}: RoundTimerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCritical = timeRemaining <= 10;
  const isWarning = timeRemaining <= 30 && !isCritical;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-2',
        'bg-black/70 backdrop-blur-sm',
        'border-2 border-game-wall/50',
        className
      )}
    >
      {/* Round indicator */}
      <div className="flex flex-col items-center">
        <span className="font-pixel text-[8px] text-gray-500">ROUND</span>
        <span className="font-pixel text-sm text-white">
          {round}/{totalRounds}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-game-wall/30" />

      {/* Timer */}
      <div className="flex flex-col items-center">
        <span className="font-pixel text-[8px] text-gray-500">TIME</span>
        <span
          className={cn(
            'font-pixel text-sm',
            isCritical ? 'text-bomber-red animate-flash' : isWarning ? 'text-bomber-yellow' : 'text-white'
          )}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-20 h-2 bg-gray-800 border border-gray-700">
        <div
          className={cn(
            'h-full transition-all duration-1000 linear',
            isCritical ? 'bg-bomber-red' : isWarning ? 'bg-bomber-yellow' : 'bg-bomber-green'
          )}
          style={{
            width: `${(timeRemaining / totalTime) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
