'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useLobbyStore, useFilteredRooms, type LobbySortOption } from '@/lib/stores/lobbyStore';
import type { RoomListItem, GamePhase } from '@/types/game';

export interface RoomBrowserProps {
  /** Callback when a room is selected to join */
  onJoinRoom?: (roomCode: string) => void;
  /** Callback when create room is clicked */
  onCreateRoom?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Room browser component
 * Shows list of available rooms with filtering and sorting
 */
export function RoomBrowser({ onJoinRoom, onCreateRoom, className }: RoomBrowserProps) {
  const [searchInput, setSearchInput] = useState('');

  const isLoadingRooms = useLobbyStore((state) => state.isLoadingRooms);
  const roomsError = useLobbyStore((state) => state.roomsError);
  const filters = useLobbyStore((state) => state.filters);
  const setFilters = useLobbyStore((state) => state.setFilters);
  const sortBy = useLobbyStore((state) => state.sortBy);
  const setSortBy = useLobbyStore((state) => state.setSortBy);
  const sortDirection = useLobbyStore((state) => state.sortDirection);
  const toggleSortDirection = useLobbyStore((state) => state.toggleSortDirection);

  const filteredRooms = useFilteredRooms();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters({ search: value });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-2xl text-white uppercase">Game Rooms</h2>
        {onCreateRoom && (
          <Button variant="success" size="lg" onClick={onCreateRoom}>
            Create Room
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <Input
            label="Search"
            placeholder="Search by room code or host name..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            fullWidth
          />

          <div className="grid md:grid-cols-3 gap-4">
            {/* Sort by */}
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(value) => setSortBy(value as LobbySortOption)}
              options={[
                { value: 'created', label: 'Recently Created' },
                { value: 'players', label: 'Player Count' },
                { value: 'map', label: 'Map Name' },
              ]}
            />

            {/* Sort direction */}
            <div className="flex items-end">
              <Button
                variant="secondary"
                size="md"
                onClick={toggleSortDirection}
                fullWidth
                leftIcon={
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    {sortDirection === 'asc' ? (
                      <path d="M7 10l5-5 5 5H7z" />
                    ) : (
                      <path d="M7 14l5 5 5-5H7z" />
                    )}
                  </svg>
                }
              >
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>

          {/* Filter checkboxes */}
          <div className="grid md:grid-cols-3 gap-3">
            <Checkbox
              label="Hide Full Rooms"
              checked={filters.hideFullRooms}
              onChange={(e) => setFilters({ hideFullRooms: e.target.checked })}
            />
            <Checkbox
              label="Hide In Progress"
              checked={filters.hideInProgress}
              onChange={(e) => setFilters({ hideInProgress: e.target.checked })}
            />
            <Checkbox
              label="Hide Private"
              checked={filters.hidePrivate}
              onChange={(e) => setFilters({ hidePrivate: e.target.checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Available Rooms ({filteredRooms.length})
            </CardTitle>
            {isLoadingRooms && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardContent>
          {roomsError ? (
            <div className="text-center py-8">
              <p className="font-pixel text-sm text-bomber-red">{roomsError}</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-pixel text-sm text-gray-500 mb-4">
                No rooms found
              </p>
              {onCreateRoom && (
                <Button variant="primary" size="md" onClick={onCreateRoom}>
                  Create the First Room
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <RoomListItem
                  key={room.id}
                  room={room}
                  onJoin={onJoinRoom}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Individual room list item
 */
interface RoomListItemProps {
  room: RoomListItem;
  onJoin?: (roomCode: string) => void;
}

function RoomListItem({ room, onJoin }: RoomListItemProps) {
  const isFull = room.playerCount >= room.maxPlayers;
  const isWaiting = room.phase === 'waiting';

  const getPhaseInfo = (phase: GamePhase): { label: string; variant: 'default' | 'success' | 'warning' | 'danger' } => {
    switch (phase) {
      case 'waiting':
        return { label: 'Waiting', variant: 'success' };
      case 'starting':
        return { label: 'Starting', variant: 'warning' };
      case 'playing':
      case 'sudden_death':
        return { label: 'In Progress', variant: 'danger' };
      case 'round_end':
      case 'intermission':
        return { label: 'Between Rounds', variant: 'warning' };
      case 'finished':
        return { label: 'Finished', variant: 'default' };
      default:
        return { label: 'Unknown', variant: 'default' };
    }
  };

  const phaseInfo = getPhaseInfo(room.phase);

  return (
    <button
      type="button"
      onClick={() => onJoin && isWaiting && !isFull && onJoin(room.roomCode)}
      disabled={!isWaiting || isFull}
      className={cn(
        'w-full p-4 text-left',
        'bg-retro-darker/50 backdrop-blur-sm',
        'border-2 transition-all duration-150',
        'flex items-center justify-between gap-4',
        isWaiting && !isFull
          ? 'border-game-wall/30 hover:border-bomber-blue hover:bg-retro-darker cursor-pointer'
          : 'border-game-wall/20 opacity-60 cursor-not-allowed'
      )}
    >
      {/* Room info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Room code */}
          <span className="font-pixel text-lg text-white">
            {room.roomCode}
          </span>

          {/* Status badges */}
          <Badge variant={phaseInfo.variant} size="sm">
            {phaseInfo.label}
          </Badge>

          {room.isPrivate && (
            <Badge variant="warning" size="sm">
              Private
            </Badge>
          )}

          {isFull && (
            <Badge variant="danger" size="sm">
              Full
            </Badge>
          )}
        </div>

        {/* Host and map */}
        <div className="flex items-center gap-4 text-sm font-retro text-gray-400">
          <span>Host: {room.hostUsername}</span>
          <span>•</span>
          <span>Map: {room.mapName}</span>
        </div>
      </div>

      {/* Player count */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-2">
          {/* Player count indicator */}
          <div className="flex items-center gap-1">
            {Array.from({ length: room.maxPlayers }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-6',
                  i < room.playerCount
                    ? 'bg-bomber-green'
                    : 'bg-game-wall/30'
                )}
              />
            ))}
          </div>

          {/* Count text */}
          <span className="font-pixel text-sm text-white">
            {room.playerCount}/{room.maxPlayers}
          </span>
        </div>
      </div>

      {/* Join indicator */}
      {isWaiting && !isFull && (
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-bomber-blue"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Quick join component for finding and joining a room quickly
 */
export interface QuickJoinProps {
  /** Callback when quick join is triggered */
  onQuickJoin?: () => void;
  /** Whether quick join is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

export function QuickJoin({ onQuickJoin, isLoading, className }: QuickJoinProps) {
  return (
    <Card variant="glow" className={className}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <h3 className="font-pixel text-xl text-bomber-yellow uppercase">
            Quick Play
          </h3>
          <p className="font-retro text-sm text-gray-400">
            Jump into the first available room
          </p>
          <Button
            variant="success"
            size="lg"
            onClick={onQuickJoin}
            isLoading={isLoading}
            fullWidth
            className="animate-pulse"
          >
            Quick Join
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Room code entry for direct join
 */
export interface RoomCodeEntryProps {
  /** Callback when join is triggered */
  onJoinByCode?: (code: string) => void;
  /** Whether join is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

export function RoomCodeEntry({ onJoinByCode, isLoading, className }: RoomCodeEntryProps) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (roomCode.trim() && onJoinByCode) {
      onJoinByCode(roomCode.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Join by Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          label="Room Code"
          placeholder="Enter room code..."
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          fullWidth
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleJoin}
          disabled={!roomCode.trim() || isLoading}
          isLoading={isLoading}
          fullWidth
        >
          Join Room
        </Button>
      </CardContent>
    </Card>
  );
}
