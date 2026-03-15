'use client';

import { cn } from '@/lib/utils/cn';
import type { LeaderboardTimeFilter } from '@/types/api';

export interface LeaderboardFiltersProps {
  /** Current time filter */
  value: LeaderboardTimeFilter;
  /** Callback when filter changes */
  onChange: (filter: LeaderboardTimeFilter) => void;
  /** Additional class names */
  className?: string;
}

const TIME_FILTERS: Array<{
  value: LeaderboardTimeFilter;
  label: string;
  icon: string;
}> = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'monthly', label: 'Monthly', icon: '🗓️' },
  { value: 'all_time', label: 'All Time', icon: '♾️' },
];

/**
 * Time filter buttons for leaderboard
 */
export function LeaderboardFilters({ value, onChange, className }: LeaderboardFiltersProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'p-2',
        'bg-retro-darker',
        'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
        'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]',
        className
      )}
      role="group"
      aria-label="Time filter"
    >
      {TIME_FILTERS.map((filter) => {
        const isActive = value === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2',
              'font-pixel text-[10px] uppercase tracking-wider',
              'border-2 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-bomber-blue/50',
              isActive
                ? cn(
                    'bg-retro-navy text-bomber-yellow',
                    'border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
                    'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]',
                    '-translate-y-0.5'
                  )
                : cn(
                    'text-gray-400 border-transparent',
                    'hover:text-white hover:bg-game-wall/20'
                  )
            )}
            aria-pressed={isActive}
          >
            <span className="text-base">{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
