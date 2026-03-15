/**
 * Profile Data Access Functions
 *
 * Provides functions for managing user profiles in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  ProfileInsert,
  ProfileUpdate,
} from '../types';
import type { Profile } from '@/types/api';
import { transformProfile } from '../transformers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for profile-related operations
 */
export class ProfileError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

/**
 * Get a profile by user ID
 */
export async function getProfile(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new ProfileError(error.message, error.code);
  }

  return data ? transformProfile(data) : null;
}

/**
 * Get a profile by Clerk user ID
 */
export async function getProfileByClerkId(
  supabase: TypedSupabaseClient,
  clerkId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new ProfileError(error.message, error.code);
  }

  return data ? transformProfile(data) : null;
}

/**
 * Get a profile by username
 */
export async function getProfileByUsername(
  supabase: TypedSupabaseClient,
  username: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new ProfileError(error.message, error.code);
  }

  return data ? transformProfile(data) : null;
}

/**
 * Get a profile with computed stats (K/D ratio, win rate)
 * Note: The transformer already computes these stats, so this just returns the profile
 */
export async function getProfileWithStats(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<Profile | null> {
  // The transformProfile function already computes kdRatio and winRate
  return getProfile(supabase, userId);
}

/**
 * Create a new profile
 */
export async function createProfile(
  supabase: TypedSupabaseClient,
  profileData: ProfileInsert
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique violation
      if (error.message.includes('clerk_id')) {
        throw new ProfileError('A profile with this Clerk ID already exists', 'CLERK_ID_EXISTS');
      }
      if (error.message.includes('username')) {
        throw new ProfileError('This username is already taken', 'USERNAME_EXISTS');
      }
    }
    throw new ProfileError(error.message, error.code);
  }

  return data;
}

/**
 * Update a profile
 */
export async function updateProfile(
  supabase: TypedSupabaseClient,
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ProfileError('Profile not found', 'NOT_FOUND');
    }
    if (error.code === '23505' && error.message.includes('username')) {
      throw new ProfileError('This username is already taken', 'USERNAME_EXISTS');
    }
    throw new ProfileError(error.message, error.code);
  }

  return data;
}

/**
 * Update profile online status
 */
export async function updateOnlineStatus(
  supabase: TypedSupabaseClient,
  userId: string,
  isOnline: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new ProfileError(error.message, error.code);
  }
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(
  supabase: TypedSupabaseClient,
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase.from('profiles').select('id').eq('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  return data === null;
}

/**
 * Search profiles by username (fuzzy search)
 */
export async function searchProfiles(
  supabase: TypedSupabaseClient,
  query: string,
  options: {
    limit?: number;
    excludeIds?: string[];
  } = {}
): Promise<Profile[]> {
  const { limit = 10, excludeIds = [] } = options;

  let dbQuery = supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .eq('is_banned', false)
    .limit(limit);

  if (excludeIds.length > 0) {
    dbQuery = dbQuery.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get multiple profiles by IDs
 */
export async function getProfiles(
  supabase: TypedSupabaseClient,
  userIds: string[]
): Promise<Profile[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  return data ? data.map(transformProfile) : [];
}

/**
 * Get online friends count
 */
export async function getOnlineFriendsCount(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, profiles!friendships_addressee_id_fkey(is_online)', {
      count: 'exact',
      head: true,
    })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  return count ?? 0;
}

/**
 * Get recently active players
 */
export async function getRecentlyActivePlayers(
  supabase: TypedSupabaseClient,
  options: {
    limit?: number;
    minutesAgo?: number;
  } = {}
): Promise<Profile[]> {
  const { limit = 20, minutesAgo = 15 } = options;

  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_online', true)
    .gte('last_seen_at', cutoffTime)
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get player game history with stats
 */
export async function getPlayerGameHistory(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    limit?: number;
    offset?: number;
    gameType?: 'casual' | 'ranked' | 'tournament';
  } = {}
): Promise<{
  games: Array<{
    game_id: string;
    game_type: string;
    status: string;
    placement: number | null;
    kills: number;
    deaths: number;
    elo_change: number;
    played_at: string;
    map_name: string | null;
    player_count: number;
  }>;
  total: number;
}> {
  const { limit = 20, offset = 0, gameType } = options;

  let query = supabase
    .from('game_players')
    .select(
      `
      game_id,
      placement,
      kills,
      deaths,
      elo_change,
      joined_at,
      games!inner (
        game_type,
        status,
        map_id,
        finished_at,
        maps (name)
      )
    `,
      { count: 'exact' }
    )
    .eq('player_id', playerId)
    .not('games.finished_at', 'is', null)
    .order('joined_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (gameType) {
    query = query.eq('games.game_type', gameType);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new ProfileError(error.message, error.code);
  }

  // Get player counts for each game
  const gameIds = data?.map((d) => d.game_id) ?? [];
  let playerCounts: Record<string, number> = {};

  if (gameIds.length > 0) {
    const { data: countData } = await supabase
      .from('game_players')
      .select('game_id')
      .in('game_id', gameIds)
      .eq('is_spectator', false);

    if (countData) {
      playerCounts = countData.reduce(
        (acc, curr) => {
          acc[curr.game_id] = (acc[curr.game_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const games =
    data?.map((d) => {
      const game = d.games as unknown as {
        game_type: string;
        status: string;
        finished_at: string;
        maps: { name: string } | null;
      };
      return {
        game_id: d.game_id,
        game_type: game.game_type,
        status: game.status,
        placement: d.placement,
        kills: d.kills,
        deaths: d.deaths,
        elo_change: d.elo_change,
        played_at: game.finished_at,
        map_name: game.maps?.name ?? null,
        player_count: playerCounts[d.game_id] ?? 0,
      };
    }) ?? [];

  return {
    games,
    total: count ?? 0,
  };
}

/**
 * Update player settings
 */
export async function updatePlayerSettings(
  supabase: TypedSupabaseClient,
  userId: string,
  settings: Partial<Profile['settings']>
): Promise<void> {
  // First get current settings
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .single();

  if (fetchError) {
    throw new ProfileError(fetchError.message, fetchError.code);
  }

  // Merge settings
  const mergedSettings = {
    ...profile.settings,
    ...settings,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ settings: mergedSettings })
    .eq('id', userId);

  if (error) {
    throw new ProfileError(error.message, error.code);
  }
}
