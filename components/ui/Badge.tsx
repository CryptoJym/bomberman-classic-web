'use client';

import { cn } from '@/lib/utils/cn';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a glow effect */
  glow?: boolean;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Pixel-art badge component for labels, status indicators, and achievements
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  glow = false,
  interactive = false,
  className,
}: BadgeProps) {
  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[8px]',
    md: 'px-2 py-1 text-[10px]',
    lg: 'px-3 py-1.5 text-xs',
  };

  const variantStyles = {
    default: cn(
      'bg-game-wall/50 text-gray-300',
      'border-game-wall'
    ),
    primary: cn(
      'bg-bomber-blue/20 text-bomber-blue',
      'border-bomber-blue'
    ),
    secondary: cn(
      'bg-gray-700/50 text-gray-300',
      'border-gray-600'
    ),
    success: cn(
      'bg-bomber-green/20 text-bomber-green',
      'border-bomber-green'
    ),
    warning: cn(
      'bg-bomber-yellow/20 text-bomber-yellow',
      'border-bomber-yellow'
    ),
    danger: cn(
      'bg-bomber-red/20 text-bomber-red',
      'border-bomber-red'
    ),
    info: cn(
      'bg-bomber-cyan/20 text-bomber-cyan',
      'border-bomber-cyan'
    ),
  };

  const glowStyles = {
    default: '',
    primary: 'shadow-[0_0_8px_rgba(0,130,200,0.5)]',
    secondary: '',
    success: 'shadow-[0_0_8px_rgba(60,180,75,0.5)]',
    warning: 'shadow-[0_0_8px_rgba(255,225,25,0.5)]',
    danger: 'shadow-[0_0_8px_rgba(230,25,75,0.5)]',
    info: 'shadow-[0_0_8px_rgba(70,240,240,0.5)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'font-pixel uppercase tracking-wider',
        'border',
        sizeStyles[size],
        variantStyles[variant],
        glow && glowStyles[variant],
        interactive && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface RankBadgeProps {
  /** Player rank (1-10 or higher) */
  rank: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show rank number */
  showNumber?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Rank badge with color-coded tiers
 */
export function RankBadge({ rank, size = 'md', showNumber = true, className }: RankBadgeProps) {
  // Determine tier based on rank
  const getTier = (r: number) => {
    if (r <= 0) {
      return { name: 'Unranked', color: 'gray', icon: '?' };
    }
    if (r <= 5) {
      return { name: 'Bronze', color: 'bronze', icon: '★' };
    }
    if (r <= 10) {
      return { name: 'Silver', color: 'silver', icon: '★★' };
    }
    if (r <= 20) {
      return { name: 'Gold', color: 'gold', icon: '★★★' };
    }
    if (r <= 50) {
      return { name: 'Platinum', color: 'platinum', icon: '◆' };
    }
    if (r <= 100) {
      return { name: 'Diamond', color: 'diamond', icon: '◆◆' };
    }
    return { name: 'Master', color: 'master', icon: '♛' };
  };

  const tier = getTier(rank);

  const colorStyles = {
    gray: 'bg-gray-600/30 text-gray-400 border-gray-500',
    bronze: 'bg-amber-900/30 text-accent-bronze border-accent-bronze',
    silver: 'bg-gray-400/30 text-accent-silver border-accent-silver',
    gold: 'bg-yellow-600/30 text-accent-gold border-accent-gold',
    platinum: 'bg-cyan-600/30 text-bomber-cyan border-bomber-cyan',
    diamond: 'bg-blue-600/30 text-bomber-blue border-bomber-blue',
    master: 'bg-purple-600/30 text-bomber-purple border-bomber-purple',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[8px]',
    md: 'px-3 py-1 text-[10px]',
    lg: 'px-4 py-1.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'font-pixel uppercase tracking-wider',
        'border-2',
        sizeStyles[size],
        colorStyles[tier.color as keyof typeof colorStyles],
        'shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]',
        className
      )}
    >
      <span>{tier.icon}</span>
      {showNumber && <span>#{rank}</span>}
    </span>
  );
}

export interface AchievementBadgeProps {
  /** Achievement name */
  name: string;
  /** Achievement icon (emoji or component) */
  icon: React.ReactNode;
  /** Achievement rarity */
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  /** Whether the achievement is unlocked */
  unlocked?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * Achievement badge with rarity-based styling
 */
export function AchievementBadge({
  name,
  icon,
  rarity = 'common',
  unlocked = true,
  size = 'md',
  className,
}: AchievementBadgeProps) {
  const rarityStyles = {
    common: {
      bg: 'bg-gray-600/30',
      border: 'border-gray-500',
      text: 'text-gray-300',
      glow: '',
    },
    rare: {
      bg: 'bg-bomber-blue/20',
      border: 'border-bomber-blue',
      text: 'text-bomber-blue',
      glow: 'shadow-[0_0_10px_rgba(0,130,200,0.4)]',
    },
    epic: {
      bg: 'bg-bomber-purple/20',
      border: 'border-bomber-purple',
      text: 'text-bomber-purple',
      glow: 'shadow-[0_0_12px_rgba(145,30,180,0.5)]',
    },
    legendary: {
      bg: 'bg-gradient-to-r from-bomber-yellow/20 via-bomber-orange/20 to-bomber-red/20',
      border: 'border-accent-gold',
      text: 'text-accent-gold',
      glow: 'shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-glow',
    },
  };

  const sizeStyles = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  const config = rarityStyles[rarity];

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1',
        !unlocked && 'opacity-40 grayscale',
        className
      )}
      title={name}
    >
      <div
        className={cn(
          'flex items-center justify-center',
          'border-2',
          sizeStyles[size],
          config.bg,
          config.border,
          unlocked && config.glow
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          'font-pixel text-[8px] uppercase text-center max-w-full truncate',
          config.text
        )}
      >
        {name}
      </span>
    </div>
  );
}
