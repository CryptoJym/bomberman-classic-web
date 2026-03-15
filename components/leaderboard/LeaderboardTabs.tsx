'use client';

import { cn } from '@/lib/utils/cn';
import type { LeaderboardType } from '@/types/api';

export interface LeaderboardTabsProps {
  /** Current leaderboard type */
  value: LeaderboardType;
  /** Callback when type changes */
  onChange: (type: LeaderboardType) => void;
  /** Additional class names */
  className?: string;
}

const LEADERBOARD_TYPES: Array<{
  value: LeaderboardType;
  label: string;
  icon: string;
  description: string;
}> = [
  { value: 'elo', label: 'Rating', icon: '⭐', description: 'ELO Rating' },
  { value: 'wins', label: 'Wins', icon: '🏆', description: 'Total Wins' },
  { value: 'kills', label: 'Kills', icon: '💣', description: 'Total Kills' },
  { value: 'games', label: 'Games', icon: '🎮', description: 'Games Played' },
  { value: 'win_streak', label: 'Streak', icon: '🔥', description: 'Win Streak' },
];

/**
 * Category tabs for leaderboard types
 */
export function LeaderboardTabs({ value, onChange, className }: LeaderboardTabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1',
        'p-1',
        'bg-retro-darker',
        'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
        'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]',
        'overflow-x-auto scrollbar-hide',
        className
      )}
      role="tablist"
    >
      {LEADERBOARD_TYPES.map((tab) => {
        const isActive = value === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            onClick={() => onChange(tab.value)}
            aria-selected={isActive}
            title={tab.description}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 whitespace-nowrap',
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
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
