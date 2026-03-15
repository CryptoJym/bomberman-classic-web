/**
 * React Query hooks for user statistics
 */

'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { PlayerStats, ApiResponse, ApiError } from '@/types/api';

// Query Keys
export const statsKeys = {
  all: ['stats'] as const,
  detail: (userId: string) => [...statsKeys.all, userId] as const,
};

/**
 * Hook to fetch detailed player statistics
 */
export function useUserStats(
  options?: Omit<UseQueryOptions<PlayerStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: statsKeys.detail('current'),
    queryFn: async () => {
      const response = await fetch('/api/profile/stats');
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorData = data as ApiError;
        throw new Error(errorData.message || 'Failed to fetch stats');
      }

      const result = data as ApiResponse<PlayerStats>;
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
