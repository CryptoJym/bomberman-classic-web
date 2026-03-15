'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from './RankBadge';
import type { LeaderboardEntry } from '@/types/api';
import Link from 'next/link';

export interface LeaderboardEntryProps {
  /** Leaderboard entry data */
  entry: LeaderboardEntry;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** Show country flag */
  showCountry?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Individual leaderboard entry row
 */
export function LeaderboardEntryRow({
  entry,
  isCurrentUser = false,
  showCountry = true,
  className,
}: LeaderboardEntryProps) {
  const {
    rank,
    username,
    avatarUrl,
    rankTier,
    value,
    eloRating,
    totalWins,
    totalGames,
    winRate,
    country,
    rankChange,
  } = entry;

  // Medal colors for top 3
  const getMedalIcon = (rank: number) => {
    if (rank === 1) {
      return '🥇';
    }
    if (rank === 2) {
      return '🥈';
    }
    if (rank === 3) {
      return '🥉';
    }
    return null;
  };

  const medal = getMedalIcon(rank);

  return (
    <Link
      href={`/profile/${entry.playerId}`}
      className={cn(
        'group relative flex items-center gap-3 p-3',
        'bg-retro-navy/50 backdrop-blur-sm',
        'border-2 border-game-wall/30',
        'transition-all duration-150',
        'hover:border-bomber-blue hover:bg-retro-navy/80',
        'hover:translate-x-1',
        isCurrentUser && cn(
          'bg-bomber-blue/10',
          'border-bomber-blue/50',
          'shadow-[0_0_10px_rgba(0,130,200,0.3)]'
        ),
        className
      )}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-12 shrink-0">
        {medal ? (
          <span className="text-2xl">{medal}</span>
        ) : (
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10',
              'font-pixel text-sm',
              rank <= 10 ? 'text-bomber-yellow' : 'text-gray-400'
            )}
          >
            #{rank}
          </div>
        )}
      </div>

      {/* Rank Change Indicator */}
      {rankChange !== undefined && rankChange !== 0 && (
        <div
          className={cn(
            'absolute left-2 top-2 flex items-center gap-0.5',
            'font-pixel text-[8px]',
            rankChange > 0 ? 'text-bomber-green' : 'text-bomber-red'
          )}
          title={`${rankChange > 0 ? '+' : ''}${rankChange} places`}
        >
          <span>{rankChange > 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(rankChange)}</span>
        </div>
      )}

      {/* Avatar */}
      <Avatar
        src={avatarUrl}
        alt={username}
        size="md"
        className="shrink-0"
      />

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-pixel text-sm truncate',
              isCurrentUser ? 'text-bomber-cyan' : 'text-white'
            )}
          >
            {username}
          </span>
          {showCountry && country && (
            <span className="text-base" title={country}>
              {getFlagEmoji(country)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <RankBadge tier={rankTier} size="sm" showName={false} />
          <span className="font-retro text-xs text-gray-400">
            {totalWins}W / {totalGames}G ({winRate.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="font-pixel text-lg text-bomber-yellow">
          {value.toLocaleString()}
        </div>
        <div className="font-retro text-xs text-gray-400">
          {eloRating} ELO
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-bomber-blue">→</span>
      </div>
    </Link>
  );
}

/**
 * Get flag emoji from country code
 */
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
