'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import type { PlayerColor } from './PlayerCard';

export interface PlayerScore {
  /** Player ID */
  id: string;
  /** Player name */
  name: string;
  /** Player avatar URL */
  avatarUrl?: string | null;
  /** Player color */
  color: PlayerColor;
  /** Current score */
  score: number;
  /** Number of kills */
  kills?: number;
  /** Number of deaths */
  deaths?: number;
  /** Lives remaining */
  lives?: number;
  /** Whether player is alive */
  isAlive?: boolean;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
}

export interface ScoreboardProps {
  /** Player scores */
  players: PlayerScore[];
  /** Current round number */
  round?: number;
  /** Total rounds */
  totalRounds?: number;
  /** Sort by score */
  sortByScore?: boolean;
  /** Variant style */
  variant?: 'overlay' | 'panel' | 'minimal';
  /** Additional class names */
  className?: string;
}

/**
 * In-game scoreboard component
 */
export function Scoreboard({
  players,
  round,
  totalRounds,
  sortByScore = true,
  variant = 'overlay',
  className,
}: ScoreboardProps) {
  const sortedPlayers = sortByScore
    ? [...players].sort((a, b) => b.score - a.score)
    : players;

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center gap-4',
          className
        )}
      >
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1',
              'bg-black/40 backdrop-blur-sm',
              player.isCurrentUser && 'ring-1 ring-accent-gold'
            )}
          >
            <span className="font-pixel text-[10px] text-gray-400">
              {index + 1}.
            </span>
            <div
              className="w-2 h-2"
              style={{
                backgroundColor: getPlayerColorHex(player.color),
              }}
            />
            <span className="font-pixel text-xs text-white">
              {player.score}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === 'overlay' && [
          'bg-retro-navy/95 backdrop-blur-sm',
          'border-2 border-game-wall',
          'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        ],
        variant === 'panel' && [
          'bg-retro-darker',
          'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
        ],
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-2 border-b-2 border-game-wall/30',
          'flex items-center justify-between',
          'bg-retro-navy/50'
        )}
      >
        <span className="font-pixel text-xs text-bomber-yellow uppercase">
          SCOREBOARD
        </span>
        {round !== undefined && totalRounds !== undefined && (
          <span className="font-pixel text-xs text-gray-400">
            ROUND {round}/{totalRounds}
          </span>
        )}
      </div>

      {/* Players list */}
      <div className="p-2">
        {sortedPlayers.map((player, index) => (
          <ScoreboardRow
            key={player.id}
            player={player}
            rank={index + 1}
            isFirst={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

interface ScoreboardRowProps {
  player: PlayerScore;
  rank: number;
  isFirst: boolean;
}

function ScoreboardRow({ player, rank, isFirst }: ScoreboardRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-1.5',
        'border-b border-game-wall/10 last:border-b-0',
        !player.isAlive && 'opacity-50',
        player.isCurrentUser && 'bg-accent-gold/10',
        isFirst && 'bg-bomber-yellow/10'
      )}
    >
      {/* Rank */}
      <span
        className={cn(
          'w-5 font-pixel text-xs text-center',
          isFirst ? 'text-accent-gold' : 'text-gray-500'
        )}
      >
        {rank}
      </span>

      {/* Color indicator */}
      <div
        className="w-3 h-3 flex-shrink-0"
        style={{
          backgroundColor: getPlayerColorHex(player.color),
          boxShadow: `0 0 4px ${getPlayerColorHex(player.color)}40`,
        }}
      />

      {/* Name */}
      <span
        className={cn(
          'flex-1 font-pixel text-[10px] uppercase truncate',
          player.isAlive ? 'text-white' : 'text-gray-500 line-through'
        )}
      >
        {player.name}
      </span>

      {/* Lives */}
      {player.lives !== undefined && (
        <div className="flex items-center gap-0.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2',
                i < player.lives! ? 'bg-bomber-red' : 'bg-gray-700'
              )}
            />
          ))}
        </div>
      )}

      {/* Score */}
      <span className="font-pixel text-xs text-bomber-yellow w-8 text-right">
        {player.score}
      </span>
    </div>
  );
}

function getPlayerColorHex(color: PlayerColor): string {
  const colors: Record<PlayerColor, string> = {
    white: '#f8f8f8',
    black: '#2d2d2d',
    red: '#e6194b',
    blue: '#0082c8',
    green: '#3cb44b',
    yellow: '#ffe119',
    pink: '#f032e6',
    cyan: '#46f0f0',
  };
  return colors[color];
}

export interface GameResultProps {
  /** Winner player or null for draw */
  winner?: PlayerScore | null;
  /** All player scores */
  players: PlayerScore[];
  /** Round number */
  round?: number;
  /** Callback to continue */
  onContinue?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * End of round/game result display
 */
export function GameResult({
  winner,
  players,
  round,
  onContinue,
  className,
}: GameResultProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-6 p-8',
        'bg-retro-navy/95 backdrop-blur-sm',
        'border-4 border-accent-gold',
        'shadow-[8px_8px_0_0_rgba(0,0,0,0.5)]',
        'animate-in zoom-in-95 duration-300',
        className
      )}
    >
      {/* Title */}
      <h2 className="font-pixel text-xl text-bomber-yellow animate-pulse">
        {winner ? 'VICTORY!' : 'DRAW!'}
      </h2>

      {/* Winner display */}
      {winner && (
        <div className="flex flex-col items-center gap-3">
          <Avatar
            src={winner.avatarUrl}
            alt={winner.name}
            size="xl"
            playerColor={winner.color}
            ring
          />
          <span
            className="font-pixel text-lg uppercase"
            style={{ color: getPlayerColorHex(winner.color) }}
          >
            {winner.name}
          </span>
        </div>
      )}

      {/* Round info */}
      {round && (
        <span className="font-retro text-sm text-gray-400">
          Round {round} Complete
        </span>
      )}

      {/* Final scores */}
      <Scoreboard
        players={players}
        variant="panel"
        className="w-full max-w-xs"
      />

      {/* Continue button */}
      {onContinue && (
        <button
          onClick={onContinue}
          className={cn(
            'px-6 py-3',
            'font-pixel text-sm text-black',
            'bg-bomber-yellow',
            'border-2 border-t-yellow-300 border-l-yellow-300 border-b-yellow-700 border-r-yellow-700',
            'shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]',
            'hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.6)]',
            'active:translate-y-1 active:shadow-none',
            'transition-all duration-100'
          )}
        >
          CONTINUE
        </button>
      )}
    </div>
  );
}
