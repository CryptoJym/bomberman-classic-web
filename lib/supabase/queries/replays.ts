/**
 * Replay Data Access Functions
 *
 * Provides functions for managing game replays in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Replay, ReplayData, ReplayUpdate } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for replay operations
 */
export class ReplayError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ReplayError';
  }
}

/**
 * Replay with game and player info
 */
export interface ReplayWithDetails extends Replay {
  game: {
    id: string;
    game_type: string;
    status: string;
    map_name: string | null;
    finished_at: string | null;
    player_count: number;
  } | null;
  uploader: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Save a new replay
 */
export async function saveReplay(
  supabase: TypedSupabaseClient,
  gameId: string,
  data: ReplayData,
  options: {
    uploaderId?: string;
    title?: string;
    description?: string;
    isPublic?: boolean;
  } = {}
): Promise<Replay> {
  const { uploaderId, title, description, isPublic = false } = options;

  // Calculate replay metadata
  const duration = data.frames.length > 0
    ? Math.round(data.frames[data.frames.length - 1].timestamp / 1000)
    : 0;

  const fileSize = JSON.stringify(data).length;

  const { data: replay, error } = await supabase
    .from('replays')
    .insert({
      game_id: gameId,
      uploader_id: uploaderId ?? null,
      title: title ?? `Game Replay`,
      description: description ?? null,
      replay_data: data,
      duration_seconds: duration,
      file_size: fileSize,
      is_public: isPublic,
      version: data.version ?? '1.0',
    })
    .select()
    .single();

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return replay;
}

/**
 * Get a replay by ID
 */
export async function getReplay(
  supabase: TypedSupabaseClient,
  replayId: string
): Promise<Replay | null> {
  const { data, error } = await supabase
    .from('replays')
    .select('*')
    .eq('id', replayId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ReplayError(error.message, error.code);
  }

  return data;
}

/**
 * Get a replay with full details
 */
export async function getReplayWithDetails(
  supabase: TypedSupabaseClient,
  replayId: string
): Promise<ReplayWithDetails | null> {
  const { data, error } = await supabase
    .from('replays')
    .select(
      `
      *,
      game:games (
        id,
        game_type,
        status,
        finished_at,
        map:maps (name)
      ),
      uploader:profiles (id, username, avatar_url)
    `
    )
    .eq('id', replayId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ReplayError(error.message, error.code);
  }

  if (!data) {
    return null;
  }

  // Get player count for the game
  let playerCount = 0;
  if (data.game) {
    const { count } = await supabase
      .from('game_players')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', (data.game as { id: string }).id)
      .eq('is_spectator', false);
    playerCount = count ?? 0;
  }

  const game = data.game as {
    id: string;
    game_type: string;
    status: string;
    finished_at: string | null;
    map: { name: string } | null;
  } | null;

  return {
    ...data,
    game: game ? {
      id: game.id,
      game_type: game.game_type,
      status: game.status,
      map_name: game.map?.name ?? null,
      finished_at: game.finished_at,
      player_count: playerCount,
    } : null,
    uploader: data.uploader as ReplayWithDetails['uploader'],
  } as ReplayWithDetails;
}

/**
 * Get replays for a specific player
 */
export async function getPlayerReplays(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    limit?: number;
    offset?: number;
    includePrivate?: boolean;
  } = {}
): Promise<{ replays: Replay[]; total: number }> {
  const { limit = 20, offset = 0, includePrivate = false } = options;

  let query = supabase
    .from('replays')
    .select('*', { count: 'exact' })
    .eq('uploader_id', playerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return {
    replays: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Get replays for a specific game
 */
export async function getGameReplays(
  supabase: TypedSupabaseClient,
  gameId: string,
  options: {
    includePrivate?: boolean;
  } = {}
): Promise<Replay[]> {
  const { includePrivate = false } = options;

  let query = supabase
    .from('replays')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get public replays (for replay browser)
 */
export async function getPublicReplays(
  supabase: TypedSupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'views' | 'likes';
    gameType?: string;
    minDuration?: number;
    maxDuration?: number;
  } = {}
): Promise<{ replays: ReplayWithDetails[]; total: number }> {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'recent',
    gameType,
    minDuration,
    maxDuration,
  } = options;

  let query = supabase
    .from('replays')
    .select(
      `
      *,
      game:games (
        id,
        game_type,
        status,
        finished_at,
        map:maps (name)
      ),
      uploader:profiles (id, username, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('is_public', true);

  // Apply filters
  if (gameType) {
    query = query.eq('games.game_type', gameType);
  }

  if (minDuration !== undefined) {
    query = query.gte('duration_seconds', minDuration);
  }

  if (maxDuration !== undefined) {
    query = query.lte('duration_seconds', maxDuration);
  }

  // Apply sorting
  switch (sortBy) {
    case 'views':
      query = query.order('view_count', { ascending: false });
      break;
    case 'likes':
      query = query.order('like_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  const replays = (data ?? []).map((d) => {
    const game = d.game as {
      id: string;
      game_type: string;
      status: string;
      finished_at: string | null;
      map: { name: string } | null;
    } | null;

    return {
      ...d,
      game: game ? {
        id: game.id,
        game_type: game.game_type,
        status: game.status,
        map_name: game.map?.name ?? null,
        finished_at: game.finished_at,
        player_count: 0, // Would need additional query for each
      } : null,
      uploader: d.uploader as ReplayWithDetails['uploader'],
    } as ReplayWithDetails;
  });

  return {
    replays,
    total: count ?? 0,
  };
}

/**
 * Update a replay
 */
export async function updateReplay(
  supabase: TypedSupabaseClient,
  replayId: string,
  updates: ReplayUpdate
): Promise<Replay> {
  const { data, error } = await supabase
    .from('replays')
    .update(updates)
    .eq('id', replayId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ReplayError('Replay not found', 'NOT_FOUND');
    }
    throw new ReplayError(error.message, error.code);
  }

  return data;
}

/**
 * Delete a replay
 */
export async function deleteReplay(
  supabase: TypedSupabaseClient,
  replayId: string
): Promise<void> {
  const { error } = await supabase
    .from('replays')
    .delete()
    .eq('id', replayId);

  if (error) {
    throw new ReplayError(error.message, error.code);
  }
}

/**
 * Increment replay view count
 */
export async function incrementReplayViews(
  supabase: TypedSupabaseClient,
  replayId: string
): Promise<void> {
  const { error } = await supabase.rpc('increment_replay_views', {
    replay_uuid: replayId,
  });

  // If RPC doesn't exist, do it manually
  if (error && error.code === '42883') {
    const { data: replay } = await supabase
      .from('replays')
      .select('view_count')
      .eq('id', replayId)
      .single();

    if (replay) {
      await supabase
        .from('replays')
        .update({ view_count: replay.view_count + 1 })
        .eq('id', replayId);
    }
    return;
  }

  if (error) {
    throw new ReplayError(error.message, error.code);
  }
}

/**
 * Like/unlike a replay
 */
export async function toggleReplayLike(
  supabase: TypedSupabaseClient,
  replayId: string,
  _userId: string
): Promise<{ liked: boolean; likeCount: number }> {
  // Check if already liked (using a replay_likes table if it exists)
  // For now, we'll just increment/decrement the like count
  // In a real implementation, you'd have a replay_likes junction table

  const { data: replay, error: fetchError } = await supabase
    .from('replays')
    .select('like_count')
    .eq('id', replayId)
    .single();

  if (fetchError) {
    throw new ReplayError(fetchError.message, fetchError.code);
  }

  // Toggle like (simplified - would need a likes table for proper implementation)
  const newLikeCount = replay.like_count + 1;

  const { error } = await supabase
    .from('replays')
    .update({ like_count: newLikeCount })
    .eq('id', replayId);

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return {
    liked: true,
    likeCount: newLikeCount,
  };
}

/**
 * Search replays
 */
export async function searchReplays(
  supabase: TypedSupabaseClient,
  query: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ replays: Replay[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('replays')
    .select('*', { count: 'exact' })
    .eq('is_public', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return {
    replays: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Get featured/highlighted replays
 */
export async function getFeaturedReplays(
  supabase: TypedSupabaseClient,
  limit: number = 10
): Promise<Replay[]> {
  const { data, error } = await supabase
    .from('replays')
    .select('*')
    .eq('is_public', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get recent replays from friends
 */
export async function getFriendReplays(
  supabase: TypedSupabaseClient,
  userId: string,
  limit: number = 20
): Promise<ReplayWithDetails[]> {
  // First get friend IDs
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (friendError) {
    throw new ReplayError(friendError.message, friendError.code);
  }

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  if (friendIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('replays')
    .select(
      `
      *,
      game:games (
        id,
        game_type,
        status,
        finished_at,
        map:maps (name)
      ),
      uploader:profiles (id, username, avatar_url)
    `
    )
    .in('uploader_id', friendIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new ReplayError(error.message, error.code);
  }

  return (data ?? []).map((d) => {
    const game = d.game as {
      id: string;
      game_type: string;
      status: string;
      finished_at: string | null;
      map: { name: string } | null;
    } | null;

    return {
      ...d,
      game: game ? {
        id: game.id,
        game_type: game.game_type,
        status: game.status,
        map_name: game.map?.name ?? null,
        finished_at: game.finished_at,
        player_count: 0,
      } : null,
      uploader: d.uploader as ReplayWithDetails['uploader'],
    } as ReplayWithDetails;
  });
}
