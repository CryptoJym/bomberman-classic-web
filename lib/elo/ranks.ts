/**
 * ELO Rank System
 * Defines rank tiers, thresholds, and utility functions
 */

import type { RankTier } from '@/types/api';

/**
 * ELO thresholds for each rank tier
 */
export const RANK_THRESHOLDS: Record<RankTier, { min: number; max: number }> = {
  bronze: { min: 0, max: 1099 },
  silver: { min: 1100, max: 1299 },
  gold: { min: 1300, max: 1499 },
  platinum: { min: 1500, max: 1699 },
  diamond: { min: 1700, max: 1899 },
  master: { min: 1900, max: 2099 },
  grandmaster: { min: 2100, max: Infinity },
};

/**
 * Default starting ELO for new players
 */
export const DEFAULT_ELO = 1000;

/**
 * Rank tier metadata
 */
export interface RankTierInfo {
  tier: RankTier;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: string;
  description: string;
}

/**
 * Detailed information for each rank tier
 */
export const RANK_INFO: Record<RankTier, RankTierInfo> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    color: 'text-accent-bronze',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-accent-bronze',
    glowColor: 'shadow-[0_0_10px_rgba(205,127,50,0.5)]',
    icon: '🥉',
    description: 'Beginner rank for new players',
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    color: 'text-accent-silver',
    bgColor: 'bg-gray-400/30',
    borderColor: 'border-accent-silver',
    glowColor: 'shadow-[0_0_10px_rgba(192,192,192,0.5)]',
    icon: '🥈',
    description: 'Learning the ropes',
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    color: 'text-accent-gold',
    bgColor: 'bg-yellow-600/30',
    borderColor: 'border-accent-gold',
    glowColor: 'shadow-[0_0_10px_rgba(255,215,0,0.5)]',
    icon: '🥇',
    description: 'Skilled player',
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    color: 'text-bomber-cyan',
    bgColor: 'bg-cyan-600/30',
    borderColor: 'border-bomber-cyan',
    glowColor: 'shadow-[0_0_12px_rgba(70,240,240,0.5)]',
    icon: '💎',
    description: 'Expert player',
  },
  diamond: {
    tier: 'diamond',
    name: 'Diamond',
    color: 'text-bomber-blue',
    bgColor: 'bg-blue-600/30',
    borderColor: 'border-bomber-blue',
    glowColor: 'shadow-[0_0_12px_rgba(0,130,200,0.5)]',
    icon: '💠',
    description: 'Master tactician',
  },
  master: {
    tier: 'master',
    name: 'Master',
    color: 'text-bomber-purple',
    bgColor: 'bg-purple-600/30',
    borderColor: 'border-bomber-purple',
    glowColor: 'shadow-[0_0_15px_rgba(145,30,180,0.6)]',
    icon: '👑',
    description: 'Elite player',
  },
  grandmaster: {
    tier: 'grandmaster',
    name: 'Grandmaster',
    color: 'text-accent-gold',
    bgColor: 'bg-gradient-to-r from-accent-gold/20 via-bomber-orange/20 to-bomber-red/20',
    borderColor: 'border-accent-gold',
    glowColor: 'shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-glow',
    icon: '⚡',
    description: 'Legendary champion',
  },
};

/**
 * Get rank tier from ELO rating
 */
export function getRankFromElo(elo: number): RankTier {
  for (const [tier, { min, max }] of Object.entries(RANK_THRESHOLDS)) {
    if (elo >= min && elo <= max) {
      return tier as RankTier;
    }
  }
  return 'bronze'; // Fallback
}

/**
 * Get rank info from ELO rating
 */
export function getRankInfoFromElo(elo: number): RankTierInfo {
  const tier = getRankFromElo(elo);
  return RANK_INFO[tier];
}

/**
 * Calculate progress to next rank (0-1)
 */
export function calculateRankProgress(elo: number): {
  currentTier: RankTier;
  nextTier: RankTier | null;
  progress: number;
  eloToNext: number;
} {
  const currentTier = getRankFromElo(elo);
  const currentThresholds = RANK_THRESHOLDS[currentTier];

  // Find next tier
  const tiers: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
  const currentIndex = tiers.indexOf(currentTier);
  const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

  if (!nextTier) {
    // Already at max rank
    return {
      currentTier,
      nextTier: null,
      progress: 1,
      eloToNext: 0,
    };
  }

  const nextThresholds = RANK_THRESHOLDS[nextTier];
  const rangeSize = currentThresholds.max - currentThresholds.min;
  const progress = Math.max(0, Math.min(1, (elo - currentThresholds.min) / rangeSize));
  const eloToNext = nextThresholds.min - elo;

  return {
    currentTier,
    nextTier,
    progress,
    eloToNext: Math.max(0, eloToNext),
  };
}

/**
 * Get all rank tiers in order
 */
export function getAllRanks(): RankTier[] {
  return ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
}

/**
 * Get rank index (0-based)
 */
export function getRankIndex(tier: RankTier): number {
  return getAllRanks().indexOf(tier);
}

/**
 * Compare two ranks (returns -1, 0, or 1)
 */
export function compareRanks(a: RankTier, b: RankTier): number {
  const indexA = getRankIndex(a);
  const indexB = getRankIndex(b);
  return indexA - indexB;
}
