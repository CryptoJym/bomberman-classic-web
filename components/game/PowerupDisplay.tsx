'use client';

import { cn } from '@/lib/utils/cn';

export type PowerupType = 'bomb' | 'fire' | 'speed' | 'kick' | 'punch' | 'shield' | 'skull' | 'full_fire';

export interface PowerupItem {
  type: PowerupType;
  count: number;
  maxCount?: number;
}

export interface PowerupDisplayProps {
  /** List of current powerups */
  powerups: PowerupItem[];
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show labels */
  showLabels?: boolean;
  /** Additional class names */
  className?: string;
}

const powerupConfig: Record<PowerupType, { icon: string; label: string; color: string }> = {
  bomb: {
    icon: '💣',
    label: 'BOMBS',
    color: '#4488FF',
  },
  fire: {
    icon: '🔥',
    label: 'FIRE',
    color: '#FF8844',
  },
  speed: {
    icon: '⚡',
    label: 'SPEED',
    color: '#44FF44',
  },
  kick: {
    icon: '👟',
    label: 'KICK',
    color: '#FFFF44',
  },
  punch: {
    icon: '👊',
    label: 'PUNCH',
    color: '#FF4444',
  },
  shield: {
    icon: '🛡️',
    label: 'SHIELD',
    color: '#FFFFFF',
  },
  skull: {
    icon: '💀',
    label: 'CURSED',
    color: '#8844FF',
  },
  full_fire: {
    icon: '🌟',
    label: 'MAX FIRE',
    color: '#FF0000',
  },
};

/**
 * Display component for current player powerups
 */
export function PowerupDisplay({
  powerups,
  direction = 'horizontal',
  size = 'md',
  showLabels = false,
  className,
}: PowerupDisplayProps) {
  const sizeStyles = {
    sm: {
      container: 'gap-1',
      icon: 'w-6 h-6 text-sm',
      count: 'text-[8px]',
      label: 'text-[6px]',
    },
    md: {
      container: 'gap-2',
      icon: 'w-8 h-8 text-base',
      count: 'text-xs',
      label: 'text-[8px]',
    },
    lg: {
      container: 'gap-3',
      icon: 'w-10 h-10 text-lg',
      count: 'text-sm',
      label: 'text-xs',
    },
  };

  const config = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        config.container,
        className
      )}
    >
      {powerups.map((powerup) => (
        <PowerupIcon
          key={powerup.type}
          powerup={powerup}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}

interface PowerupIconProps {
  powerup: PowerupItem;
  size: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function PowerupIcon({ powerup, size, showLabel }: PowerupIconProps) {
  const config = powerupConfig[powerup.type];

  const sizeStyles = {
    sm: {
      container: 'w-8 h-8',
      icon: 'text-sm',
      count: 'text-[8px] min-w-[14px]',
    },
    md: {
      container: 'w-10 h-10',
      icon: 'text-base',
      count: 'text-[10px] min-w-[16px]',
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'text-lg',
      count: 'text-xs min-w-[18px]',
    },
  };

  const sizes = sizeStyles[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative flex items-center justify-center',
          sizes.container,
          'bg-retro-darker',
          'border-2',
          'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]'
        )}
        style={{
          borderColor: `${config.color}80`,
          boxShadow: `2px 2px 0 0 rgba(0,0,0,0.4), inset 0 0 8px ${config.color}20`,
        }}
      >
        <span className={sizes.icon}>{config.icon}</span>

        {/* Count badge */}
        <span
          className={cn(
            'absolute -bottom-1 -right-1',
            'px-1 py-0.5',
            'font-pixel text-center',
            sizes.count,
            'bg-retro-navy border border-game-wall'
          )}
          style={{ color: config.color }}
        >
          {powerup.maxCount ? `${powerup.count}/${powerup.maxCount}` : powerup.count}
        </span>
      </div>

      {showLabel && (
        <span
          className="font-pixel text-[6px] mt-1 uppercase"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

export interface PowerupNotificationProps {
  /** Powerup type acquired */
  type: PowerupType;
  /** Whether the notification is visible */
  visible: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Powerup acquisition notification
 */
export function PowerupNotification({
  type,
  visible,
  className,
}: PowerupNotificationProps) {
  const config = powerupConfig[type];

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2',
        'bg-black/80 backdrop-blur-sm',
        'border-2',
        'animate-in slide-in-from-top-4 fade-in duration-300',
        className
      )}
      style={{
        borderColor: config.color,
        boxShadow: `0 0 20px ${config.color}40`,
      }}
    >
      <span className="text-xl">{config.icon}</span>
      <div className="flex flex-col">
        <span className="font-pixel text-xs text-white">POWERUP</span>
        <span
          className="font-pixel text-[10px]"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

export interface PowerupBarProps {
  /** Bomb count */
  bombs: number;
  /** Fire range */
  fire: number;
  /** Speed level */
  speed: number;
  /** Max bombs */
  maxBombs?: number;
  /** Max fire */
  maxFire?: number;
  /** Max speed */
  maxSpeed?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Compact powerup status bar for HUD
 */
export function PowerupBar({
  bombs,
  fire,
  speed,
  maxBombs = 8,
  maxFire = 8,
  maxSpeed = 5,
  className,
}: PowerupBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        'bg-black/60 backdrop-blur-sm',
        className
      )}
    >
      <PowerupStat icon="💣" value={bombs} max={maxBombs} color="#4488FF" />
      <PowerupStat icon="🔥" value={fire} max={maxFire} color="#FF8844" />
      <PowerupStat icon="⚡" value={speed} max={maxSpeed} color="#44FF44" />
    </div>
  );
}

interface PowerupStatProps {
  icon: string;
  value: number;
  max: number;
  color: string;
}

function PowerupStat({ icon, value, max, color }: PowerupStatProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{icon}</span>
      <div className="w-12 h-2 bg-gray-800 border border-gray-700">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
      <span className="font-pixel text-[8px] text-white w-3 text-right">
        {value}
      </span>
    </div>
  );
}
