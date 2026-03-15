/**
 * React Query hooks for match history with pagination
 */

'use client';

import { useQuery, type UseQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { GameSummary, PaginatedResponse, ApiResponse, ApiError } from '@/types/api';

// Query Keys
export const matchHistoryKeys = {
  all: ['matchHistory'] as const,
  lists: () => [...matchHistoryKeys.all, 'list'] as const,
  list: (filters: { gameType?: string; limit?: number; page?: number }) =>
    [...matchHistoryKeys.lists(), filters] as const,
};

export interface MatchHistoryFilters {
  gameType?: 'casual' | 'ranked' | 'tournament';
  limit?: number;
}

/**
 * Hook to fetch match history with standard pagination
 */
export function useMatchHistory(
  page: number = 1,
  filters?: MatchHistoryFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<GameSummary>, Error>, 'queryKey' | 'queryFn'>
) {
  const limit = filters?.limit || 20;

  return useQuery({
    queryKey: matchHistoryKeys.list({ ...filters, page, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.gameType) {
        params.append('gameType', filters.gameType);
      }

      const response = await fetch(`/api/profile/history?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorData = data as ApiError;
        throw new Error(errorData.message || 'Failed to fetch match history');
      }

      const result = data as ApiResponse<PaginatedResponse<GameSummary>>;
      return result.data;
    },
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to fetch match history with infinite scroll pagination
 */
export function useInfiniteMatchHistory(filters?: MatchHistoryFilters) {
  const limit = filters?.limit || 20;

  return useInfiniteQuery({
    queryKey: matchHistoryKeys.list({ ...filters, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
      });

      if (filters?.gameType) {
        params.append('gameType', filters.gameType);
      }

      const response = await fetch(`/api/profile/history?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorData = data as ApiError;
        throw new Error(errorData.message || 'Failed to fetch match history');
      }

      const result = data as ApiResponse<PaginatedResponse<GameSummary>>;
      return result.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60, // 1 minute
  });
}
