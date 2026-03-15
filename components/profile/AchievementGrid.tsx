'use client';

import { cn } from '@/lib/utils/cn';
import { Progress } from '@/components/ui/Progress';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  /** Achievement ID */
  id: string;
  /** Achievement name */
  name: string;
  /** Achievement description */
  description: string;
  /** Achievement icon/emoji */
  icon: string;
  /** Rarity tier */
  rarity: AchievementRarity;
  /** Whether unlocked */
  unlocked: boolean;
  /** Unlock date */
  unlockedAt?: Date;
  /** Progress (for achievements with progress) */
  progress?: number;
  /** Progress max value */
  progressMax?: number;
  /** Achievement category */
  category?: string;
  /** Reward description */
  reward?: string;
}

export interface AchievementGridProps {
  /** List of achievements */
  achievements: Achievement[];
  /** Filter by category */
  category?: string;
  /** Filter by unlocked status */
  showLocked?: boolean;
  /** Grid columns */
  columns?: 2 | 3 | 4 | 5;
  /** Click handler */
  onAchievementClick?: (achievement: Achievement) => void;
  /** Additional class names */
  className?: string;
}

const rarityConfig: Record<AchievementRarity, { color: string; borderColor: string; glow: string }> = {
  common: {
    color: '#9CA3AF',
    borderColor: '#4B5563',
    glow: 'none',
  },
  rare: {
    color: '#3B82F6',
    borderColor: '#2563EB',
    glow: '0 0 10px rgba(59, 130, 246, 0.3)',
  },
  epic: {
    color: '#A855F7',
    borderColor: '#9333EA',
    glow: '0 0 15px rgba(168, 85, 247, 0.4)',
  },
  legendary: {
    color: '#F59E0B',
    borderColor: '#D97706',
    glow: '0 0 20px rgba(245, 158, 11, 0.5)',
  },
};

/**
 * Achievement grid display
 */
export function AchievementGrid({
  achievements,
  category,
  showLocked = true,
  columns = 4,
  onAchievementClick,
  className,
}: AchievementGridProps) {
  const filteredAchievements = achievements.filter((a) => {
    if (category && a.category !== category) {
      return false;
    }
    if (!showLocked && !a.unlocked) {
      return false;
    }
    return true;
  });

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className={className}>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-pixel text-xs text-gray-400">
          {unlockedCount} / {totalCount} UNLOCKED
        </span>
        <span className="font-pixel text-xs text-bomber-yellow">
          {Math.round((unlockedCount / totalCount) * 100)}%
        </span>
      </div>

      <Progress
        value={(unlockedCount / totalCount) * 100}
        className="mb-4"
      />

      {/* Achievement grid */}
      <div className={cn('grid gap-3', gridCols[columns])}>
        {filteredAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            onClick={() => onAchievementClick?.(achievement)}
          />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8">
          <span className="text-3xl mb-2 block">🏆</span>
          <span className="font-pixel text-sm text-gray-500">No achievements found</span>
        </div>
      )}
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
}

function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const config = rarityConfig[achievement.rarity];
  const hasProgress = achievement.progress !== undefined && achievement.progressMax !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative p-3',
        'bg-retro-darker',
        'border-2 transition-all',
        'text-left',
        onClick && 'cursor-pointer hover:scale-105',
        !achievement.unlocked && 'opacity-50 grayscale'
      )}
      style={{
        borderColor: achievement.unlocked ? config.borderColor : '#374151',
        boxShadow: achievement.unlocked ? config.glow : 'none',
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-center mb-2">
        <span
          className={cn(
            'text-2xl',
            !achievement.unlocked && 'filter blur-[1px]'
          )}
        >
          {achievement.unlocked ? achievement.icon : '🔒'}
        </span>
      </div>

      {/* Name */}
      <span
        className="font-pixel text-[10px] block text-center truncate"
        style={{ color: achievement.unlocked ? config.color : '#6B7280' }}
      >
        {achievement.name}
      </span>

      {/* Progress bar */}
      {hasProgress && !achievement.unlocked && (
        <div className="mt-2">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-500"
              style={{
                width: `${(achievement.progress! / achievement.progressMax!) * 100}%`,
              }}
            />
          </div>
          <span className="font-retro text-[8px] text-gray-500 block text-center mt-0.5">
            {achievement.progress} / {achievement.progressMax}
          </span>
        </div>
      )}

      {/* Rarity indicator */}
      <div
        className="absolute top-1 right-1 w-2 h-2"
        style={{ backgroundColor: config.color }}
        title={achievement.rarity}
      />
    </button>
  );
}

export interface AchievementDetailProps {
  /** Achievement to display */
  achievement: Achievement;
  /** Close handler */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Achievement detail popup/modal content
 */
export function AchievementDetail({
  achievement,
  onClose,
  className,
}: AchievementDetailProps) {
  const config = rarityConfig[achievement.rarity];
  const hasProgress = achievement.progress !== undefined && achievement.progressMax !== undefined;

  return (
    <div
      className={cn(
        'bg-retro-navy/95 backdrop-blur-sm',
        'border-4',
        'shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]',
        'p-6',
        'max-w-sm',
        className
      )}
      style={{
        borderColor: config.borderColor,
        boxShadow: `6px 6px 0 0 rgba(0,0,0,0.5), ${config.glow}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{achievement.unlocked ? achievement.icon : '🔒'}</span>
          <div>
            <span
              className="font-pixel text-xs uppercase"
              style={{ color: config.color }}
            >
              {achievement.rarity}
            </span>
            <h3 className="font-pixel text-sm text-white">{achievement.name}</h3>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-pixel text-gray-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Description */}
      <p className="font-retro text-sm text-gray-300 mb-4">
        {achievement.description}
      </p>

      {/* Progress */}
      {hasProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[10px] text-gray-400">PROGRESS</span>
            <span className="font-pixel text-[10px] text-white">
              {achievement.progress} / {achievement.progressMax}
            </span>
          </div>
          <Progress
            value={(achievement.progress! / achievement.progressMax!) * 100}
          />
        </div>
      )}

      {/* Unlock status */}
      {achievement.unlocked ? (
        <div className="flex items-center gap-2 text-bomber-green">
          <span>✓</span>
          <span className="font-pixel text-xs">
            Unlocked {achievement.unlockedAt?.toLocaleDateString()}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <span>🔒</span>
          <span className="font-pixel text-xs">Not yet unlocked</span>
        </div>
      )}

      {/* Reward */}
      {achievement.reward && (
        <div className="mt-4 pt-4 border-t border-game-wall/30">
          <span className="font-pixel text-[10px] text-bomber-yellow">REWARD</span>
          <p className="font-retro text-xs text-gray-300 mt-1">{achievement.reward}</p>
        </div>
      )}
    </div>
  );
}

export interface AchievementNotificationProps {
  /** Achievement unlocked */
  achievement: Achievement;
  /** Whether visible */
  visible: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Achievement unlock notification toast
 */
export function AchievementNotification({
  achievement,
  visible,
  onClose,
  className,
}: AchievementNotificationProps) {
  const config = rarityConfig[achievement.rarity];

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        'bg-retro-navy/95 backdrop-blur-sm',
        'border-2',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        'animate-in slide-in-from-top-4 fade-in duration-300',
        className
      )}
      style={{
        borderColor: config.borderColor,
        boxShadow: `4px 4px 0 0 rgba(0,0,0,0.5), ${config.glow}`,
      }}
    >
      <span className="text-3xl">{achievement.icon}</span>

      <div className="flex-1">
        <span className="font-pixel text-xs text-bomber-yellow block">
          ACHIEVEMENT UNLOCKED!
        </span>
        <span className="font-pixel text-sm text-white">{achievement.name}</span>
        <span
          className="font-retro text-[10px] uppercase block mt-0.5"
          style={{ color: config.color }}
        >
          {achievement.rarity}
        </span>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="font-pixel text-gray-500 hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  );
}
