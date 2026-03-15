'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { PlayerColor, ReadyStatus } from '@/components/game/PlayerCard';

export interface LobbyPlayer {
  /** Player ID */
  id: string;
  /** Player name */
  name: string;
  /** Player avatar URL */
  avatarUrl?: string | null;
  /** Player color */
  color: PlayerColor;
  /** Ready status */
  status: ReadyStatus;
  /** Whether this is the host */
  isHost?: boolean;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** Player's rank/level */
  rank?: number;
  /** Player's wins */
  wins?: number;
}

export interface PlayerListProps {
  /** List of players */
  players: LobbyPlayer[];
  /** Maximum players */
  maxPlayers: number;
  /** Whether current user is host */
  isHost?: boolean;
  /** Kick player handler */
  onKick?: (playerId: string) => void;
  /** Color change handler */
  onColorChange?: (playerId: string, color: PlayerColor) => void;
  /** Available colors for selection */
  availableColors?: PlayerColor[];
  /** Variant style */
  variant?: 'list' | 'grid' | 'compact';
  /** Additional class names */
  className?: string;
}

const playerColorHex: Record<PlayerColor, string> = {
  white: '#f8f8f8',
  black: '#2d2d2d',
  red: '#e6194b',
  blue: '#0082c8',
  green: '#3cb44b',
  yellow: '#ffe119',
  pink: '#f032e6',
  cyan: '#46f0f0',
};

/**
 * Player list for game lobby
 */
export function PlayerList({
  players,
  maxPlayers,
  isHost = false,
  onKick,
  onColorChange,
  availableColors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'cyan'],
  variant = 'list',
  className,
}: PlayerListProps) {
  const emptySlots = maxPlayers - players.length;

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {players.map((player) => (
          <PlayerListItem
            key={player.id}
            player={player}
            isHost={isHost}
            onKick={onKick}
            onColorChange={onColorChange}
            availableColors={availableColors}
            variant="grid"
          />
        ))}
        {[...Array(emptySlots)].map((_, i) => (
          <EmptySlot key={`empty-${i}`} slotNumber={players.length + i + 1} variant="grid" />
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-1"
            title={`${player.name} - ${player.status}`}
          >
            <Avatar
              src={player.avatarUrl}
              alt={player.name}
              size="sm"
              playerColor={player.color}
              status={player.status === 'ready' ? 'online' : 'offline'}
            />
            {player.isHost && <span className="text-[10px]">👑</span>}
          </div>
        ))}
        {emptySlots > 0 && (
          <span className="font-pixel text-[10px] text-gray-500">
            +{emptySlots} slots
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {players.map((player) => (
        <PlayerListItem
          key={player.id}
          player={player}
          isHost={isHost}
          onKick={onKick}
          onColorChange={onColorChange}
          availableColors={availableColors}
          variant="list"
        />
      ))}
      {[...Array(emptySlots)].map((_, i) => (
        <EmptySlot key={`empty-${i}`} slotNumber={players.length + i + 1} variant="list" />
      ))}
    </div>
  );
}

interface PlayerListItemProps {
  player: LobbyPlayer;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  onColorChange?: (playerId: string, color: PlayerColor) => void;
  availableColors: PlayerColor[];
  variant: 'list' | 'grid';
}

function PlayerListItem({
  player,
  isHost,
  onKick,
  onColorChange,
  availableColors,
  variant,
}: PlayerListItemProps) {
  const statusConfig = {
    ready: { text: 'READY', color: 'success' as const, glow: true },
    not_ready: { text: 'NOT READY', color: 'secondary' as const, glow: false },
    loading: { text: 'LOADING', color: 'warning' as const, glow: false },
    spectating: { text: 'SPECTATING', color: 'info' as const, glow: false },
  };

  const statusInfo = statusConfig[player.status];

  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'relative p-3',
          'bg-retro-navy/80 backdrop-blur-sm',
          'border-2',
          'shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]',
          player.isCurrentUser && 'ring-2 ring-accent-gold ring-offset-1 ring-offset-retro-dark'
        )}
        style={{
          borderColor: `${playerColorHex[player.color]}80`,
        }}
      >
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={player.avatarUrl}
            alt={player.name}
            size="lg"
            playerColor={player.color}
            status={player.status === 'ready' ? 'online' : 'offline'}
          />

          <div className="mt-2">
            <div className="flex items-center justify-center gap-1">
              <span className="font-pixel text-xs text-white truncate">{player.name}</span>
              {player.isHost && <span className="text-xs">👑</span>}
            </div>

            {player.rank && (
              <span className="font-retro text-[10px] text-gray-400">
                Rank #{player.rank}
              </span>
            )}
          </div>

          <Badge
            variant={statusInfo.color}
            size="sm"
            glow={statusInfo.glow}
            className="mt-2"
          >
            {statusInfo.text}
          </Badge>

          {/* Color selector for current user */}
          {player.isCurrentUser && onColorChange && (
            <ColorSelector
              currentColor={player.color}
              availableColors={availableColors}
              onChange={(color) => onColorChange(player.id, color)}
              className="mt-2"
            />
          )}

          {/* Kick button */}
          {isHost && !player.isHost && !player.isCurrentUser && onKick && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onKick(player.id)}
              className="mt-2"
            >
              KICK
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2',
        'bg-retro-navy/80 backdrop-blur-sm',
        'border-2',
        'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]',
        player.isCurrentUser && 'ring-1 ring-accent-gold'
      )}
      style={{
        borderColor: `${playerColorHex[player.color]}80`,
      }}
    >
      <Avatar
        src={player.avatarUrl}
        alt={player.name}
        size="md"
        playerColor={player.color}
        status={player.status === 'ready' ? 'online' : 'offline'}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-pixel text-xs uppercase truncate',
              player.isCurrentUser ? 'text-accent-gold' : 'text-white'
            )}
          >
            {player.name}
          </span>
          {player.isHost && (
            <Badge variant="warning" size="sm">
              HOST
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={statusInfo.color} size="sm" glow={statusInfo.glow}>
            {statusInfo.text}
          </Badge>
          {player.wins !== undefined && (
            <span className="font-retro text-[10px] text-gray-400">
              {player.wins}W
            </span>
          )}
        </div>
      </div>

      {/* Color selector for current user */}
      {player.isCurrentUser && onColorChange && (
        <ColorSelector
          currentColor={player.color}
          availableColors={availableColors}
          onChange={(color) => onColorChange(player.id, color)}
        />
      )}

      {/* Kick button */}
      {isHost && !player.isHost && !player.isCurrentUser && onKick && (
        <Button variant="danger" size="sm" onClick={() => onKick(player.id)}>
          KICK
        </Button>
      )}
    </div>
  );
}

interface EmptySlotProps {
  slotNumber: number;
  variant: 'list' | 'grid';
}

function EmptySlot({ slotNumber, variant }: EmptySlotProps) {
  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-3',
          'bg-retro-darker/50',
          'border-2 border-dashed border-game-wall/30',
          'min-h-[140px]'
        )}
      >
        <span className="text-2xl text-gray-600">👤</span>
        <span className="font-pixel text-[10px] text-gray-500 mt-2">
          SLOT {slotNumber}
        </span>
        <span className="font-retro text-[8px] text-gray-600">
          Waiting for player...
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center p-2',
        'bg-retro-darker/50',
        'border-2 border-dashed border-game-wall/30',
        'min-h-[52px]'
      )}
    >
      <span className="font-pixel text-xs text-gray-500">
        SLOT {slotNumber} - EMPTY
      </span>
    </div>
  );
}

interface ColorSelectorProps {
  currentColor: PlayerColor;
  availableColors: PlayerColor[];
  onChange: (color: PlayerColor) => void;
  className?: string;
}

function ColorSelector({ currentColor, availableColors, onChange, className }: ColorSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {availableColors.slice(0, 4).map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'w-4 h-4 border transition-all',
            color === currentColor
              ? 'border-white scale-125'
              : 'border-gray-600 hover:scale-110'
          )}
          style={{ backgroundColor: playerColorHex[color] }}
          title={color}
        />
      ))}
    </div>
  );
}

export interface ReadyButtonProps {
  /** Current ready state */
  isReady: boolean;
  /** Toggle handler */
  onToggle: () => void;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Ready toggle button for players
 */
export function ReadyButton({
  isReady,
  onToggle,
  loading = false,
  className,
}: ReadyButtonProps) {
  return (
    <Button
      variant={isReady ? 'success' : 'primary'}
      size="lg"
      onClick={onToggle}
      disabled={loading}
      className={cn(
        'min-w-[120px]',
        isReady && 'animate-pulse',
        className
      )}
    >
      {loading ? 'UPDATING...' : isReady ? 'READY!' : 'READY UP'}
    </Button>
  );
}
