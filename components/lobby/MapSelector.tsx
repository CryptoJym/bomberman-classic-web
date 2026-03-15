'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GameMap } from '@/types/game';

export interface MapSelectorProps {
  /** Available maps */
  maps: GameMap[];
  /** Currently selected map ID */
  selectedMapId: string | null;
  /** Callback when map is selected */
  onSelectMap: (mapId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether to show detailed view */
  detailed?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Map selector component
 * Displays available maps with previews and information
 */
export function MapSelector({
  maps,
  selectedMapId,
  onSelectMap,
  disabled = false,
  detailed = true,
  className,
}: MapSelectorProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (maps.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <div className="text-center py-8">
          <p className="font-pixel text-sm text-gray-500">No maps available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* View mode toggle */}
      {detailed && (
        <div className="flex items-center justify-between">
          <span className="font-pixel text-xs text-gray-400 uppercase">
            {maps.length} {maps.length === 1 ? 'Map' : 'Maps'} Available
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1.5 font-pixel text-[10px] uppercase',
                'border border-game-wall/50',
                'transition-colors duration-150',
                viewMode === 'grid'
                  ? 'bg-bomber-blue/30 text-bomber-blue border-bomber-blue'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 font-pixel text-[10px] uppercase',
                'border border-game-wall/50',
                'transition-colors duration-150',
                viewMode === 'list'
                  ? 'bg-bomber-blue/30 text-bomber-blue border-bomber-blue'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              List
            </button>
          </div>
        </div>
      )}

      {/* Maps display */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'space-y-2'
        )}
      >
        {maps.map((map) => (
          <MapCard
            key={map.id}
            map={map}
            isSelected={map.id === selectedMapId}
            onSelect={() => !disabled && onSelectMap(map.id)}
            disabled={disabled}
            compact={viewMode === 'list'}
            detailed={detailed}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual map card
 */
interface MapCardProps {
  map: GameMap;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  compact?: boolean;
  detailed?: boolean;
}

function MapCard({ map, isSelected, onSelect, disabled, compact, detailed }: MapCardProps) {
  if (compact) {
    // Compact list view
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-3 p-3',
          'bg-retro-darker/50 backdrop-blur-sm',
          'border-2 transition-all duration-150',
          isSelected
            ? 'border-bomber-blue bg-bomber-blue/10 shadow-[0_0_12px_rgba(0,130,200,0.4)]'
            : 'border-game-wall/30 hover:border-game-wall/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Thumbnail */}
        <div
          className={cn(
            'flex-shrink-0 w-16 h-16',
            'bg-retro-dark border border-game-wall/50',
            'flex items-center justify-center'
          )}
        >
          {map.thumbnailUrl ? (
            <img
              src={map.thumbnailUrl}
              alt={map.name}
              className="w-full h-full object-cover pixelated"
            />
          ) : (
            <span className="font-pixel text-xs text-gray-600">MAP</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-sm text-white truncate">{map.name}</span>
            {map.isOfficial && (
              <Badge variant="success" size="sm">
                Official
              </Badge>
            )}
          </div>
          <p className="mt-0.5 font-retro text-xs text-gray-500 truncate">
            {map.width}x{map.height} • {map.maxPlayers} players
          </p>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-bomber-blue"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        )}
      </button>
    );
  }

  // Full card view
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'group w-full text-left',
        'bg-retro-darker/50 backdrop-blur-sm',
        'border-2 transition-all duration-150',
        isSelected
          ? 'border-bomber-blue shadow-[0_0_16px_rgba(0,130,200,0.5)]'
          : 'border-game-wall/30 hover:border-game-wall/50 hover:shadow-[0_0_8px_rgba(255,255,255,0.1)]',
        !isSelected && !disabled && 'hover:translate-y-[-2px]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-retro-dark border-b-2 border-game-wall/30 overflow-hidden">
        {map.thumbnailUrl ? (
          <img
            src={map.thumbnailUrl}
            alt={map.name}
            className="w-full h-full object-cover pixelated"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-pixel text-2xl text-gray-700">MAP</span>
          </div>
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-bomber-blue/20 flex items-center justify-center">
            <div className="bg-bomber-blue border-2 border-white p-2 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-pixel text-sm text-white truncate">{map.name}</h4>
          {map.isOfficial && (
            <Badge variant="success" size="sm">
              Official
            </Badge>
          )}
        </div>

        {detailed && map.description && (
          <p className="font-retro text-xs text-gray-400 line-clamp-2">
            {map.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[10px] font-retro text-gray-500">
          <span>{map.width}x{map.height}</span>
          <span>•</span>
          <span>
            {map.maxPlayers} {map.maxPlayers === 1 ? 'player' : 'players'}
          </span>
          {map.playCount > 0 && (
            <>
              <span>•</span>
              <span>{map.playCount.toLocaleString()} plays</span>
            </>
          )}
        </div>

        {!map.isOfficial && map.creatorUsername && (
          <p className="text-[10px] font-retro text-gray-600">
            by {map.creatorUsername}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * Simple map preview badge for current selection display
 */
export interface MapPreviewBadgeProps {
  map: GameMap | null;
  onChangeClick?: () => void;
  showChangeButton?: boolean;
  className?: string;
}

export function MapPreviewBadge({
  map,
  onChangeClick,
  showChangeButton = true,
  className,
}: MapPreviewBadgeProps) {
  if (!map) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-retro-darker/50 border border-game-wall/30', className)}>
        <span className="font-pixel text-xs text-gray-600 uppercase">No map selected</span>
        {showChangeButton && onChangeClick && (
          <Button size="sm" variant="secondary" onClick={onChangeClick}>
            Select Map
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-retro-darker/50 border border-bomber-blue/30', className)}>
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 bg-retro-dark border border-game-wall/50 overflow-hidden">
        {map.thumbnailUrl ? (
          <img src={map.thumbnailUrl} alt={map.name} className="w-full h-full object-cover pixelated" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-pixel text-[10px] text-gray-700">MAP</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-sm text-white truncate">{map.name}</span>
          {map.isOfficial && (
            <Badge variant="success" size="sm">
              Official
            </Badge>
          )}
        </div>
        <p className="mt-0.5 font-retro text-xs text-gray-500">
          {map.width}x{map.height} • {map.maxPlayers} players
        </p>
      </div>

      {/* Change button */}
      {showChangeButton && onChangeClick && (
        <Button size="sm" variant="secondary" onClick={onChangeClick}>
          Change
        </Button>
      )}
    </div>
  );
}
