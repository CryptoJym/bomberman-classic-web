/**
 * Leaderboard API Route
 * GET /api/leaderboard - Get leaderboard with filters
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLeaderboard, type LeaderboardOptions } from '@/lib/supabase/queries/leaderboard';
import type { LeaderboardResponse, LeaderboardType, LeaderboardTimeFilter, ApiResponse, ApiError, RankTier } from '@/types/api';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const type = (searchParams.get('type') || 'elo') as LeaderboardType;
    const timeFilter = (searchParams.get('timeFilter') || 'all_time') as LeaderboardTimeFilter;
    const rankTier = searchParams.get('rankTier') || undefined;
    const country = searchParams.get('country') || undefined;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Map leaderboard type to sort column
    const sortByMap: Record<LeaderboardType, LeaderboardOptions['sortBy']> = {
      elo: 'elo_rating',
      wins: 'total_wins',
      kills: 'total_kills',
      games: 'total_games' as LeaderboardOptions['sortBy'], // Not in original type but we'll add it
      win_streak: 'win_rate', // Approximate with win_rate for now
    };

    const sortBy = sortByMap[type];

    // Create Supabase client
    const supabase = await createClient();

    // Fetch leaderboard data
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { entries: dbEntries, total } = await getLeaderboard(supabase as any, {
      limit,
      offset,
      timeFilter,
      sortBy,
      rankTier: rankTier as LeaderboardOptions['rankTier'],
      countryCode: country,
    });

    // Transform database entries to API format
    const entries = dbEntries.map((entry) => ({
      rank: entry.rank,
      playerId: entry.player_id,
      username: entry.username,
      avatarUrl: entry.avatar_url ?? undefined,
      rankTier: entry.rank_tier,
      value: entry[sortBy as string as keyof typeof entry] as number || entry.elo_rating,
      eloRating: entry.elo_rating,
      totalWins: entry.total_wins,
      totalGames: entry.total_games,
      winRate: entry.win_rate,
      country: entry.country_code ?? undefined,
    }));

    // Get current user's entry if authenticated
    const { userId } = await auth();
    let currentUserEntry = undefined;

    if (userId) {
      try {
        // Fetch user's profile to get their stats
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('clerk_id', userId)
          .single();

        if (!profileError && profileData) {
          // Type guard for profile
          const profile: {
            id: string;
            username: string;
            avatar_url: string | null;
            rank_tier: string;
            elo_rating: number;
            total_wins: number;
            total_kills: number;
            total_games: number;
            win_rate: number;
            country_code: string | null;
          } = profileData;

          // Get user's rank
          // Type cast needed because server client RPC types don't match runtime
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rankData } = await (supabase as any).rpc('get_player_rank', {
            player_uuid: profile.id,
          });

          if (rankData) {
            // Get the value based on sortBy
            // Type cast needed because sortBy can include values not in LeaderboardOptions type
            const getValue = () => {
              switch (sortBy as string) {
                case 'elo_rating':
                  return profile.elo_rating;
                case 'total_wins':
                  return profile.total_wins;
                case 'total_kills':
                  return profile.total_kills;
                case 'total_games':
                  return profile.total_games;
                case 'win_rate':
                  return profile.win_rate;
                default:
                  return profile.elo_rating;
              }
            };

            currentUserEntry = {
              rank: rankData.global_rank,
              playerId: profile.id,
              username: profile.username,
              avatarUrl: profile.avatar_url ?? undefined,
              rankTier: profile.rank_tier as RankTier,
              value: getValue(),
              eloRating: profile.elo_rating,
              totalWins: profile.total_wins,
              totalGames: profile.total_games,
              winRate: profile.win_rate,
              country: profile.country_code ?? undefined,
            };
          }
        }
      } catch (err) {
        console.error('Error fetching current user entry:', err);
        // Non-fatal, continue without user entry
      }
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<LeaderboardResponse> = {
      success: true,
      data: {
        type,
        timeFilter,
        entries,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        currentUserEntry,
        lastUpdated: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Leaderboard API error:', error);

    const errorResponse: ApiError = {
      success: false,
      code: 'LEADERBOARD_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
