/**
 * Transformer functions to convert database rows (snake_case) to API types (camelCase)
 */

import type { Profile as ApiProfile } from '@/types/api';
import type { Database } from './types';
import { getRankFromElo } from '../elo/ranks';

type DbProfile = Database['public']['Tables']['profiles']['Row'];

/**
 * Transform database profile row to API Profile
 */
export function transformProfile(dbProfile: DbProfile): ApiProfile {
  const winRate = dbProfile.total_games > 0
    ? Math.round((dbProfile.total_wins / dbProfile.total_games) * 100 * 100) / 100
    : 0;

  const kdRatio = dbProfile.total_deaths > 0
    ? Math.round((dbProfile.total_kills / dbProfile.total_deaths) * 100) / 100
    : dbProfile.total_kills;

  return {
    id: dbProfile.id,
    clerkId: dbProfile.clerk_id,
    username: dbProfile.username,
    displayName: dbProfile.display_name ?? undefined,
    avatarUrl: dbProfile.avatar_url ?? undefined,
    bio: dbProfile.bio ?? undefined,
    country: dbProfile.country_code ?? undefined,
    eloRating: dbProfile.elo_rating,
    rankTier: getRankFromElo(dbProfile.elo_rating),
    totalGames: dbProfile.total_games,
    totalWins: dbProfile.total_wins,
    totalKills: dbProfile.total_kills,
    totalDeaths: dbProfile.total_deaths,
    winRate,
    kdRatio,
    preferredColor: dbProfile.preferred_color as 0 | 1 | 2 | 3,
    createdAt: dbProfile.created_at,
    lastSeenAt: dbProfile.last_seen_at,
    isOnline: dbProfile.is_online,
    inGame: dbProfile.in_game,
    currentRoomCode: dbProfile.current_room_code ?? undefined,
  };
}

/**
 * Transform array of database profiles
 */
export function transformProfiles(dbProfiles: DbProfile[]): ApiProfile[] {
  return dbProfiles.map(transformProfile);
}
