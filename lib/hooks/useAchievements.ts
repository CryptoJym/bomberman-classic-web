/**
 * React Query hooks for Achievements data
 */

'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getAchievements,
  getAchievement,
  getAchievementByCode,
  getPlayerAchievements,
  getAchievementsWithProgress,
  unlockAchievement,
  updateAchievementProgress,
  checkPlayerAchievements,
  markAchievementsNotified,
  getUnnotifiedAchievements,
  getPlayerAchievementStats,
  getRecentGlobalUnlocks,
  getRarestAchievements,
} from '@/lib/supabase/queries/achievements';
import type {
  Achievement,
  PlayerAchievement,
  AchievementCategory,
  AchievementRarity,
  AchievementWithProgress,
} from '@/lib/supabase/types';

// Query Keys
export const achievementKeys = {
  all: ['achievements'] as const,
  lists: () => [...achievementKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...achievementKeys.lists(), filters] as const,
  details: () => [...achievementKeys.all, 'detail'] as const,
  detail: (id: string) => [...achievementKeys.details(), id] as const,
  byCode: (code: string) => [...achievementKeys.all, 'code', code] as const,
  playerAchievements: (playerId: string, filters?: Record<string, unknown>) =>
    [...achievementKeys.all, 'player', playerId, filters] as const,
  withProgress: (playerId: string, filters?: Record<string, unknown>) =>
    [...achievementKeys.all, 'progress', playerId, filters] as const,
  stats: (playerId: string) => [...achievementKeys.all, 'stats', playerId] as const,
  unnotified: (playerId: string) => [...achievementKeys.all, 'unnotified', playerId] as const,
  recentGlobal: (limit?: number) => [...achievementKeys.lists(), 'recentGlobal', limit] as const,
  rarest: (limit?: number) => [...achievementKeys.lists(), 'rarest', limit] as const,
};

/**
 * Hook to get all achievements
 */
export function useAchievements(
  options?: {
    category?: AchievementCategory;
    rarity?: AchievementRarity;
    includeHidden?: boolean;
    includeInactive?: boolean;
  },
  queryOptions?: Omit<UseQueryOptions<Achievement[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.list(options ?? {}),
    queryFn: () => getAchievements(supabase, options),
    staleTime: 1000 * 60 * 30, // 30 minutes (achievements don't change often)
    ...queryOptions,
  });
}

/**
 * Hook to get a single achievement by ID
 */
export function useAchievement(
  achievementId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<Achievement | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.detail(achievementId ?? ''),
    queryFn: () => (achievementId ? getAchievement(supabase, achievementId) : null),
    enabled: !!achievementId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get an achievement by code
 */
export function useAchievementByCode(
  code: string | undefined,
  queryOptions?: Omit<UseQueryOptions<Achievement | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.byCode(code ?? ''),
    queryFn: () => (code ? getAchievementByCode(supabase, code) : null),
    enabled: !!code,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get a player's achievements
 */
export function usePlayerAchievements(
  playerId: string | undefined,
  options?: {
    unlockedOnly?: boolean;
    category?: AchievementCategory;
  },
  queryOptions?: Omit<
    UseQueryOptions<(PlayerAchievement & { achievement: Achievement })[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.playerAchievements(playerId ?? '', options),
    queryFn: () => (playerId ? getPlayerAchievements(supabase, playerId, options) : []),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get achievements with player progress
 */
export function useAchievementsWithProgress(
  playerId: string | undefined,
  options?: {
    category?: AchievementCategory;
    includeHidden?: boolean;
  },
  queryOptions?: Omit<UseQueryOptions<AchievementWithProgress[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.withProgress(playerId ?? '', options),
    queryFn: () => (playerId ? getAchievementsWithProgress(supabase, playerId, options) : []),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get player achievement stats
 */
export function usePlayerAchievementStats(
  playerId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<
      {
        totalUnlocked: number;
        totalPoints: number;
        totalAchievements: number;
        byCategory: Record<AchievementCategory, { unlocked: number; total: number }>;
        byRarity: Record<AchievementRarity, { unlocked: number; total: number }>;
        completionPercentage: number;
      },
      Error
    >,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.stats(playerId ?? ''),
    queryFn: () =>
      playerId
        ? getPlayerAchievementStats(supabase, playerId)
        : {
            totalUnlocked: 0,
            totalPoints: 0,
            totalAchievements: 0,
            byCategory: {} as Record<AchievementCategory, { unlocked: number; total: number }>,
            byRarity: {} as Record<AchievementRarity, { unlocked: number; total: number }>,
            completionPercentage: 0,
          },
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get unnotified achievements
 */
export function useUnnotifiedAchievements(
  playerId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<(PlayerAchievement & { achievement: Achievement })[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.unnotified(playerId ?? ''),
    queryFn: () => (playerId ? getUnnotifiedAchievements(supabase, playerId) : []),
    enabled: !!playerId,
    staleTime: 1000 * 10, // 10 seconds (check frequently for new unlocks)
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
    ...queryOptions,
  });
}

/**
 * Hook to get recent global achievement unlocks
 */
export function useRecentGlobalUnlocks(
  limit: number = 20,
  queryOptions?: Omit<
    UseQueryOptions<
      Array<{
        player_id: string;
        username: string;
        avatar_url: string | null;
        achievement: Achievement;
        unlocked_at: string;
      }>,
      Error
    >,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.recentGlobal(limit),
    queryFn: () => getRecentGlobalUnlocks(supabase, limit),
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to get rarest achievements
 */
export function useRarestAchievements(
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<
      Array<{
        achievement: Achievement;
        unlockCount: number;
        unlockPercentage: number;
      }>,
      Error
    >,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: achievementKeys.rarest(limit),
    queryFn: () => getRarestAchievements(supabase, limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...queryOptions,
  });
}

/**
 * Hook to unlock an achievement
 */
export function useUnlockAchievement() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      playerId,
      achievementCode,
      gameId,
    }: {
      playerId: string;
      achievementCode: string;
      gameId?: string;
    }) => unlockAchievement(supabase, playerId, achievementCode, gameId),
    onSuccess: (result, { playerId }) => {
      if (result.unlocked) {
        // Invalidate player achievements
        queryClient.invalidateQueries({
          queryKey: achievementKeys.playerAchievements(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.withProgress(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.stats(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.unnotified(playerId),
        });
      }
    },
  });
}

/**
 * Hook to update achievement progress
 */
export function useUpdateAchievementProgress() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      playerId,
      achievementCode,
      progress,
      gameId,
    }: {
      playerId: string;
      achievementCode: string;
      progress: number;
      gameId?: string;
    }) => updateAchievementProgress(supabase, playerId, achievementCode, progress, gameId),
    onSuccess: (result, { playerId }) => {
      queryClient.invalidateQueries({
        queryKey: achievementKeys.withProgress(playerId),
      });

      if (result.unlocked) {
        queryClient.invalidateQueries({
          queryKey: achievementKeys.playerAchievements(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.stats(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.unnotified(playerId),
        });
      }
    },
  });
}

/**
 * Hook to check and auto-unlock achievements based on stats
 */
export function useCheckPlayerAchievements() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ playerId, gameId }: { playerId: string; gameId?: string }) =>
      checkPlayerAchievements(supabase, playerId, gameId),
    onSuccess: (unlockedAchievements, { playerId }) => {
      if (unlockedAchievements.length > 0) {
        // Invalidate all achievement-related queries
        queryClient.invalidateQueries({
          queryKey: achievementKeys.playerAchievements(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.withProgress(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.stats(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.unnotified(playerId),
        });
      }
    },
  });
}

/**
 * Hook to mark achievements as notified
 */
export function useMarkAchievementsNotified() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ playerId, achievementIds }: { playerId: string; achievementIds: string[] }) =>
      markAchievementsNotified(supabase, playerId, achievementIds),
    onSuccess: (_data, { playerId }) => {
      queryClient.invalidateQueries({
        queryKey: achievementKeys.unnotified(playerId),
      });
    },
  });
}
