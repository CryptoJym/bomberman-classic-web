/**
 * React Query hooks for Leaderboard data
 */

'use client';

import { useQuery, useInfiniteQuery, type UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getLeaderboard,
  getPlayerRank,
  getLeaderboardAroundPlayer,
  getTopPlayersByStat,
  getRankDistribution,
  getCountryLeaderboard,
  getRecentEloChanges,
} from '@/lib/supabase/queries/leaderboard';
import type { RankTier, LeaderboardEntry } from '@/lib/supabase/types';

// Query Keys
export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  lists: () => [...leaderboardKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...leaderboardKeys.lists(), filters] as const,
  global: (options?: Record<string, unknown>) => [...leaderboardKeys.lists(), 'global', options] as const,
  country: (country: string, options?: Record<string, unknown>) =>
    [...leaderboardKeys.lists(), 'country', country, options] as const,
  aroundPlayer: (playerId: string) => [...leaderboardKeys.lists(), 'around', playerId] as const,
  playerRank: (playerId: string) => [...leaderboardKeys.all, 'rank', playerId] as const,
  topByStat: (stat: string, options?: Record<string, unknown>) =>
    [...leaderboardKeys.lists(), 'topByStat', stat, options] as const,
  distribution: () => [...leaderboardKeys.all, 'distribution'] as const,
  recentChanges: (playerId: string) => [...leaderboardKeys.all, 'recentChanges', playerId] as const,
};

/**
 * Hook to get the global leaderboard
 */
export function useLeaderboard(
  options?: {
    limit?: number;
    offset?: number;
    rankTier?: RankTier;
    sortBy?: 'elo_rating' | 'total_wins' | 'total_kills' | 'win_rate';
  },
  queryOptions?: Omit<UseQueryOptions<{ entries: LeaderboardEntry[]; total: number }, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();
  const { limit = 50, offset = 0, rankTier, sortBy = 'elo_rating' } = options ?? {};

  return useQuery({
    queryKey: leaderboardKeys.global({ limit, offset, rankTier, sortBy }),
    queryFn: () => getLeaderboard(supabase, { limit, offset, rankTier, sortBy }),
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to get leaderboard with infinite scroll
 */
export function useInfiniteLeaderboard(options?: {
  pageSize?: number;
  rankTier?: RankTier;
  sortBy?: 'elo_rating' | 'total_wins' | 'total_kills' | 'win_rate';
}) {
  const supabase = createClient();
  const { pageSize = 50, rankTier, sortBy = 'elo_rating' } = options ?? {};

  return useInfiniteQuery({
    queryKey: leaderboardKeys.global({ pageSize, rankTier, sortBy, infinite: true }),
    queryFn: ({ pageParam = 0 }) =>
      getLeaderboard(supabase, {
        limit: pageSize,
        offset: pageParam,
        rankTier,
        sortBy,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.entries.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get a player's rank
 */
export function usePlayerRank(
  playerId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<{ globalRank: number; tierRank: number; percentile: number } | null, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: leaderboardKeys.playerRank(playerId ?? ''),
    queryFn: () => (playerId ? getPlayerRank(supabase, playerId) : null),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get leaderboard around a specific player
 */
export function useLeaderboardAroundPlayer(
  playerId: string | undefined,
  options?: {
    above?: number;
    below?: number;
    sortBy?: 'elo_rating' | 'total_wins' | 'total_kills';
  },
  queryOptions?: Omit<UseQueryOptions<{ entries: LeaderboardEntry[]; playerIndex: number } | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();
  const { above = 5, below = 5, sortBy } = options ?? {};

  return useQuery({
    queryKey: leaderboardKeys.aroundPlayer(playerId ?? ''),
    queryFn: () => (playerId ? getLeaderboardAroundPlayer(supabase, playerId, { above, below, sortBy }) : null),
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Type for stat-based leaderboard entries
 */
export type StatLeaderboardEntry = {
  player_id: string;
  username: string;
  avatar_url: string | null;
  value: number;
  rank: number;
};

/**
 * Hook to get top players by a specific stat
 */
export function useTopPlayersByStat(
  stat: 'kills' | 'wins' | 'games' | 'win_streak' | 'kd_ratio',
  options?: {
    limit?: number;
  },
  queryOptions?: Omit<UseQueryOptions<StatLeaderboardEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();
  const { limit = 10 } = options ?? {};

  return useQuery({
    queryKey: leaderboardKeys.topByStat(stat, { limit }),
    queryFn: () => getTopPlayersByStat(supabase, stat, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get rank distribution
 */
export function useRankDistribution(
  queryOptions?: Omit<
    UseQueryOptions<Record<RankTier, number>, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: leaderboardKeys.distribution(),
    queryFn: () => getRankDistribution(supabase),
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...queryOptions,
  });
}

/**
 * Type for country leaderboard entries
 */
export type CountryLeaderboardEntry = {
  country_code: string;
  player_count: number;
  total_elo: number;
  average_elo: number;
  top_player: {
    username: string;
    elo_rating: number;
  } | null;
};

/**
 * Hook to get country leaderboard
 */
export function useCountryLeaderboard(
  options?: {
    limit?: number;
    sortBy?: 'total_elo' | 'total_players' | 'avg_elo';
  },
  queryOptions?: Omit<UseQueryOptions<CountryLeaderboardEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();
  const { limit = 20, sortBy = 'avg_elo' } = options ?? {};

  return useQuery({
    queryKey: leaderboardKeys.country('all', { limit, sortBy }),
    queryFn: () => getCountryLeaderboard(supabase, { limit, sortBy }),
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Type for recent ELO change entries
 */
export type EloChangeEntry = {
  game_id: string;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  placement: number;
  played_at: string;
};

/**
 * Hook to get recent ELO changes for a player
 */
export function useRecentEloChanges(
  playerId: string | undefined,
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<EloChangeEntry[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: leaderboardKeys.recentChanges(playerId ?? ''),
    queryFn: () => (playerId ? getRecentEloChanges(supabase, playerId, limit) : []),
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}
