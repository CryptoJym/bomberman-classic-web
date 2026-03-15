/**
 * Player Rank API Route
 * GET /api/leaderboard/[userId] - Get specific player's rank info
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayerRank } from '@/lib/supabase/queries/leaderboard';
import type { ApiResponse, ApiError, LeaderboardEntry, RankTier } from '@/types/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      const errorResponse: ApiError = {
        success: false,
        code: 'INVALID_USER_ID',
        message: 'User ID is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createClient();

    // Fetch player's profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      const errorResponse: ApiError = {
        success: false,
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Type guard for profile
    const profile: {
      id: string;
      username: string;
      avatar_url: string | null;
      rank_tier: string;
      elo_rating: number;
      total_wins: number;
      total_games: number;
      win_rate: number;
      country_code: string | null;
    } = profileData;

    // Get player's rank information
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankInfo = await getPlayerRank(supabase as any, userId);

    // Build leaderboard entry
    const entry: LeaderboardEntry = {
      rank: rankInfo.globalRank,
      playerId: profile.id,
      username: profile.username,
      avatarUrl: profile.avatar_url ?? undefined,
      rankTier: profile.rank_tier as RankTier,
      value: profile.elo_rating,
      eloRating: profile.elo_rating,
      totalWins: profile.total_wins,
      totalGames: profile.total_games,
      winRate: profile.win_rate,
      country: profile.country_code ?? undefined,
    };

    const response: ApiResponse<{
      entry: LeaderboardEntry;
      globalRank: number;
      tierRank: number;
      percentile: number;
    }> = {
      success: true,
      data: {
        entry,
        globalRank: rankInfo.globalRank,
        tierRank: rankInfo.tierRank,
        percentile: rankInfo.percentile,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Player rank API error:', error);

    const errorResponse: ApiError = {
      success: false,
      code: 'RANK_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch player rank',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
