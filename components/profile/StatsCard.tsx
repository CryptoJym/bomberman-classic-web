'use client';

import { cn } from '@/lib/utils/cn';
import { Progress } from '@/components/ui/Progress';

export interface PlayerStats {
  /** Total games played */
  gamesPlayed: number;
  /** Total wins */
  wins: number;
  /** Total losses */
  losses: number;
  /** Win rate percentage */
  winRate: number;
  /** Total kills */
  kills: number;
  /** Total deaths */
  deaths: number;
  /** Kill/Death ratio */
  kdRatio: number;
  /** Current ranking points */
  rankPoints: number;
  /** Current rank tier */
  rank: string;
  /** Current level */
  level: number;
  /** Experience points */
  experience: number;
  /** Experience needed for next level */
  experienceToNextLevel: number;
  /** Total playtime in hours */
  playtime: number;
  /** Bombs placed */
  bombsPlaced?: number;
  /** Powerups collected */
  powerupsCollected?: number;
  /** Win streak */
  winStreak?: number;
  /** Best win streak */
  bestWinStreak?: number;
}

export interface StatsCardProps {
  /** Player statistics */
  stats: PlayerStats;
  /** Card title */
  title?: string;
  /** Variant style */
  variant?: 'full' | 'compact' | 'minimal';
  /** Additional class names */
  className?: string;
}

/**
 * Player statistics display card
 */
export function StatsCard({
  stats,
  title = 'STATISTICS',
  variant = 'full',
  className,
}: StatsCardProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <StatItem label="W" value={stats.wins} color="text-bomber-green" />
        <StatItem label="L" value={stats.losses} color="text-bomber-red" />
        <StatItem label="K/D" value={stats.kdRatio.toFixed(2)} color="text-bomber-yellow" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-retro-navy/80 backdrop-blur-sm',
          'border-2 border-t-gray-600 border-l-gray-600 border-b-game-wall border-r-game-wall',
          'shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]',
          'p-3',
          className
        )}
      >
        <div className="grid grid-cols-4 gap-3 text-center">
          <StatItem label="GAMES" value={stats.gamesPlayed} />
          <StatItem label="WINS" value={stats.wins} color="text-bomber-green" />
          <StatItem label="WIN%" value={`${stats.winRate}%`} color="text-bomber-yellow" />
          <StatItem label="K/D" value={stats.kdRatio.toFixed(2)} color="text-bomber-blue" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-retro-navy/80 backdrop-blur-sm',
        'border-2 border-t-gray-600 border-l-gray-600 border-b-game-wall border-r-game-wall',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.4)]',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-game-wall/30 bg-retro-darker/50">
        <span className="font-pixel text-xs text-bomber-yellow uppercase">{title}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Level & Experience */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-sm text-white">Level {stats.level}</span>
            <span className="font-retro text-xs text-gray-400">
              {stats.experience} / {stats.experienceToNextLevel} XP
            </span>
          </div>
          <Progress
            value={(stats.experience / stats.experienceToNextLevel) * 100}
            variant="experience"
          />
        </div>

        {/* Rank */}
        <div className="flex items-center justify-between py-2 border-y border-game-wall/30">
          <span className="font-pixel text-xs text-gray-400">RANK</span>
          <div className="text-right">
            <span className="font-pixel text-sm text-accent-gold block">{stats.rank}</span>
            <span className="font-retro text-xs text-gray-500">{stats.rankPoints} RP</span>
          </div>
        </div>

        {/* Win/Loss Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatItem label="GAMES" value={stats.gamesPlayed} />
          <StatItem label="WINS" value={stats.wins} color="text-bomber-green" />
          <StatItem label="LOSSES" value={stats.losses} color="text-bomber-red" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatItem label="WIN RATE" value={`${stats.winRate}%`} color="text-bomber-yellow" />
          <StatItem label="KILLS" value={stats.kills} />
          <StatItem label="DEATHS" value={stats.deaths} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatItem label="K/D RATIO" value={stats.kdRatio.toFixed(2)} color="text-bomber-blue" />
          <StatItem label="PLAYTIME" value={`${stats.playtime}h`} />
          {stats.winStreak !== undefined && (
            <StatItem label="STREAK" value={stats.winStreak} color="text-bomber-green" />
          )}
        </div>

        {/* Additional Stats */}
        {(stats.bombsPlaced || stats.powerupsCollected) && (
          <>
            <div className="border-t border-game-wall/30 pt-4">
              <span className="font-pixel text-[10px] text-gray-500 uppercase block mb-3">
                Lifetime Stats
              </span>
              <div className="grid grid-cols-2 gap-4">
                {stats.bombsPlaced && (
                  <StatItem label="BOMBS" value={stats.bombsPlaced.toLocaleString()} icon="💣" />
                )}
                {stats.powerupsCollected && (
                  <StatItem label="POWERUPS" value={stats.powerupsCollected.toLocaleString()} icon="⭐" />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

function StatItem({ label, value, color = 'text-white', icon }: StatItemProps) {
  return (
    <div className="text-center">
      <span className="font-pixel text-[10px] text-gray-500 uppercase block">{label}</span>
      <div className={cn('font-pixel text-sm mt-0.5', color)}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </div>
    </div>
  );
}

export interface RankBadgeDisplayProps {
  /** Rank tier name */
  rank: string;
  /** Rank points */
  points: number;
  /** Progress to next rank (0-100) */
  progress?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

const rankConfig: Record<string, { color: string; icon: string }> = {
  Bronze: { color: '#CD7F32', icon: '🥉' },
  Silver: { color: '#C0C0C0', icon: '🥈' },
  Gold: { color: '#FFD700', icon: '🥇' },
  Platinum: { color: '#00CED1', icon: '💎' },
  Diamond: { color: '#B9F2FF', icon: '💠' },
  Master: { color: '#FF6B6B', icon: '🏆' },
  Grandmaster: { color: '#FFD700', icon: '👑' },
};

/**
 * Player rank badge display
 */
export function RankBadgeDisplay({
  rank,
  points,
  progress,
  size = 'md',
  className,
}: RankBadgeDisplayProps) {
  const config = (rankConfig[rank] ?? rankConfig.Bronze) as { color: string; icon: string };

  const sizeStyles = {
    sm: {
      container: 'p-2',
      icon: 'text-lg',
      rank: 'text-xs',
      points: 'text-[8px]',
    },
    md: {
      container: 'p-3',
      icon: 'text-2xl',
      rank: 'text-sm',
      points: 'text-[10px]',
    },
    lg: {
      container: 'p-4',
      icon: 'text-4xl',
      rank: 'text-lg',
      points: 'text-xs',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        'bg-retro-darker',
        'border-2',
        styles.container,
        className
      )}
      style={{
        borderColor: config.color,
        boxShadow: `0 0 10px ${config.color}40, inset 0 0 20px ${config.color}10`,
      }}
    >
      <span className={styles.icon}>{config.icon}</span>
      <span
        className={cn('font-pixel uppercase mt-1', styles.rank)}
        style={{ color: config.color }}
      >
        {rank}
      </span>
      <span className={cn('font-retro text-gray-400', styles.points)}>
        {points} RP
      </span>

      {progress !== undefined && (
        <div className="w-full mt-2">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface LeaderboardEntryProps {
  /** Rank position */
  position: number;
  /** Player name */
  name: string;
  /** Player avatar URL */
  avatarUrl?: string | null;
  /** Player score/points */
  score: number;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Single leaderboard entry row
 */
export function LeaderboardEntry({
  position,
  name,
  avatarUrl,
  score,
  isCurrentUser,
  className,
}: LeaderboardEntryProps) {
  const getPositionStyle = () => {
    if (position === 1) {
      return { bg: 'bg-accent-gold/20', text: 'text-accent-gold', icon: '🥇' };
    }
    if (position === 2) {
      return { bg: 'bg-gray-400/20', text: 'text-gray-300', icon: '🥈' };
    }
    if (position === 3) {
      return { bg: 'bg-amber-700/20', text: 'text-amber-500', icon: '🥉' };
    }
    return { bg: '', text: 'text-gray-500', icon: '' };
  };

  const posStyle = getPositionStyle();

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        'border-b border-game-wall/10 last:border-b-0',
        posStyle.bg,
        isCurrentUser && 'ring-1 ring-inset ring-accent-gold',
        className
      )}
    >
      <span className={cn('w-8 font-pixel text-sm text-center', posStyle.text)}>
        {posStyle.icon || `#${position}`}
      </span>

      <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-pixel text-xs text-gray-400">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <span
        className={cn(
          'flex-1 font-pixel text-xs uppercase truncate',
          isCurrentUser ? 'text-accent-gold' : 'text-white'
        )}
      >
        {name}
      </span>

      <span className="font-pixel text-sm text-bomber-yellow">
        {score.toLocaleString()}
      </span>
    </div>
  );
}
