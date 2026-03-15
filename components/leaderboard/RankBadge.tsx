'use client';

import { cn } from '@/lib/utils/cn';
import { RANK_INFO } from '@/lib/elo/ranks';
import type { RankTier } from '@/types/api';

export interface RankBadgeProps {
  /** Rank tier */
  tier: RankTier;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show rank name */
  showName?: boolean;
  /** Show glow effect */
  showGlow?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Rank tier badge with icon
 */
export function RankBadge({
  tier,
  size = 'md',
  showName = true,
  showGlow = false,
  className,
}: RankBadgeProps) {
  const rankInfo = RANK_INFO[tier];

  const sizeStyles = {
    sm: {
      container: 'px-2 py-1 gap-1',
      icon: 'text-sm',
      text: 'text-[8px]',
    },
    md: {
      container: 'px-3 py-1.5 gap-1.5',
      icon: 'text-lg',
      text: 'text-[10px]',
    },
    lg: {
      container: 'px-4 py-2 gap-2',
      icon: 'text-xl',
      text: 'text-xs',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'inline-flex items-center',
        'font-pixel uppercase tracking-wider',
        'border-2',
        styles.container,
        rankInfo.color,
        rankInfo.bgColor,
        rankInfo.borderColor,
        showGlow && rankInfo.glowColor,
        'shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]',
        className
      )}
      title={rankInfo.description}
    >
      <span className={cn('flex-shrink-0', styles.icon)}>{rankInfo.icon}</span>
      {showName && <span className={styles.text}>{rankInfo.name}</span>}
    </div>
  );
}
