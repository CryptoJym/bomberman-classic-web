/**
 * Leaderboard Data Access Functions
 *
 * Provides functions for leaderboard and ranking queries
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LeaderboardEntry, RankTier } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for leaderboard operations
 */
export class LeaderboardError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'LeaderboardError';
  }
}

/**
 * Leaderboard query options
 */
export interface LeaderboardOptions {
  limit?: number;
  offset?: number;
  timeFilter?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  sortBy?: 'elo_rating' | 'total_wins' | 'total_kills' | 'win_rate';
  rankTier?: RankTier;
  countryCode?: string;
}

/**
 * Get the global leaderboard
 */
export async function getLeaderboard(
  supabase: TypedSupabaseClient,
  options: LeaderboardOptions = {}
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
}> {
  const {
    limit = 100,
    offset = 0,
    timeFilter = 'all_time',
    sortBy = 'elo_rating',
    rankTier,
    countryCode,
  } = options;

  // Use the database function for efficient pagination
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_limit: limit,
    p_offset: offset,
    p_time_filter: timeFilter,
    p_sort_by: sortBy,
  });

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  let entries = data as LeaderboardEntry[];

  // Apply additional filters client-side (for smaller datasets this is fine)
  if (rankTier) {
    entries = entries.filter((e) => e.rank_tier === rankTier);
  }

  if (countryCode) {
    entries = entries.filter((e) => e.country_code === countryCode);
  }

  // For filtered results, we need to recompute ranks
  if (rankTier || countryCode) {
    entries = entries.map((e, idx) => ({
      ...e,
      rank: offset + idx + 1,
    }));
  }

  return {
    entries,
    total: entries.length,
  };
}

/**
 * Get player's rank
 */
export async function getPlayerRank(
  supabase: TypedSupabaseClient,
  playerId: string
): Promise<{
  globalRank: number;
  tierRank: number;
  percentile: number;
}> {
  const { data, error } = await supabase.rpc('get_player_rank', {
    player_uuid: playerId,
  });

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  const result = data as { global_rank: number; tier_rank: number; percentile: number };

  return {
    globalRank: result.global_rank,
    tierRank: result.tier_rank,
    percentile: result.percentile,
  };
}

/**
 * Get leaderboard around a specific player
 */
export async function getLeaderboardAroundPlayer(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    above?: number;
    below?: number;
    sortBy?: 'elo_rating' | 'total_wins' | 'total_kills';
  } = {}
): Promise<{
  entries: LeaderboardEntry[];
  playerIndex: number;
}> {
  const { above = 5, below = 5, sortBy = 'elo_rating' } = options;

  // Get the player's rank first
  const { globalRank } = await getPlayerRank(supabase, playerId);

  // Calculate offset to center on player
  const offset = Math.max(0, globalRank - above - 1);
  const limit = above + below + 1;

  const { entries } = await getLeaderboard(supabase, {
    limit,
    offset,
    sortBy,
  });

  // Find player's index in the results
  const playerIndex = entries.findIndex((e) => e.player_id === playerId);

  return {
    entries,
    playerIndex,
  };
}

/**
 * Get top players by specific stat
 */
export async function getTopPlayersByStat(
  supabase: TypedSupabaseClient,
  stat: 'kills' | 'wins' | 'games' | 'win_streak' | 'kd_ratio',
  limit: number = 10
): Promise<
  Array<{
    player_id: string;
    username: string;
    avatar_url: string | null;
    value: number;
    rank: number;
  }>
> {
  let query;
  let valueColumn: string;

  switch (stat) {
    case 'kills':
      query = supabase
        .from('profiles')
        .select('id, username, avatar_url, total_kills')
        .eq('is_banned', false)
        .gt('total_games', 0)
        .order('total_kills', { ascending: false });
      valueColumn = 'total_kills';
      break;
    case 'wins':
      query = supabase
        .from('profiles')
        .select('id, username, avatar_url, total_wins')
        .eq('is_banned', false)
        .gt('total_games', 0)
        .order('total_wins', { ascending: false });
      valueColumn = 'total_wins';
      break;
    case 'games':
      query = supabase
        .from('profiles')
        .select('id, username, avatar_url, total_games')
        .eq('is_banned', false)
        .gt('total_games', 0)
        .order('total_games', { ascending: false });
      valueColumn = 'total_games';
      break;
    case 'win_streak':
      query = supabase
        .from('profiles')
        .select('id, username, avatar_url, best_win_streak')
        .eq('is_banned', false)
        .gt('total_games', 0)
        .order('best_win_streak', { ascending: false });
      valueColumn = 'best_win_streak';
      break;
    case 'kd_ratio':
      // For K/D ratio, we need to compute it
      query = supabase
        .from('profiles')
        .select('id, username, avatar_url, total_kills, total_deaths')
        .eq('is_banned', false)
        .gt('total_deaths', 0); // Avoid division by zero
      valueColumn = 'computed';
      break;
    default:
      throw new LeaderboardError(`Unknown stat: ${stat}`);
  }

  const { data, error } = await query.limit(stat === 'kd_ratio' ? limit * 3 : limit);

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  let results: Array<{
    player_id: string;
    username: string;
    avatar_url: string | null;
    value: number;
  }>;

  if (stat === 'kd_ratio') {
    // Compute K/D ratio and sort
    type KDRatioRow = { id: string; username: string; avatar_url: string | null; total_kills: number; total_deaths: number };
    results = (data as KDRatioRow[] ?? [])
      .map((p) => ({
        player_id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        value: Math.round((p.total_kills / p.total_deaths) * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  } else {
    results = (data ?? []).map((p) => ({
      player_id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      value: p[valueColumn as keyof typeof p] as number,
    }));
  }

  return results.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));
}

/**
 * Get rank tier distribution
 */
export async function getRankDistribution(
  supabase: TypedSupabaseClient
): Promise<Record<RankTier, number>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('rank_tier')
    .eq('is_banned', false)
    .gt('total_games', 0);

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  const distribution: Record<RankTier, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    diamond: 0,
    master: 0,
    grandmaster: 0,
  };

  for (const player of data ?? []) {
    const tier = player.rank_tier as RankTier;
    distribution[tier]++;
  }

  return distribution;
}

/**
 * Update ELO ratings between two players
 */
export async function updateElo(
  supabase: TypedSupabaseClient,
  winnerId: string,
  loserId: string,
  isRanked: boolean = true
): Promise<{
  winnerNewElo: number;
  winnerEloChange: number;
  loserNewElo: number;
  loserEloChange: number;
}> {
  const { data, error } = await supabase.rpc('update_elo', {
    winner_uuid: winnerId,
    loser_uuid: loserId,
    is_ranked: isRanked,
  });

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  const result = data as {
    winner_new_elo: number;
    winner_elo_change: number;
    loser_new_elo: number;
    loser_elo_change: number;
  };

  return {
    winnerNewElo: result.winner_new_elo,
    winnerEloChange: result.winner_elo_change,
    loserNewElo: result.loser_new_elo,
    loserEloChange: result.loser_elo_change,
  };
}

/**
 * Get country leaderboard
 */
export async function getCountryLeaderboard(
  supabase: TypedSupabaseClient,
  options: {
    limit?: number;
    sortBy?: 'total_elo' | 'total_players' | 'avg_elo';
  } = {}
): Promise<
  Array<{
    country_code: string;
    player_count: number;
    total_elo: number;
    average_elo: number;
    top_player: {
      username: string;
      elo_rating: number;
    } | null;
  }>
> {
  const { limit = 20, sortBy = 'avg_elo' } = options;

  // Get aggregated stats by country
  const { data, error } = await supabase
    .from('profiles')
    .select('country_code, elo_rating, username')
    .eq('is_banned', false)
    .gt('total_games', 0)
    .not('country_code', 'is', null);

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  // Aggregate by country
  const countryStats: Record<
    string,
    {
      players: Array<{ username: string; elo_rating: number }>;
      totalElo: number;
    }
  > = {};

  for (const player of data ?? []) {
    if (!player.country_code) {
      continue;
    }

    if (!countryStats[player.country_code]) {
      countryStats[player.country_code] = {
        players: [],
        totalElo: 0,
      };
    }

    const countryStat = countryStats[player.country_code]!;
    countryStat.players.push({
      username: player.username,
      elo_rating: player.elo_rating,
    });
    countryStat.totalElo += player.elo_rating;
  }

  // Convert to array and compute stats
  const results = Object.entries(countryStats)
    .filter(([, stats]) => stats.players.length > 0)
    .map(([code, stats]) => {
      const topPlayer = stats.players.reduce(
        (max, p) => (p.elo_rating > max.elo_rating ? p : max),
        stats.players[0]!
      );

      return {
        country_code: code,
        player_count: stats.players.length,
        total_elo: stats.totalElo,
        average_elo: Math.round(stats.totalElo / stats.players.length),
        top_player: topPlayer,
      };
    });

  // Sort
  results.sort((a, b) => {
    switch (sortBy) {
      case 'total_elo':
        return b.total_elo - a.total_elo;
      case 'total_players':
        return b.player_count - a.player_count;
      case 'avg_elo':
      default:
        return b.average_elo - a.average_elo;
    }
  });

  return results.slice(0, limit);
}

/**
 * Get recent ELO changes for a player
 */
export async function getRecentEloChanges(
  supabase: TypedSupabaseClient,
  playerId: string,
  limit: number = 10
): Promise<
  Array<{
    game_id: string;
    elo_before: number;
    elo_after: number;
    elo_change: number;
    placement: number;
    played_at: string;
  }>
> {
  const { data, error } = await supabase
    .from('game_players')
    .select(
      `
      game_id,
      elo_before,
      elo_after,
      elo_change,
      placement,
      joined_at,
      games!inner (finished_at)
    `
    )
    .eq('player_id', playerId)
    .not('elo_change', 'eq', 0)
    .not('games.finished_at', 'is', null)
    .order('joined_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new LeaderboardError(error.message, error.code);
  }

  return (data ?? []).map((d) => ({
    game_id: d.game_id,
    elo_before: d.elo_before ?? 1000,
    elo_after: d.elo_after ?? 1000,
    elo_change: d.elo_change,
    placement: d.placement ?? 0,
    played_at: (d.games as unknown as { finished_at: string }).finished_at,
  }));
}
