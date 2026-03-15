'use client';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import type { GameSummary } from '@/types/api';

export interface MatchHistoryProps {
  /** List of matches */
  matches: GameSummary[];
  /** Loading state */
  loading?: boolean;
  /** Load more handler */
  onLoadMore?: () => void;
  /** Has more matches */
  hasMore?: boolean;
  /** Match click handler */
  onMatchClick?: (matchId: string) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Match history list component
 */
export function MatchHistory({
  matches,
  loading = false,
  onLoadMore,
  hasMore = false,
  onMatchClick,
  className,
}: MatchHistoryProps) {
  if (matches.length === 0 && !loading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12',
          'bg-retro-darker/50 border-2 border-dashed border-game-wall/30',
          className
        )}
      >
        <span className="text-4xl mb-3">🎮</span>
        <span className="font-pixel text-sm text-gray-500">No matches yet</span>
        <span className="font-retro text-xs text-gray-600 mt-1">
          Play some games to see your history!
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          onClick={() => onMatchClick?.(match.id)}
        />
      ))}

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      )}

      {hasMore && onLoadMore && !loading && (
        <Button
          variant="secondary"
          onClick={onLoadMore}
          className="w-full"
        >
          LOAD MORE
        </Button>
      )}
    </div>
  );
}

interface MatchCardProps {
  match: GameSummary;
  onClick?: () => void;
}

function MatchCard({ match, onClick }: MatchCardProps) {
  const resultConfig: Record<'win' | 'loss' | 'draw', { color: string; text: string; bg: string }> = {
    win: { color: 'text-bomber-green', text: 'VICTORY', bg: 'bg-bomber-green/10' },
    loss: { color: 'text-bomber-red', text: 'DEFEAT', bg: 'bg-bomber-red/10' },
    draw: { color: 'text-bomber-yellow', text: 'DRAW', bg: 'bg-bomber-yellow/10' },
  };

  const resultStyle = resultConfig[match.result];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) {
      return 'Just now';
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    if (days < 7) {
      return `${days}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'relative',
        'bg-retro-navy/80 backdrop-blur-sm',
        'border-2 border-t-gray-600 border-l-gray-600 border-b-game-wall border-r-game-wall',
        'shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]',
        onClick && 'cursor-pointer hover:bg-retro-navy transition-colors'
      )}
      onClick={onClick}
    >
      {/* Result indicator bar */}
      <div
        className={cn('absolute left-0 top-0 bottom-0 w-1', resultStyle.bg)}
        style={{
          backgroundColor:
            match.result === 'win'
              ? '#3cb44b'
              : match.result === 'loss'
              ? '#e6194b'
              : '#ffe119',
        }}
      />

      <div className="pl-4 pr-3 py-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('font-pixel text-sm', resultStyle.color)}>
                {resultStyle.text}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs">⚔️</span>
              <span className="font-retro text-[10px] text-gray-400">
                Battle • {match.map.name}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-retro text-[10px] text-gray-500 block">
              {formatDate(match.playedAt)}
            </span>
            <span className="font-retro text-[10px] text-gray-600">
              {formatDuration(match.duration)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* K/D */}
            <div className="flex items-center gap-1">
              <span className="font-pixel text-xs text-bomber-green">
                {match.kills}
              </span>
              <span className="font-pixel text-[10px] text-gray-600">/</span>
              <span className="font-pixel text-xs text-bomber-red">
                {match.deaths}
              </span>
            </div>

            {/* Position */}
            <div className="flex items-center gap-1">
              <span className="font-retro text-[10px] text-gray-500">#</span>
              <span className="font-pixel text-xs text-white">
                {match.placement}
              </span>
            </div>

            {/* Players count */}
            <div className="flex items-center gap-1">
              <span className="font-retro text-[10px] text-gray-500">of</span>
              <span className="font-pixel text-xs text-white">
                {match.totalPlayers}
              </span>
            </div>
          </div>

          {/* Elo change */}
          <div className="flex items-center gap-2">
            {match.eloChange !== 0 && (
              <span
                className={cn(
                  'font-pixel text-xs',
                  match.eloChange > 0 ? 'text-bomber-green' : 'text-bomber-red'
                )}
              >
                {match.eloChange > 0 ? '+' : ''}
                {match.eloChange}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCardSkeleton() {
  return (
    <div
      className={cn(
        'bg-retro-navy/60',
        'border-2 border-game-wall/30',
        'p-3',
        'animate-pulse'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="h-4 w-20 bg-gray-700 rounded" />
          <div className="h-3 w-32 bg-gray-700/50 rounded mt-1" />
        </div>
        <div className="h-3 w-16 bg-gray-700/50 rounded" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-3 w-12 bg-gray-700/50 rounded" />
          <div className="h-3 w-8 bg-gray-700/50 rounded" />
          <div className="h-3 w-12 bg-gray-700/50 rounded" />
        </div>
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-6 h-6 bg-gray-700 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export interface MatchDetailProps {
  /** Match data */
  match: GameSummary;
  /** Close handler */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Detailed match view
 */
export function MatchDetail({ match, onClose, className }: MatchDetailProps) {
  const resultConfig: Record<'win' | 'loss' | 'draw', { color: string; text: string }> = {
    win: { color: 'text-bomber-green', text: 'VICTORY' },
    loss: { color: 'text-bomber-red', text: 'DEFEAT' },
    draw: { color: 'text-bomber-yellow', text: 'DRAW' },
  };

  const resultStyle = resultConfig[match.result];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div
      className={cn(
        'bg-retro-navy/95 backdrop-blur-sm',
        'border-2 border-game-wall',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-wall/30 bg-retro-darker/50">
        <div>
          <span className={cn('font-pixel text-lg', resultStyle.color)}>
            {resultStyle.text}
          </span>
          <span className="font-retro text-xs text-gray-400 block mt-0.5">
            {new Date(match.playedAt).toLocaleDateString()} • {formatDuration(match.duration)}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-pixel text-gray-500 hover:text-white text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Match info */}
      <div className="px-4 py-3 border-b border-game-wall/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-pixel text-[10px] text-gray-500 block">MAP</span>
              <span className="font-pixel text-xs text-white">{match.map.name}</span>
            </div>
            <div>
              <span className="font-pixel text-[10px] text-gray-500 block">PLACEMENT</span>
              <span className="font-pixel text-xs text-white">
                #{match.placement} / {match.totalPlayers}
              </span>
            </div>
          </div>

          {match.eloChange !== 0 && (
            <div className="text-right">
              <span className="font-pixel text-[10px] text-gray-500 block">ELO</span>
              <span
                className={cn(
                  'font-pixel text-sm',
                  match.eloChange > 0 ? 'text-bomber-green' : 'text-bomber-red'
                )}
              >
                {match.eloChange > 0 ? '+' : ''}
                {match.eloChange}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <span className="font-pixel text-xs text-bomber-yellow mb-3 block">YOUR STATS</span>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-gray-500 block mb-1">KILLS</span>
            <span className="font-pixel text-lg text-bomber-green">{match.kills}</span>
          </div>
          <div className="text-center">
            <span className="font-pixel text-[10px] text-gray-500 block mb-1">DEATHS</span>
            <span className="font-pixel text-lg text-bomber-red">{match.deaths}</span>
          </div>
          <div className="text-center">
            <span className="font-pixel text-[10px] text-gray-500 block mb-1">K/D</span>
            <span className="font-pixel text-lg text-white">
              {match.deaths === 0 ? match.kills : (match.kills / match.deaths).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface MatchHistoryFilterProps {
  /** Current filter */
  filter: {
    result?: 'win' | 'loss' | 'draw';
  };
  /** Filter change handler */
  onChange: (filter: { result?: 'win' | 'loss' | 'draw' }) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Match history filter controls
 */
export function MatchHistoryFilter({
  filter,
  onChange,
  className,
}: MatchHistoryFilterProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <select
        value={filter.result || ''}
        onChange={(e) =>
          onChange({ ...filter, result: (e.target.value as 'win' | 'loss' | 'draw') || undefined })
        }
        className={cn(
          'bg-retro-darker border-2 border-game-wall/50',
          'px-2 py-1',
          'font-pixel text-xs text-white',
          'focus:outline-none focus:border-bomber-blue'
        )}
      >
        <option value="">All Results</option>
        <option value="win">Wins</option>
        <option value="loss">Losses</option>
        <option value="draw">Draws</option>
      </select>
    </div>
  );
}
