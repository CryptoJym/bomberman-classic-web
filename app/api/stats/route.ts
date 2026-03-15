/**
 * Player Statistics API Route
 * GET /api/stats?userId=xxx - Get detailed player statistics
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import type { ApiResponse, ApiError, PlayerStats } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let targetUserId = searchParams.get('userId');

    // If no userId provided, use authenticated user
    if (!targetUserId) {
      const { userId } = await auth();
      if (!userId) {
        const errorResponse: ApiError = {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }

      // Get user's profile ID from Clerk ID
      const supabase = await createClient();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (!profileData) {
        const errorResponse: ApiError = {
          success: false,
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }

      // Type guard to preserve type after null check
      const profile: { id: string } = profileData;
      targetUserId = profile.id;
    }

    // Create Supabase client
    const supabase = await createClient();

    // Fetch player profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profileData) {
      const errorResponse: ApiError = {
        success: false,
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Type guard to preserve type after null check
    const profile: {
      id: string;
      total_games: number;
      total_wins: number;
      total_kills: number;
      total_deaths: number;
      win_rate: number;
      kd_ratio: number;
      best_win_streak: number;
      current_win_streak: number;
    } = profileData;

    // Calculate time periods
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const seasonStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    // Fetch game history for time-based stats
    const { data: recentGamesData } = await supabase
      .from('game_players')
      .select(`
        game_id,
        placement,
        kills,
        deaths,
        elo_change,
        joined_at,
        games!inner (finished_at)
      `)
      .eq('player_id', targetUserId)
      .not('games.finished_at', 'is', null)
      .order('joined_at', { ascending: false })
      .limit(100);

    // Type guard for recentGames to preserve type
    const recentGames: Array<{
      game_id: string;
      placement: number | null;
      kills: number | null;
      deaths: number | null;
      elo_change: number | null;
      joined_at: string;
      games: { finished_at: string | null } | null;
    }> = recentGamesData || [];

    // Calculate period stats
    const allTimeStats = {
      games: profile.total_games,
      wins: profile.total_wins,
      losses: profile.total_games - profile.total_wins,
      kills: profile.total_kills,
      deaths: profile.total_deaths,
      winRate: profile.win_rate,
      kdRatio: profile.kd_ratio,
      avgKillsPerGame: profile.total_games > 0 ? profile.total_kills / profile.total_games : 0,
      bombsPlaced: 0, // TODO: Add to profile
      powerupsCollected: 0, // TODO: Add to profile
      eloChange: 0,
      achievementsUnlocked: 0, // TODO: Query achievements
    };

    const weeklyGames = recentGames?.filter((g) => {
      const finishedAt = (g.games as { finished_at?: string })?.finished_at;
      return finishedAt && new Date(finishedAt) >= weekAgo;
    }) || [];

    const weeklyStats = {
      games: weeklyGames.length,
      wins: weeklyGames.filter((g) => g.placement === 1).length,
      losses: weeklyGames.filter((g) => g.placement !== 1).length,
      kills: weeklyGames.reduce((sum, g) => sum + (g.kills || 0), 0),
      deaths: weeklyGames.reduce((sum, g) => sum + (g.deaths || 0), 0),
      winRate: weeklyGames.length > 0
        ? (weeklyGames.filter((g) => g.placement === 1).length / weeklyGames.length) * 100
        : 0,
      kdRatio: weeklyGames.reduce((sum, g) => sum + (g.deaths || 0), 0) > 0
        ? weeklyGames.reduce((sum, g) => sum + (g.kills || 0), 0) / weeklyGames.reduce((sum, g) => sum + (g.deaths || 0), 0)
        : 0,
      avgKillsPerGame: weeklyGames.length > 0
        ? weeklyGames.reduce((sum, g) => sum + (g.kills || 0), 0) / weeklyGames.length
        : 0,
      bombsPlaced: 0,
      powerupsCollected: 0,
      eloChange: weeklyGames.reduce((sum, g) => sum + (g.elo_change || 0), 0),
      achievementsUnlocked: 0,
    };

    const seasonGames = recentGames?.filter((g) => {
      const finishedAt = (g.games as { finished_at?: string })?.finished_at;
      return finishedAt && new Date(finishedAt) >= seasonStart;
    }) || [];

    const seasonStats = {
      games: seasonGames.length,
      wins: seasonGames.filter((g) => g.placement === 1).length,
      losses: seasonGames.filter((g) => g.placement !== 1).length,
      kills: seasonGames.reduce((sum, g) => sum + (g.kills || 0), 0),
      deaths: seasonGames.reduce((sum, g) => sum + (g.deaths || 0), 0),
      winRate: seasonGames.length > 0
        ? (seasonGames.filter((g) => g.placement === 1).length / seasonGames.length) * 100
        : 0,
      kdRatio: seasonGames.reduce((sum, g) => sum + (g.deaths || 0), 0) > 0
        ? seasonGames.reduce((sum, g) => sum + (g.kills || 0), 0) / seasonGames.reduce((sum, g) => sum + (g.deaths || 0), 0)
        : 0,
      avgKillsPerGame: seasonGames.length > 0
        ? seasonGames.reduce((sum, g) => sum + (g.kills || 0), 0) / seasonGames.length
        : 0,
      bombsPlaced: 0,
      powerupsCollected: 0,
      eloChange: seasonGames.reduce((sum, g) => sum + (g.elo_change || 0), 0),
      achievementsUnlocked: 0,
    };

    const stats: PlayerStats = {
      playerId: profile.id,
      allTime: allTimeStats,
      season: seasonStats,
      weekly: weeklyStats,
      bestWinStreak: profile.best_win_streak || 0,
      currentWinStreak: profile.current_win_streak || 0,
      avgGameDuration: 180, // TODO: Calculate from games
      powerupStats: {}, // TODO: Add powerup tracking
    };

    const response: ApiResponse<PlayerStats> = {
      success: true,
      data: stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Player stats API error:', error);

    const errorResponse: ApiError = {
      success: false,
      code: 'STATS_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch player stats',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
