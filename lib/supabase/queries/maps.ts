/**
 * Map Data Access Functions
 *
 * Provides functions for managing game maps in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  GameMap,
  GameMapInsert,
  GameMapUpdate,
  Profile,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for map operations
 */
export class MapError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'MapError';
  }
}

/**
 * Map query options
 */
export interface MapQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'play_count' | 'likes' | 'average_rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  isOfficial?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  creatorId?: string;
  search?: string;
  minPlayers?: number;
  maxPlayers?: number;
}

/**
 * Map with creator profile
 */
export interface MapWithCreator extends GameMap {
  creator: Profile | null;
}

/**
 * Get a map by ID
 */
export async function getMap(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<GameMap | null> {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('id', mapId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Get a map with creator profile
 */
export async function getMapWithCreator(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<MapWithCreator | null> {
  const { data, error } = await supabase
    .from('maps')
    .select(
      `
      *,
      creator:profiles (*)
    `
    )
    .eq('id', mapId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new MapError(error.message, error.code);
  }

  return data as MapWithCreator;
}

/**
 * Get maps with filtering and pagination
 */
export async function getMaps(
  supabase: TypedSupabaseClient,
  options: MapQueryOptions = {}
): Promise<{
  maps: MapWithCreator[];
  total: number;
}> {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc',
    isOfficial,
    isPublished = true,
    isFeatured,
    creatorId,
    search,
    minPlayers,
    maxPlayers,
  } = options;

  let query = supabase
    .from('maps')
    .select(
      `
      *,
      creator:profiles (*)
    `,
      { count: 'exact' }
    );

  // Apply filters
  if (isOfficial !== undefined) {
    query = query.eq('is_official', isOfficial);
  }

  if (isPublished !== undefined) {
    query = query.eq('is_published', isPublished);
  }

  if (isFeatured !== undefined) {
    query = query.eq('is_featured', isFeatured);
  }

  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (minPlayers) {
    // Maps need to support at least minPlayers spawn points
    // This is a simplification - actual logic depends on spawn_points array length
    query = query.gte('width', minPlayers * 2); // Rough approximation
  }

  if (maxPlayers) {
    // Similar approximation for max players
    query = query.lte('width', maxPlayers * 5);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return {
    maps: (data as MapWithCreator[]) ?? [],
    total: count ?? 0,
  };
}

/**
 * Get official maps
 */
export async function getOfficialMaps(
  supabase: TypedSupabaseClient
): Promise<GameMap[]> {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('is_official', true)
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get featured maps
 */
export async function getFeaturedMaps(
  supabase: TypedSupabaseClient,
  limit: number = 10
): Promise<MapWithCreator[]> {
  const { data, error } = await supabase
    .from('maps')
    .select(
      `
      *,
      creator:profiles (*)
    `
    )
    .eq('is_featured', true)
    .eq('is_published', true)
    .order('likes', { ascending: false })
    .limit(limit);

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return (data as MapWithCreator[]) ?? [];
}

/**
 * Get popular maps
 */
export async function getPopularMaps(
  supabase: TypedSupabaseClient,
  options: {
    limit?: number;
    timeframe?: 'day' | 'week' | 'month' | 'all';
  } = {}
): Promise<MapWithCreator[]> {
  const { limit = 10, timeframe = 'all' } = options;

  let query = supabase
    .from('maps')
    .select(
      `
      *,
      creator:profiles (*)
    `
    )
    .eq('is_published', true)
    .order('play_count', { ascending: false })
    .limit(limit);

  if (timeframe !== 'all') {
    const now = new Date();
    let cutoff: Date;

    switch (timeframe) {
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    query = query.gte('published_at', cutoff.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return (data as MapWithCreator[]) ?? [];
}

/**
 * Create a new map
 */
export async function createMap(
  supabase: TypedSupabaseClient,
  mapData: GameMapInsert
): Promise<GameMap> {
  const { data, error } = await supabase
    .from('maps')
    .insert(mapData)
    .select()
    .single();

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Update a map
 */
export async function updateMap(
  supabase: TypedSupabaseClient,
  mapId: string,
  updates: GameMapUpdate
): Promise<GameMap> {
  // Increment version if tiles are being updated
  if (updates.tiles) {
    const { data: currentMap } = await supabase
      .from('maps')
      .select('version')
      .eq('id', mapId)
      .single();

    if (currentMap) {
      updates.version = (currentMap.version ?? 1) + 1;
    }
  }

  const { data, error } = await supabase
    .from('maps')
    .update(updates)
    .eq('id', mapId)
    .select()
    .single();

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Delete a map
 */
export async function deleteMap(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<void> {
  const { error } = await supabase.from('maps').delete().eq('id', mapId);

  if (error) {
    throw new MapError(error.message, error.code);
  }
}

/**
 * Publish a map
 */
export async function publishMap(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<GameMap> {
  const { data, error } = await supabase
    .from('maps')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq('id', mapId)
    .select()
    .single();

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Unpublish a map
 */
export async function unpublishMap(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<GameMap> {
  const { data, error } = await supabase
    .from('maps')
    .update({
      is_published: false,
    })
    .eq('id', mapId)
    .select()
    .single();

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Increment play count for a map
 */
export async function incrementMapPlayCount(
  supabase: TypedSupabaseClient,
  mapId: string
): Promise<void> {
  const { error } = await supabase.rpc('increment_play_count', {
    map_id: mapId,
  });

  // If the RPC doesn't exist, fall back to direct update
  if (error && error.code === 'PGRST202') {
    const { error: updateError } = await supabase
      .from('maps')
      .update({ play_count: supabase.rpc('play_count', {}) })
      .eq('id', mapId);

    // Alternative: fetch and update
    if (updateError) {
      const { data: map } = await supabase
        .from('maps')
        .select('play_count')
        .eq('id', mapId)
        .single();

      if (map) {
        await supabase
          .from('maps')
          .update({ play_count: map.play_count + 1 })
          .eq('id', mapId);
      }
    }
  } else if (error) {
    throw new MapError(error.message, error.code);
  }
}

/**
 * Rate a map
 */
export async function rateMap(
  supabase: TypedSupabaseClient,
  mapId: string,
  playerId: string,
  rating: number,
  review?: string
): Promise<void> {
  const { error } = await supabase.from('map_ratings').upsert(
    {
      map_id: mapId,
      player_id: playerId,
      rating: Math.min(5, Math.max(1, rating)),
      review: review ?? null,
    },
    { onConflict: 'map_id,player_id' }
  );

  if (error) {
    throw new MapError(error.message, error.code);
  }
}

/**
 * Get player's rating for a map
 */
export async function getMapRating(
  supabase: TypedSupabaseClient,
  mapId: string,
  playerId: string
): Promise<{ rating: number; review: string | null } | null> {
  const { data, error } = await supabase
    .from('map_ratings')
    .select('rating, review')
    .eq('map_id', mapId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new MapError(error.message, error.code);
  }

  return data;
}

/**
 * Toggle map favorite
 */
export async function toggleMapFavorite(
  supabase: TypedSupabaseClient,
  mapId: string,
  playerId: string
): Promise<boolean> {
  // Check if already favorited
  const { data: existing } = await supabase
    .from('map_favorites')
    .select('id')
    .eq('map_id', mapId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('map_favorites')
      .delete()
      .eq('map_id', mapId)
      .eq('player_id', playerId);

    if (error) {
      throw new MapError(error.message, error.code);
    }

    return false;
  } else {
    // Add favorite
    const { error } = await supabase.from('map_favorites').insert({
      map_id: mapId,
      player_id: playerId,
    });

    if (error) {
      throw new MapError(error.message, error.code);
    }

    return true;
  }
}

/**
 * Get player's favorited maps
 */
export async function getPlayerFavorites(
  supabase: TypedSupabaseClient,
  playerId: string
): Promise<MapWithCreator[]> {
  const { data, error } = await supabase
    .from('map_favorites')
    .select(
      `
      maps (
        *,
        creator:profiles (*)
      )
    `
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return (data?.map((d) => d.maps) as MapWithCreator[]) ?? [];
}

/**
 * Check if map is favorited by player
 */
export async function isMapFavorited(
  supabase: TypedSupabaseClient,
  mapId: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('map_favorites')
    .select('id')
    .eq('map_id', mapId)
    .eq('player_id', playerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new MapError(error.message, error.code);
  }

  return data !== null;
}

/**
 * Get maps created by a player
 */
export async function getPlayerMaps(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    includeUnpublished?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  maps: GameMap[];
  total: number;
}> {
  const { includeUnpublished = false, limit = 20, offset = 0 } = options;

  let query = supabase
    .from('maps')
    .select('*', { count: 'exact' })
    .eq('creator_id', playerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return {
    maps: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Fork a map (create a copy)
 */
export async function forkMap(
  supabase: TypedSupabaseClient,
  mapId: string,
  newCreatorId: string,
  newName?: string
): Promise<GameMap> {
  // Get original map
  const originalMap = await getMap(supabase, mapId);

  if (!originalMap) {
    throw new MapError('Map not found', 'NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('maps')
    .insert({
      creator_id: newCreatorId,
      name: newName ?? `${originalMap.name} (Fork)`,
      description: originalMap.description,
      width: originalMap.width,
      height: originalMap.height,
      tiles: originalMap.tiles,
      spawn_points: originalMap.spawn_points,
      powerup_distribution: originalMap.powerup_distribution,
      is_published: false,
      parent_map_id: mapId,
    })
    .select()
    .single();

  if (error) {
    throw new MapError(error.message, error.code);
  }

  return data;
}
