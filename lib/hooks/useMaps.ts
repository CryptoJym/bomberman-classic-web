/**
 * React Query hooks for Maps data
 */

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getMap,
  getMapWithCreator,
  getMaps,
  getOfficialMaps,
  getFeaturedMaps,
  getPopularMaps,
  createMap,
  updateMap,
  deleteMap,
  publishMap,
  toggleMapFavorite,
  getPlayerFavorites,
  isMapFavorited,
  getPlayerMaps,
  forkMap,
  rateMap,
  getMapRating,
  incrementMapPlayCount,
  type MapWithCreator,
} from '@/lib/supabase/queries/maps';
import type { GameMap, GameMapInsert, GameMapUpdate } from '@/lib/supabase/types';

// Query Keys
export const mapKeys = {
  all: ['maps'] as const,
  lists: () => [...mapKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...mapKeys.lists(), filters] as const,
  details: () => [...mapKeys.all, 'detail'] as const,
  detail: (id: string) => [...mapKeys.details(), id] as const,
  withCreator: (id: string) => [...mapKeys.detail(id), 'creator'] as const,
  official: () => [...mapKeys.lists(), 'official'] as const,
  featured: () => [...mapKeys.lists(), 'featured'] as const,
  popular: (options?: Record<string, unknown>) => [...mapKeys.lists(), 'popular', options] as const,
  playerMaps: (playerId: string, options?: Record<string, unknown>) =>
    [...mapKeys.lists(), 'player', playerId, options] as const,
  favorites: (playerId: string) => [...mapKeys.lists(), 'favorites', playerId] as const,
  isFavorited: (mapId: string, playerId: string) =>
    [...mapKeys.detail(mapId), 'favorited', playerId] as const,
  rating: (mapId: string, playerId?: string) =>
    [...mapKeys.detail(mapId), 'rating', playerId] as const,
};

/**
 * Hook to get a single map
 */
export function useMap(
  mapId: string | undefined,
  options?: Omit<UseQueryOptions<GameMap | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.detail(mapId ?? ''),
    queryFn: () => (mapId ? getMap(supabase, mapId) : null),
    enabled: !!mapId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get a map with creator info
 */
export function useMapWithCreator(
  mapId: string | undefined,
  options?: Omit<UseQueryOptions<MapWithCreator | null, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.withCreator(mapId ?? ''),
    queryFn: () => (mapId ? getMapWithCreator(supabase, mapId) : null),
    enabled: !!mapId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get maps with filters
 */
export function useMaps(
  filters?: {
    isPublished?: boolean;
    isOfficial?: boolean;
    isFeatured?: boolean;
    creatorId?: string;
    search?: string;
    sortBy?: 'created_at' | 'play_count' | 'likes' | 'average_rating' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  },
  options?: Omit<UseQueryOptions<{ maps: MapWithCreator[]; total: number }, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.list(filters ?? {}),
    queryFn: () => getMaps(supabase, filters),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to get maps with infinite scroll
 */
export function useInfiniteMaps(filters?: {
  isPublished?: boolean;
  isOfficial?: boolean;
  search?: string;
  sortBy?: 'created_at' | 'play_count' | 'likes' | 'average_rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}) {
  const supabase = createClient();
  const { pageSize = 20, ...restFilters } = filters ?? {};

  return useInfiniteQuery({
    queryKey: mapKeys.list({ ...restFilters, infinite: true }),
    queryFn: ({ pageParam = 0 }) =>
      getMaps(supabase, {
        ...restFilters,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.maps.length < pageSize) {
        return undefined;
      }
      return allPages.reduce((acc, page) => acc + page.maps.length, 0);
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get official maps
 */
export function useOfficialMaps(
  options?: Omit<UseQueryOptions<GameMap[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.official(),
    queryFn: () => getOfficialMaps(supabase),
    staleTime: 1000 * 60 * 30, // 30 minutes (official maps don't change often)
    ...options,
  });
}

/**
 * Hook to get featured maps
 */
export function useFeaturedMaps(
  limit: number = 10,
  options?: Omit<UseQueryOptions<GameMap[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.featured(),
    queryFn: () => getFeaturedMaps(supabase, limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Hook to get popular maps
 */
export function usePopularMaps(
  opts?: { limit?: number; timeframe?: 'day' | 'week' | 'month' | 'all' },
  options?: Omit<UseQueryOptions<MapWithCreator[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();
  const { limit = 10, timeframe = 'week' } = opts ?? {};

  return useQuery({
    queryKey: mapKeys.popular({ limit, timeframe }),
    queryFn: () => getPopularMaps(supabase, { limit, timeframe }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get player's maps
 */
export function usePlayerMaps(
  playerId: string | undefined,
  opts?: { includeUnpublished?: boolean; limit?: number; offset?: number },
  options?: Omit<
    UseQueryOptions<{ maps: GameMap[]; total: number }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();
  const { includeUnpublished = false, limit = 20, offset = 0 } = opts ?? {};

  return useQuery({
    queryKey: mapKeys.playerMaps(playerId ?? '', { includeUnpublished, limit, offset }),
    queryFn: () =>
      playerId
        ? getPlayerMaps(supabase, playerId, { includeUnpublished, limit, offset })
        : { maps: [], total: 0 },
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to get player's favorite maps
 */
export function usePlayerFavorites(
  playerId: string | undefined,
  options?: Omit<UseQueryOptions<GameMap[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.favorites(playerId ?? ''),
    queryFn: () => (playerId ? getPlayerFavorites(supabase, playerId) : []),
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to check if a map is favorited
 */
export function useIsMapFavorited(mapId: string | undefined, playerId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.isFavorited(mapId ?? '', playerId ?? ''),
    queryFn: () => (mapId && playerId ? isMapFavorited(supabase, mapId, playerId) : false),
    enabled: !!mapId && !!playerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get map rating for a specific player
 */
export function useMapRating(mapId: string | undefined, playerId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: mapKeys.rating(mapId ?? '', playerId),
    queryFn: () =>
      mapId && playerId ? getMapRating(supabase, mapId, playerId) : null,
    enabled: !!mapId && !!playerId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a new map
 */
export function useCreateMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (mapData: GameMapInsert) => createMap(supabase, mapData),
    onSuccess: (newMap) => {
      // Add to cache
      queryClient.setQueryData(mapKeys.detail(newMap.id), newMap);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: mapKeys.lists() });
    },
  });
}

/**
 * Hook to update a map
 */
export function useUpdateMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ mapId, updates }: { mapId: string; updates: GameMapUpdate }) =>
      updateMap(supabase, mapId, updates),
    onMutate: async ({ mapId, updates }) => {
      await queryClient.cancelQueries({ queryKey: mapKeys.detail(mapId) });

      const previousMap = queryClient.getQueryData<GameMap>(mapKeys.detail(mapId));

      if (previousMap) {
        queryClient.setQueryData<GameMap>(mapKeys.detail(mapId), {
          ...previousMap,
          ...updates,
        });
      }

      return { previousMap };
    },
    onError: (_err, { mapId }, context) => {
      if (context?.previousMap) {
        queryClient.setQueryData(mapKeys.detail(mapId), context.previousMap);
      }
    },
    onSettled: (_data, _error, { mapId }) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.detail(mapId) });
      queryClient.invalidateQueries({ queryKey: mapKeys.lists() });
    },
  });
}

/**
 * Hook to delete a map
 */
export function useDeleteMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (mapId: string) => deleteMap(supabase, mapId),
    onSuccess: (_data, mapId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: mapKeys.detail(mapId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: mapKeys.lists() });
    },
  });
}

/**
 * Hook to publish a map
 */
export function usePublishMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (mapId: string) => publishMap(supabase, mapId),
    onSuccess: (updatedMap) => {
      queryClient.setQueryData(mapKeys.detail(updatedMap.id), updatedMap);
      queryClient.invalidateQueries({ queryKey: mapKeys.lists() });
    },
  });
}

/**
 * Hook to toggle map favorite with optimistic updates
 */
export function useToggleMapFavorite() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ mapId, playerId }: { mapId: string; playerId: string }) =>
      toggleMapFavorite(supabase, mapId, playerId),
    onMutate: async ({ mapId, playerId }) => {
      // Cancel related queries
      await queryClient.cancelQueries({ queryKey: mapKeys.isFavorited(mapId, playerId) });
      await queryClient.cancelQueries({ queryKey: mapKeys.favorites(playerId) });

      // Get previous states
      const previousIsFavorited = queryClient.getQueryData<boolean>(
        mapKeys.isFavorited(mapId, playerId)
      );
      const previousFavorites = queryClient.getQueryData<GameMap[]>(mapKeys.favorites(playerId));

      // Optimistically toggle
      queryClient.setQueryData(mapKeys.isFavorited(mapId, playerId), !previousIsFavorited);

      return { previousIsFavorited, previousFavorites };
    },
    onError: (_err, { mapId, playerId }, context) => {
      // Rollback
      if (context?.previousIsFavorited !== undefined) {
        queryClient.setQueryData(mapKeys.isFavorited(mapId, playerId), context.previousIsFavorited);
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(mapKeys.favorites(playerId), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { mapId, playerId }) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.isFavorited(mapId, playerId) });
      queryClient.invalidateQueries({ queryKey: mapKeys.favorites(playerId) });
    },
  });
}

/**
 * Hook to rate a map
 */
export function useRateMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      mapId,
      playerId,
      rating,
    }: {
      mapId: string;
      playerId: string;
      rating: number;
    }) => rateMap(supabase, mapId, playerId, rating),
    onSuccess: (_data, { mapId, playerId }) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.rating(mapId, playerId) });
      queryClient.invalidateQueries({ queryKey: mapKeys.detail(mapId) });
    },
  });
}

/**
 * Hook to fork a map
 */
export function useForkMap() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ mapId, newOwnerId }: { mapId: string; newOwnerId: string }) =>
      forkMap(supabase, mapId, newOwnerId),
    onSuccess: (newMap) => {
      queryClient.setQueryData(mapKeys.detail(newMap.id), newMap);
      queryClient.invalidateQueries({ queryKey: mapKeys.lists() });
    },
  });
}

/**
 * Hook to increment play count (fire and forget)
 */
export function useIncrementMapPlayCount() {
  const supabase = createClient();

  return useMutation({
    mutationFn: (mapId: string) => incrementMapPlayCount(supabase, mapId),
  });
}
