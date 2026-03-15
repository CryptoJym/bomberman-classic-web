/**
 * React Query hooks for Profile data
 */

'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getProfile,
  getProfileByClerkId,
  getProfileWithStats,
  updateProfile,
  updateOnlineStatus,
  updatePlayerSettings,
  searchProfiles,
  getPlayerGameHistory,
} from '@/lib/supabase/queries/profiles';
import type { Profile } from '@/types/api';
import type { ProfileUpdate, PlayerSettings } from '@/lib/supabase/types';

// Query Keys
export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...profileKeys.lists(), filters] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
  byClerk: (clerkId: string) => [...profileKeys.all, 'clerk', clerkId] as const,
  withStats: (id: string) => [...profileKeys.detail(id), 'stats'] as const,
  gameHistory: (playerId: string, filters?: Record<string, unknown>) =>
    [...profileKeys.detail(playerId), 'gameHistory', filters] as const,
  search: (query: string) => [...profileKeys.lists(), 'search', query] as const,
};

/**
 * Hook to get a profile by ID
 */
export function useProfile(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<Profile | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: () => (userId ? getProfile(supabase, userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get a profile by Clerk ID
 */
export function useProfileByClerkId(
  clerkId: string | undefined,
  options?: Omit<UseQueryOptions<Profile | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: profileKeys.byClerk(clerkId ?? ''),
    queryFn: () => (clerkId ? getProfileByClerkId(supabase, clerkId) : null),
    enabled: !!clerkId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get a profile with computed stats
 * Note: Stats (winRate, kdRatio) are already computed in the Profile type
 */
export function useProfileWithStats(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<Profile | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: profileKeys.withStats(userId ?? ''),
    queryFn: () => (userId ? getProfileWithStats(supabase, userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to update a profile with optimistic updates
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: ProfileUpdate }) =>
      updateProfile(supabase, userId, updates),
    onMutate: async ({ userId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(userId) });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<Profile>(profileKeys.detail(userId));

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData<Profile>(profileKeys.detail(userId), {
          ...previousProfile,
          ...updates,
        } as Profile);
      }

      return { previousProfile };
    },
    onError: (_err, { userId }, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.detail(userId), context.previousProfile);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}

/**
 * Hook to update online status
 */
export function useUpdateOnlineStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ userId, isOnline }: { userId: string; isOnline: boolean }) =>
      updateOnlineStatus(supabase, userId, isOnline),
    onMutate: async ({ userId, isOnline }) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(userId) });

      const previousProfile = queryClient.getQueryData<Profile>(profileKeys.detail(userId));

      if (previousProfile) {
        queryClient.setQueryData<Profile>(profileKeys.detail(userId), {
          ...previousProfile,
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
        } as Profile);
      }

      return { previousProfile };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.detail(userId), context.previousProfile);
      }
    },
  });
}

/**
 * Hook to update player settings
 */
export function useUpdatePlayerSettings() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      userId,
      settings,
    }: {
      userId: string;
      settings: Partial<PlayerSettings>;
    }) => updatePlayerSettings(supabase, userId, settings),
    onSettled: (_data, _error, { userId }) => {
      // Settings are stored separately, just invalidate to refetch
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}

/**
 * Hook to search profiles
 */
export function useSearchProfiles(
  query: string,
  options?: {
    limit?: number;
    excludeIds?: string[];
    enabled?: boolean;
  }
) {
  const supabase = createClient();
  const { limit = 10, excludeIds = [], enabled = true } = options ?? {};

  return useQuery({
    queryKey: profileKeys.search(query),
    queryFn: () => searchProfiles(supabase, query, { limit, excludeIds }),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to get player game history
 */
export function usePlayerGameHistory(
  playerId: string | undefined,
  options?: {
    limit?: number;
    offset?: number;
    gameType?: 'casual' | 'ranked' | 'tournament';
  }
) {
  const supabase = createClient();
  const { limit = 20, offset = 0, gameType } = options ?? {};

  return useQuery({
    queryKey: profileKeys.gameHistory(playerId ?? '', { limit, offset, gameType }),
    queryFn: () =>
      playerId
        ? getPlayerGameHistory(supabase, playerId, { limit, offset, gameType })
        : { games: [], total: 0 },
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
  });
}
