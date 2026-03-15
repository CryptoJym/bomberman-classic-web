'use client';

import { cn } from '@/lib/utils/cn';
import { calculateRankProgress } from '@/lib/elo/ranks';
import { Progress } from '@/components/ui/Progress';
import { RankBadge } from './RankBadge';

export interface RankProgressProps {
  /** Current ELO rating */
  elo: number;
  /** Show detailed stats */
  detailed?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Progress bar showing advancement to next rank
 */
export function RankProgress({ elo, detailed = false, className }: RankProgressProps) {
  const { currentTier, nextTier, progress, eloToNext } = calculateRankProgress(elo);

  const progressPercent = Math.round(progress * 100);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Current and Next Rank Badges */}
      <div className="flex items-center justify-between">
        <RankBadge tier={currentTier} size="sm" showGlow />
        {nextTier ? (
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[8px] text-gray-400 uppercase">Next:</span>
            <RankBadge tier={nextTier} size="sm" />
          </div>
        ) : (
          <span className="font-pixel text-[8px] text-accent-gold uppercase">Max Rank!</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress value={progressPercent} variant="experience" />

        {/* Progress Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-pixel text-[8px] text-white drop-shadow-pixel">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Detailed Stats */}
      {detailed && nextTier && (
        <div className="flex items-center justify-between pt-1">
          <div className="text-left">
            <div className="font-pixel text-[8px] text-gray-400">Current ELO</div>
            <div className="font-pixel text-xs text-white">{elo}</div>
          </div>
          <div className="text-center">
            <div className="font-pixel text-[8px] text-bomber-yellow">To Next Rank</div>
            <div className="font-pixel text-xs text-bomber-yellow">{eloToNext} ELO</div>
          </div>
        </div>
      )}
    </div>
  );
}
