/**
 * usePlayerRank Hook
 * Fetches current user's rank and stats
 */

import { useState, useEffect, useCallback } from 'react';
import type { LeaderboardEntry } from '@/types/api';

interface PlayerRankData {
  /** User's leaderboard entry */
  entry: LeaderboardEntry;
  /** Global rank position */
  globalRank: number;
  /** Rank within tier */
  tierRank: number;
  /** Percentile (0-100) */
  percentile: number;
}

interface UsePlayerRankReturn {
  data: PlayerRankData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch current user's rank information
 */
export function usePlayerRank(userId?: string): UsePlayerRankReturn {
  const [data, setData] = useState<PlayerRankData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayerRank = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/leaderboard/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch player rank: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch player rank');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching player rank:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlayerRank();
  }, [fetchPlayerRank]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPlayerRank,
  };
}
