'use client';

import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { ColorBadge } from './ColorPicker';
import type { PlayerSummary } from '@/types/game';

export interface PlayerSlotProps {
  /** Player data (null for empty slot) */
  player: PlayerSummary | null;
  /** Slot index (0-based) */
  slotIndex: number;
  /** Whether this is the current user's slot */
  isCurrentUser?: boolean;
  /** Whether the current user is the host */
  isHost?: boolean;
  /** Callback when kick button is clicked (host only) */
  onKick?: (playerId: string) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Player slot component for lobby
 * Displays player information or an empty slot
 */
export function PlayerSlot({
  player,
  slotIndex,
  isCurrentUser = false,
  isHost = false,
  onKick,
  className,
}: PlayerSlotProps) {
  const isEmpty = !player;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 p-3',
        'bg-retro-darker/50 backdrop-blur-sm',
        'border-2',
        // Border styling based on state
        player?.isReady
          ? 'border-bomber-green/50 bg-bomber-green/5'
          : 'border-game-wall/30',
        // Glow effect for ready players
        player?.isReady && 'shadow-[0_0_8px_rgba(60,180,75,0.3)]',
        // Current user highlight
        isCurrentUser && 'ring-2 ring-bomber-blue/50',
        className
      )}
    >
      {/* Slot number */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8',
          'flex items-center justify-center',
          'font-pixel text-xs',
          'bg-retro-dark border border-game-wall/50',
          isEmpty ? 'text-gray-600' : 'text-gray-400'
        )}
      >
        {slotIndex + 1}
      </div>

      {isEmpty ? (
        // Empty slot
        <div className="flex-1 flex items-center justify-center py-2">
          <span className="font-pixel text-xs text-gray-600 uppercase">
            Waiting for player...
          </span>
        </div>
      ) : (
        <>
          {/* Player color */}
          <ColorBadge color={player.color} size="md" />

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-sm text-white truncate">
                {player.username}
              </span>

              {/* Host badge */}
              {player.isHost && (
                <Badge variant="warning" size="sm" glow>
                  HOST
                </Badge>
              )}

              {/* Current user badge */}
              {isCurrentUser && (
                <Badge variant="primary" size="sm">
                  YOU
                </Badge>
              )}
            </div>

            {/* Stats */}
            {player.kills > 0 && (
              <div className="mt-1 flex items-center gap-2 text-[10px] font-retro text-gray-500">
                <span>{player.kills} kills</span>
              </div>
            )}
          </div>

          {/* Ready status */}
          <div className="flex-shrink-0">
            {player.isReady ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-bomber-green animate-pulse" />
                <span className="font-pixel text-[10px] text-bomber-green uppercase">
                  Ready
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <span className="font-pixel text-[10px] text-gray-500 uppercase">
                  Not Ready
                </span>
              </div>
            )}
          </div>

          {/* Kick button (host only, can't kick self or other host) */}
          {isHost && !isCurrentUser && !player.isHost && onKick && (
            <button
              type="button"
              onClick={() => onKick(player.id)}
              className={cn(
                'flex-shrink-0 px-2 py-1',
                'font-pixel text-[10px] uppercase',
                'text-bomber-red hover:text-white',
                'bg-bomber-red/10 hover:bg-bomber-red/30',
                'border border-bomber-red/50 hover:border-bomber-red',
                'transition-colors duration-150'
              )}
              title="Kick player"
            >
              Kick
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Grid of player slots for the lobby
 */
export interface PlayerSlotGridProps {
  /** Array of players */
  players: PlayerSummary[];
  /** Maximum number of players */
  maxPlayers: number;
  /** Current user's player ID */
  currentPlayerId?: string;
  /** ID of the host player (unused parameter) */
  _hostId: string;
  /** Callback when kick button is clicked */
  onKick?: (playerId: string) => void;
  /** Additional class names */
  className?: string;
}

export function PlayerSlotGrid({
  players,
  maxPlayers,
  currentPlayerId,
  _hostId: _,
  onKick,
  className,
}: PlayerSlotGridProps) {
  const isHost = players.find((p) => p.id === currentPlayerId)?.isHost || false;

  // Create array of all slots (filled + empty)
  const slots = Array.from({ length: maxPlayers }, (_, i) => {
    return players[i] || null;
  });

  return (
    <div className={cn('grid gap-2 md:grid-cols-2', className)}>
      {slots.map((player, index) => (
        <PlayerSlot
          key={player?.id || `empty-${index}`}
          player={player}
          slotIndex={index}
          isCurrentUser={player?.id === currentPlayerId}
          isHost={isHost}
          onKick={onKick}
        />
      ))}
    </div>
  );
}
