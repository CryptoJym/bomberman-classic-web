'use client';

import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from '@/lib/utils/format';
import type { GameSummary } from '@/types/api';

export interface MatchHistoryItemProps {
  /** Match data */
  match: GameSummary;
  /** Additional class names */
  className?: string;
}

/**
 * Individual match history entry
 */
export function MatchHistoryItem({ match, className }: MatchHistoryItemProps) {
  const getResultColor = (result: 'win' | 'loss' | 'draw'): string => {
    switch (result) {
      case 'win':
        return 'border-bomber-green bg-bomber-green/10';
      case 'loss':
        return 'border-bomber-red bg-bomber-red/10';
      case 'draw':
        return 'border-bomber-yellow bg-bomber-yellow/10';
    }
  };

  const getResultBadgeVariant = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return 'success';
      case 'loss':
        return 'danger';
      case 'draw':
        return 'warning';
    }
  };

  const getPlacementSuffix = (placement: number): string => {
    if (placement === 1) {
      return 'st';
    }
    if (placement === 2) {
      return 'nd';
    }
    if (placement === 3) {
      return 'rd';
    }
    return 'th';
  };

  return (
    <div
      className={cn(
        'relative p-4',
        'border-2 border-l-4',
        getResultColor(match.result),
        'transition-all duration-150',
        'hover:translate-x-1',
        'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Map and Result */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Map Thumbnail */}
          <div className="w-12 h-12 flex-shrink-0 bg-retro-darker border-2 border-game-wall flex items-center justify-center">
            {match.map.thumbnailUrl ? (
              <img
                src={match.map.thumbnailUrl}
                alt={match.map.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span className="text-xl">🗺️</span>
            )}
          </div>

          {/* Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={getResultBadgeVariant(match.result)}
                size="sm"
              >
                {match.result.toUpperCase()}
              </Badge>
              <span className="font-pixel text-xs text-gray-400">
                {match.placement}
                {getPlacementSuffix(match.placement)} / {match.totalPlayers}
              </span>
            </div>
            <p className="font-retro text-sm text-white truncate">{match.map.name}</p>
            <p className="font-retro text-xs text-gray-500">
              {formatDistanceToNow(new Date(match.playedAt))} ago
            </p>
          </div>
        </div>

        {/* Middle: Stats */}
        <div className="flex items-center gap-4">
          <StatPill
            label="K"
            value={match.kills}
            color="text-bomber-red"
          />
          <StatPill
            label="D"
            value={match.deaths}
            color="text-gray-400"
          />
          <StatPill
            label="ELO"
            value={match.eloChange >= 0 ? `+${match.eloChange}` : match.eloChange.toString()}
            color={match.eloChange >= 0 ? 'text-bomber-green' : 'text-bomber-red'}
          />
        </div>

        {/* Right: Players */}
        <div className="hidden md:block">
          <AvatarGroup size="sm" max={4}>
            {match.players.map((player) => (
              <Avatar
                key={player.id}
                src={null}
                alt={player.username}
                fallback={player.username[0]}
                size="sm"
              />
            ))}
          </AvatarGroup>
        </div>

        {/* Replay Button */}
        {match.hasReplay && (
          <div className="flex-shrink-0">
            <button
              className={cn(
                'w-8 h-8',
                'flex items-center justify-center',
                'bg-retro-darker border-2 border-game-wall',
                'hover:border-bomber-blue hover:bg-bomber-blue/20',
                'transition-colors'
              )}
              title="Watch Replay"
            >
              <span className="text-sm">▶</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatPill({ label, value, color = 'text-white' }: StatPillProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-retro text-[10px] text-gray-500 uppercase">{label}</span>
      <span className={cn('font-pixel text-sm', color)}>{value}</span>
    </div>
  );
}
