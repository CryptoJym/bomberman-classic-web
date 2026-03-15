/**
 * Achievement Data Access Functions
 *
 * Provides functions for managing achievements in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Achievement,
  PlayerAchievement,
  AchievementCategory,
  AchievementRarity,
  AchievementWithProgress,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for achievement operations
 */
export class AchievementError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AchievementError';
  }
}

/**
 * Get all achievements
 */
export async function getAchievements(
  supabase: TypedSupabaseClient,
  options: {
    category?: AchievementCategory;
    rarity?: AchievementRarity;
    includeHidden?: boolean;
    includeInactive?: boolean;
  } = {}
): Promise<Achievement[]> {
  const { category, rarity, includeHidden = false, includeInactive = false } = options;

  let query = supabase.from('achievements').select('*').order('sort_order', { ascending: true });

  if (!includeHidden) {
    query = query.eq('is_hidden', false);
  }

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (rarity) {
    query = query.eq('rarity', rarity);
  }

  const { data, error } = await query;

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get an achievement by ID
 */
export async function getAchievement(
  supabase: TypedSupabaseClient,
  achievementId: string
): Promise<Achievement | null> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new AchievementError(error.message, error.code);
  }

  return data;
}

/**
 * Get an achievement by code
 */
export async function getAchievementByCode(
  supabase: TypedSupabaseClient,
  code: string
): Promise<Achievement | null> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new AchievementError(error.message, error.code);
  }

  return data;
}

/**
 * Get player's achievements
 */
export async function getPlayerAchievements(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    unlockedOnly?: boolean;
    category?: AchievementCategory;
  } = {}
): Promise<(PlayerAchievement & { achievement: Achievement })[]> {
  const { unlockedOnly = false, category } = options;

  let query = supabase
    .from('player_achievements')
    .select(
      `
      *,
      achievement:achievements (*)
    `
    )
    .eq('player_id', playerId)
    .order('unlocked_at', { ascending: false });

  if (unlockedOnly) {
    query = query.not('unlocked_at', 'is', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  let results = (data ?? []) as (PlayerAchievement & { achievement: Achievement })[];

  if (category) {
    results = results.filter((r) => r.achievement.category === category);
  }

  return results;
}

/**
 * Get all achievements with player progress
 */
export async function getAchievementsWithProgress(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    category?: AchievementCategory;
    includeHidden?: boolean;
  } = {}
): Promise<AchievementWithProgress[]> {
  const { category, includeHidden = false } = options;

  // Get all achievements
  let achievementsQuery = supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!includeHidden) {
    achievementsQuery = achievementsQuery.eq('is_hidden', false);
  }

  if (category) {
    achievementsQuery = achievementsQuery.eq('category', category);
  }

  const { data: achievements, error: achievementsError } = await achievementsQuery;

  if (achievementsError) {
    throw new AchievementError(achievementsError.message, achievementsError.code);
  }

  // Get player progress
  const { data: playerAchievements, error: progressError } = await supabase
    .from('player_achievements')
    .select('*')
    .eq('player_id', playerId);

  if (progressError) {
    throw new AchievementError(progressError.message, progressError.code);
  }

  // Map progress to achievements
  const progressMap = new Map(
    (playerAchievements ?? []).map((pa) => [pa.achievement_id, pa])
  );

  return (achievements ?? []).map((achievement) => ({
    ...achievement,
    player_achievement: progressMap.get(achievement.id),
  }));
}

/**
 * Unlock an achievement for a player
 */
export async function unlockAchievement(
  supabase: TypedSupabaseClient,
  playerId: string,
  achievementCode: string,
  gameId?: string
): Promise<{
  unlocked: boolean;
  achievement: Achievement | null;
  alreadyUnlocked: boolean;
}> {
  // Get achievement by code
  const achievement = await getAchievementByCode(supabase, achievementCode);

  if (!achievement) {
    return { unlocked: false, achievement: null, alreadyUnlocked: false };
  }

  // Check if already unlocked
  const { data: existing } = await supabase
    .from('player_achievements')
    .select('id, unlocked_at')
    .eq('player_id', playerId)
    .eq('achievement_id', achievement.id)
    .single();

  if (existing?.unlocked_at) {
    // For repeatable achievements, increment count
    if (achievement.is_repeatable) {
      await supabase
        .from('player_achievements')
        .update({
          unlock_count: (existing as PlayerAchievement).unlock_count + 1,
          unlocked_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      return { unlocked: true, achievement, alreadyUnlocked: false };
    }

    return { unlocked: false, achievement, alreadyUnlocked: true };
  }

  // Unlock achievement
  const { error } = await supabase.from('player_achievements').upsert(
    {
      player_id: playerId,
      achievement_id: achievement.id,
      progress: achievement.criteria?.target ? Number(achievement.criteria.target) : 1,
      progress_max: achievement.criteria?.target ? Number(achievement.criteria.target) : 1,
      unlocked_at: new Date().toISOString(),
      game_id: gameId ?? null,
      unlock_count: 1,
    },
    { onConflict: 'player_id,achievement_id' }
  );

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return { unlocked: true, achievement, alreadyUnlocked: false };
}

/**
 * Update achievement progress
 */
export async function updateAchievementProgress(
  supabase: TypedSupabaseClient,
  playerId: string,
  achievementCode: string,
  progress: number,
  gameId?: string
): Promise<{
  updated: boolean;
  unlocked: boolean;
  achievement: Achievement | null;
}> {
  // Get achievement by code
  const achievement = await getAchievementByCode(supabase, achievementCode);

  if (!achievement) {
    return { updated: false, unlocked: false, achievement: null };
  }

  const target = Number(achievement.criteria?.target ?? 1);
  const newProgress = Math.min(progress, target);
  const isComplete = newProgress >= target;

  const { error } = await supabase.from('player_achievements').upsert(
    {
      player_id: playerId,
      achievement_id: achievement.id,
      progress: newProgress,
      progress_max: target,
      unlocked_at: isComplete ? new Date().toISOString() : null,
      game_id: isComplete ? gameId ?? null : null,
      unlock_count: isComplete ? 1 : 0,
    },
    { onConflict: 'player_id,achievement_id' }
  );

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return { updated: true, unlocked: isComplete, achievement };
}

/**
 * Check achievements for a player (auto-unlock based on stats)
 */
export async function checkPlayerAchievements(
  supabase: TypedSupabaseClient,
  playerId: string,
  gameId?: string
): Promise<
  Array<{
    achievement_id: string;
    achievement_code: string;
    achievement_name: string;
  }>
> {
  const { data, error } = await supabase.rpc('check_achievements', {
    player_uuid: playerId,
    game_uuid: gameId ?? null,
  });

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Mark achievements as notified
 */
export async function markAchievementsNotified(
  supabase: TypedSupabaseClient,
  playerId: string,
  achievementIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from('player_achievements')
    .update({ is_notified: true })
    .eq('player_id', playerId)
    .in('achievement_id', achievementIds);

  if (error) {
    throw new AchievementError(error.message, error.code);
  }
}

/**
 * Get unnotified achievements for a player
 */
export async function getUnnotifiedAchievements(
  supabase: TypedSupabaseClient,
  playerId: string
): Promise<(PlayerAchievement & { achievement: Achievement })[]> {
  const { data, error } = await supabase
    .from('player_achievements')
    .select(
      `
      *,
      achievement:achievements (*)
    `
    )
    .eq('player_id', playerId)
    .eq('is_notified', false)
    .not('unlocked_at', 'is', null)
    .order('unlocked_at', { ascending: false });

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return (data ?? []) as (PlayerAchievement & { achievement: Achievement })[];
}

/**
 * Get player achievement stats
 */
export async function getPlayerAchievementStats(
  supabase: TypedSupabaseClient,
  playerId: string
): Promise<{
  totalUnlocked: number;
  totalPoints: number;
  totalAchievements: number;
  byCategory: Record<AchievementCategory, { unlocked: number; total: number }>;
  byRarity: Record<AchievementRarity, { unlocked: number; total: number }>;
  completionPercentage: number;
}> {
  // Get all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('id, category, rarity, points, is_active')
    .eq('is_active', true);

  if (achievementsError) {
    throw new AchievementError(achievementsError.message, achievementsError.code);
  }

  // Get player unlocked achievements
  const { data: unlocked, error: unlockedError } = await supabase
    .from('player_achievements')
    .select('achievement_id')
    .eq('player_id', playerId)
    .not('unlocked_at', 'is', null);

  if (unlockedError) {
    throw new AchievementError(unlockedError.message, unlockedError.code);
  }

  const unlockedIds = new Set((unlocked ?? []).map((u) => u.achievement_id));

  const byCategory: Record<AchievementCategory, { unlocked: number; total: number }> = {
    combat: { unlocked: 0, total: 0 },
    survival: { unlocked: 0, total: 0 },
    social: { unlocked: 0, total: 0 },
    progression: { unlocked: 0, total: 0 },
    special: { unlocked: 0, total: 0 },
    seasonal: { unlocked: 0, total: 0 },
    secret: { unlocked: 0, total: 0 },
  };

  const byRarity: Record<AchievementRarity, { unlocked: number; total: number }> = {
    common: { unlocked: 0, total: 0 },
    uncommon: { unlocked: 0, total: 0 },
    rare: { unlocked: 0, total: 0 },
    epic: { unlocked: 0, total: 0 },
    legendary: { unlocked: 0, total: 0 },
  };

  let totalPoints = 0;

  for (const achievement of achievements ?? []) {
    const isUnlocked = unlockedIds.has(achievement.id);
    const category = achievement.category as AchievementCategory;
    const rarity = achievement.rarity as AchievementRarity;

    byCategory[category].total++;
    byRarity[rarity].total++;

    if (isUnlocked) {
      byCategory[category].unlocked++;
      byRarity[rarity].unlocked++;
      totalPoints += achievement.points;
    }
  }

  const totalAchievements = achievements?.length ?? 0;
  const totalUnlocked = unlockedIds.size;

  return {
    totalUnlocked,
    totalPoints,
    totalAchievements,
    byCategory,
    byRarity,
    completionPercentage:
      totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0,
  };
}

/**
 * Get recent global achievement unlocks
 */
export async function getRecentGlobalUnlocks(
  supabase: TypedSupabaseClient,
  limit: number = 20
): Promise<
  Array<{
    player_id: string;
    username: string;
    avatar_url: string | null;
    achievement: Achievement;
    unlocked_at: string;
  }>
> {
  const { data, error } = await supabase
    .from('player_achievements')
    .select(
      `
      player_id,
      unlocked_at,
      profile:profiles!player_achievements_player_id_fkey (username, avatar_url),
      achievement:achievements (*)
    `
    )
    .not('unlocked_at', 'is', null)
    .order('unlocked_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  return (data ?? []).map((d) => ({
    player_id: d.player_id,
    username: (d.profile as unknown as { username: string }).username,
    avatar_url: (d.profile as unknown as { avatar_url: string | null }).avatar_url,
    achievement: d.achievement as unknown as Achievement,
    unlocked_at: d.unlocked_at!,
  }));
}

/**
 * Get rarest achievements (lowest unlock percentage)
 */
export async function getRarestAchievements(
  supabase: TypedSupabaseClient,
  limit: number = 10
): Promise<
  Array<{
    achievement: Achievement;
    unlockCount: number;
    unlockPercentage: number;
  }>
> {
  // Get total players
  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('total_games', 0);

  // Get achievements with unlock counts
  const { data, error } = await supabase
    .from('achievements')
    .select(
      `
      *,
      player_achievements (player_id)
    `
    )
    .eq('is_active', true)
    .eq('is_hidden', false);

  if (error) {
    throw new AchievementError(error.message, error.code);
  }

  const results = (data ?? [])
    .map((a) => {
      const unlockCount = (a.player_achievements as unknown[])?.length ?? 0;
      return {
        achievement: a as Achievement,
        unlockCount,
        unlockPercentage:
          totalPlayers && totalPlayers > 0
            ? Math.round((unlockCount / totalPlayers) * 10000) / 100
            : 0,
      };
    })
    .sort((a, b) => a.unlockPercentage - b.unlockPercentage)
    .slice(0, limit);

  return results;
}
