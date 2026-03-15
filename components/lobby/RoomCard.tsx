'use client';

import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';

export type RoomStatus = 'waiting' | 'starting' | 'in_progress' | 'full';

export interface RoomPlayer {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface RoomCardProps {
  /** Room ID */
  id: string;
  /** Room name */
  name: string;
  /** Host name */
  hostName: string;
  /** Current player count */
  playerCount: number;
  /** Maximum players */
  maxPlayers: number;
  /** Players in room (for avatars) */
  players?: RoomPlayer[];
  /** Room status */
  status?: RoomStatus;
  /** Map name */
  mapName?: string;
  /** Game mode */
  gameMode?: string;
  /** Whether room is private */
  isPrivate?: boolean;
  /** Whether room is ranked */
  isRanked?: boolean;
  /** Join button click handler */
  onJoin?: () => void;
  /** Spectate button click handler */
  onSpectate?: () => void;
  /** Card click handler */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Room preview card for lobby browser
 */
export function RoomCard({
  id,
  name,
  hostName,
  playerCount,
  maxPlayers,
  players = [],
  status = 'waiting',
  mapName = 'Classic',
  gameMode = 'Battle',
  isPrivate = false,
  isRanked = false,
  onJoin,
  onSpectate,
  onClick,
  className,
}: RoomCardProps) {
  const statusConfig: Record<RoomStatus, { text: string; color: 'success' | 'warning' | 'info' | 'secondary' }> = {
    waiting: { text: 'WAITING', color: 'success' },
    starting: { text: 'STARTING', color: 'warning' },
    in_progress: { text: 'IN GAME', color: 'info' },
    full: { text: 'FULL', color: 'secondary' },
  };

  const statusInfo = statusConfig[status];
  const canJoin = status === 'waiting' && playerCount < maxPlayers;
  const canSpectate = status === 'in_progress';

  return (
    <div
      className={cn(
        'relative',
        'bg-retro-navy/90 backdrop-blur-sm',
        'border-2 border-t-gray-600 border-l-gray-600 border-b-game-wall border-r-game-wall',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        'p-4',
        onClick && 'cursor-pointer hover:bg-retro-navy transition-colors',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-pixel text-sm text-white truncate">{name}</h3>
            {isPrivate && (
              <span className="text-bomber-yellow text-xs" title="Private Room">
                🔒
              </span>
            )}
            {isRanked && (
              <Badge variant="warning" size="sm">
                RANKED
              </Badge>
            )}
          </div>
          <p className="font-retro text-[10px] text-gray-400 mt-0.5">
            Host: {hostName}
          </p>
        </div>

        <Badge variant={statusInfo.color} size="sm" glow={status === 'waiting'}>
          {statusInfo.text}
        </Badge>
      </div>

      {/* Room info */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">MAP:</span>
          <span className="font-pixel text-bomber-blue">{mapName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">MODE:</span>
          <span className="font-pixel text-bomber-green">{gameMode}</span>
        </div>
      </div>

      {/* Players section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {players.length > 0 ? (
            <AvatarGroup max={4}>
              {players.map((player) => (
                <Avatar
                  key={player.id}
                  src={player.avatarUrl}
                  alt={player.name}
                  size="sm"
                />
              ))}
            </AvatarGroup>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-lg">👥</span>
            </div>
          )}
          <span
            className={cn(
              'font-pixel text-xs',
              playerCount >= maxPlayers ? 'text-bomber-red' : 'text-white'
            )}
          >
            {playerCount}/{maxPlayers}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canSpectate && onSpectate && (
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onSpectate(); }}>
              WATCH
            </Button>
          )}
          {canJoin && onJoin && (
            <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onJoin(); }}>
              JOIN
            </Button>
          )}
          {status === 'full' && !canSpectate && (
            <span className="font-pixel text-[10px] text-gray-500">ROOM FULL</span>
          )}
        </div>
      </div>

      {/* Room ID */}
      <div className="absolute top-1 right-1">
        <span className="font-retro text-[8px] text-gray-600">#{id.slice(-4)}</span>
      </div>
    </div>
  );
}

export interface RoomCardSkeletonProps {
  className?: string;
}

/**
 * Loading skeleton for room card
 */
export function RoomCardSkeleton({ className }: RoomCardSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-retro-navy/60',
        'border-2 border-game-wall/30',
        'p-4',
        'animate-pulse',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-700/50 rounded mt-1" />
        </div>
        <div className="h-5 w-16 bg-gray-700 rounded" />
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="h-3 w-16 bg-gray-700/50 rounded" />
        <div className="h-3 w-16 bg-gray-700/50 rounded" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-6 h-6 bg-gray-700 rounded-full" />
            ))}
          </div>
          <div className="h-3 w-8 bg-gray-700/50 rounded" />
        </div>
        <div className="h-7 w-16 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export interface RoomListProps {
  /** List of rooms */
  rooms: RoomCardProps[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Grid columns */
  columns?: 1 | 2 | 3;
  /** Additional class names */
  className?: string;
}

/**
 * Grid list of room cards
 */
export function RoomList({
  rooms,
  loading = false,
  emptyMessage = 'No rooms available',
  columns = 2,
  className,
}: RoomListProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  if (loading) {
    return (
      <div className={cn('grid gap-4', gridCols[columns], className)}>
        {[...Array(6)].map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12',
          'bg-retro-darker/50 border-2 border-dashed border-game-wall/30',
          className
        )}
      >
        <span className="text-4xl mb-3">🎮</span>
        <span className="font-pixel text-sm text-gray-500">{emptyMessage}</span>
        <span className="font-retro text-xs text-gray-600 mt-1">
          Create a room to start playing!
        </span>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {rooms.map((room) => (
        <RoomCard key={room.id} {...room} />
      ))}
    </div>
  );
}
