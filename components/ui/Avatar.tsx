'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Fallback text (usually initials) */
  fallback?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Player color for border */
  playerColor?: 'white' | 'black' | 'red' | 'blue' | 'green' | 'yellow' | 'pink' | 'cyan';
  /** Online status indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Whether to show a ring/border */
  ring?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Player avatar component with pixel-art styling
 */
export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  playerColor,
  status,
  ring = false,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showFallback = !src || imageError;

  const sizeStyles = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const statusSizeStyles = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const playerColorStyles = {
    white: 'border-bomber-white',
    black: 'border-bomber-black',
    red: 'border-bomber-red',
    blue: 'border-bomber-blue',
    green: 'border-bomber-green',
    yellow: 'border-bomber-yellow',
    pink: 'border-bomber-pink',
    cyan: 'border-bomber-cyan',
  };

  const statusColorStyles = {
    online: 'bg-bomber-green',
    offline: 'bg-gray-500',
    away: 'bg-bomber-yellow',
    busy: 'bg-bomber-red',
  };

  // Generate fallback initials from alt text
  const getInitials = () => {
    if (fallback) {
      return fallback.slice(0, 2).toUpperCase();
    }
    if (alt) {
      const words = alt.split(' ').filter(Boolean);
      if (words.length >= 2 && words[0]?.[0] && words[1]?.[0]) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return alt.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'relative overflow-hidden',
          sizeStyles[size],
          // Pixel-art border
          'border-2',
          playerColor ? playerColorStyles[playerColor] : 'border-game-wall',
          ring && 'ring-2 ring-offset-2 ring-offset-retro-dark',
          playerColor && ring ? `ring-${playerColor}` : ring && 'ring-game-wall',
          // Shadow
          'shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]'
        )}
      >
        {!showFallback ? (
          <img
            src={src!}
            alt={alt}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center',
              'bg-gradient-to-br from-game-wall to-retro-navy',
              'font-pixel text-white'
            )}
          >
            {getInitials()}
          </div>
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0',
            'border-2 border-retro-dark',
            statusSizeStyles[size],
            statusColorStyles[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export interface AvatarGroupProps {
  /** Avatar items */
  children: React.ReactNode;
  /** Maximum number of avatars to show */
  max?: number;
  /** Size for all avatars */
  size?: AvatarProps['size'];
  /** Additional class names */
  className?: string;
}

/**
 * Group of overlapping avatars
 */
export function AvatarGroup({ children, max = 4, size = 'md', className }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  const spacingStyles = {
    xs: '-space-x-2',
    sm: '-space-x-3',
    md: '-space-x-4',
    lg: '-space-x-5',
    xl: '-space-x-6',
  };

  return (
    <div className={cn('flex items-center', spacingStyles[size], className)}>
      {visibleAvatars}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          fallback={`+${remainingCount}`}
          className="relative z-10"
        />
      )}
    </div>
  );
}
