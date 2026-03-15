import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByClerkId, getPlayerGameHistory } from '@/lib/supabase/queries/profiles';
import type { GameSummary } from '@/types/api';

/**
 * GET /api/profile/history
 * Get match history with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const gameType = searchParams.get('gameType') as 'casual' | 'ranked' | 'tournament' | null;

    const supabase = await createClient();
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await getProfileByClerkId(supabase as any, userId);

    if (!profile) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch match history
    const offset = (page - 1) * limit;
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { games, total } = await getPlayerGameHistory(supabase as any, profile.id, {
      limit,
      offset,
      gameType: gameType || undefined,
    });

    // Map to GameSummary format
    const matches: GameSummary[] = games.map((game) => ({
      id: game.game_id,
      roomCode: '', // Not available in this query
      map: {
        id: '', // Not available
        name: game.map_name || 'Unknown Map',
        thumbnailUrl: undefined,
      },
      result: game.placement === 1 ? 'win' : game.placement === game.player_count ? 'loss' : 'loss',
      placement: game.placement || 0,
      totalPlayers: game.player_count,
      kills: game.kills,
      deaths: game.deaths,
      eloChange: game.elo_change,
      duration: 0, // Not available in this query
      rounds: 0, // Not available
      playedAt: game.played_at,
      hasReplay: false, // TODO: Check replays table
      players: [], // Not included in summary
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json(
      {
        success: true,
        data: {
          data: matches,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage,
            hasPreviousPage,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching match history:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
