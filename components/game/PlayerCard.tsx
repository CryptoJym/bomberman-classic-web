'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export type PlayerColor = 'white' | 'black' | 'red' | 'blue' | 'green' | 'yellow' | 'pink' | 'cyan';
export type ReadyStatus = 'ready' | 'not_ready' | 'loading' | 'spectating';

export interface PlayerCardProps {
  /** Player display name */
  name: string;
  /** Player avatar URL */
  avatarUrl?: string | null;
  /** Player color */
  playerColor?: PlayerColor;
  /** Ready status */
  status?: ReadyStatus;
  /** Player score/rank */
  score?: number;
  /** Whether this is the host */
  isHost?: boolean;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** Whether to show kick button (host only) */
  showKickButton?: boolean;
  /** Kick button click handler */
  onKick?: () => void;
  /** Card click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * Player info card for game lobbies and scoreboards
 */
export function PlayerCard({
  name,
  avatarUrl,
  playerColor = 'white',
  status = 'not_ready',
  score,
  isHost,
  isCurrentUser,
  showKickButton,
  onKick,
  onClick,
  size = 'md',
  className,
}: PlayerCardProps) {
  const statusConfig = {
    ready: {
      text: 'READY',
      color: 'success' as const,
      glow: true,
    },
    not_ready: {
      text: 'WAITING',
      color: 'secondary' as const,
      glow: false,
    },
    loading: {
      text: 'LOADING...',
      color: 'warning' as const,
      glow: false,
    },
    spectating: {
      text: 'SPECTATING',
      color: 'info' as const,
      glow: false,
    },
  };

  const statusInfo = statusConfig[status];

  const sizeStyles = {
    sm: {
      container: 'p-2',
      avatar: 'sm' as const,
      name: 'text-xs',
      badge: 'sm' as const,
    },
    md: {
      container: 'p-3',
      avatar: 'md' as const,
      name: 'text-sm',
      badge: 'md' as const,
    },
    lg: {
      container: 'p-4',
      avatar: 'lg' as const,
      name: 'text-base',
      badge: 'lg' as const,
    },
  };

  const config = sizeStyles[size];

  const playerColorStyles: Record<PlayerColor, string> = {
    white: 'border-bomber-white/50 bg-bomber-white/5',
    black: 'border-bomber-black/50 bg-bomber-black/5',
    red: 'border-bomber-red/50 bg-bomber-red/5',
    blue: 'border-bomber-blue/50 bg-bomber-blue/5',
    green: 'border-bomber-green/50 bg-bomber-green/5',
    yellow: 'border-bomber-yellow/50 bg-bomber-yellow/5',
    pink: 'border-bomber-pink/50 bg-bomber-pink/5',
    cyan: 'border-bomber-cyan/50 bg-bomber-cyan/5',
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-3',
        'bg-retro-navy/80 backdrop-blur-sm',
        'border-2',
        playerColorStyles[playerColor],
        'shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]',
        config.container,
        onClick && 'cursor-pointer hover:bg-retro-navy transition-colors',
        isCurrentUser && 'ring-2 ring-accent-gold ring-offset-2 ring-offset-retro-dark',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar
        src={avatarUrl}
        alt={name}
        fallback={name.slice(0, 2)}
        size={config.avatar}
        playerColor={playerColor}
        status={status === 'ready' ? 'online' : status === 'spectating' ? 'away' : 'offline'}
      />

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-pixel uppercase truncate',
              config.name,
              isCurrentUser ? 'text-accent-gold' : 'text-white'
            )}
          >
            {name}
          </span>
          {isHost && (
            <Badge variant="warning" size="sm">
              HOST
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={statusInfo.color}
            size={config.badge}
            glow={statusInfo.glow}
          >
            {statusInfo.text}
          </Badge>

          {score !== undefined && (
            <span className="font-retro text-xs text-gray-400">
              Score: {score}
            </span>
          )}
        </div>
      </div>

      {/* Kick button */}
      {showKickButton && onKick && (
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onKick();
          }}
        >
          KICK
        </Button>
      )}

      {/* Player color indicator */}
      <div
        className={cn(
          'absolute top-0 right-0 w-3 h-3',
          `bg-bomber-${playerColor}`
        )}
        style={{
          backgroundColor: `var(--bomber-${playerColor}, currentColor)`,
        }}
      />
    </div>
  );
}

export interface EmptyPlayerSlotProps {
  /** Slot number */
  slotNumber?: number;
  /** Click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * Empty player slot placeholder
 */
export function EmptyPlayerSlot({
  slotNumber,
  onClick,
  size = 'md',
  className,
}: EmptyPlayerSlotProps) {
  const sizeStyles = {
    sm: 'p-2 min-h-[52px]',
    md: 'p-3 min-h-[68px]',
    lg: 'p-4 min-h-[84px]',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'bg-retro-darker/50',
        'border-2 border-dashed border-game-wall/30',
        sizeStyles[size],
        onClick && 'cursor-pointer hover:border-bomber-blue/50 hover:bg-retro-navy/30 transition-all',
        className
      )}
      onClick={onClick}
    >
      <div className="text-center">
        <span className="font-pixel text-xs text-gray-500">
          {slotNumber ? `SLOT ${slotNumber}` : 'EMPTY'}
        </span>
        {onClick && (
          <p className="font-retro text-[10px] text-gray-600 mt-1">
            Click to invite
          </p>
        )}
      </div>
    </div>
  );
}
