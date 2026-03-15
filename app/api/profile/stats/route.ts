import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByClerkId } from '@/lib/supabase/queries/profiles';
import type { PlayerStats } from '@/types/api';

/**
 * GET /api/profile/stats
 * Get detailed player statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

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

    // Calculate all-time stats
    const allTimeWinRate =
      profile.totalGames > 0
        ? Math.round((profile.totalWins / profile.totalGames) * 100 * 100) / 100
        : 0;

    const allTimeKdRatio =
      profile.totalDeaths > 0
        ? Math.round((profile.totalKills / profile.totalDeaths) * 100) / 100
        : profile.totalKills;

    const avgKillsPerGame =
      profile.totalGames > 0
        ? Math.round((profile.totalKills / profile.totalGames) * 100) / 100
        : 0;

    // TODO: Calculate time-based stats from game_players table
    // For now, using placeholder data
    const stats: PlayerStats = {
      playerId: profile.id,
      allTime: {
        games: profile.totalGames,
        wins: profile.totalWins,
        losses: profile.totalGames - profile.totalWins,
        kills: profile.totalKills,
        deaths: profile.totalDeaths,
        winRate: allTimeWinRate,
        kdRatio: allTimeKdRatio,
        avgKillsPerGame,
        bombsPlaced: 0, // TODO: Query from profiles.total_bombs_placed
        powerupsCollected: 0, // TODO: Query from profiles.total_powerups_collected,
        eloChange: 0, // All-time ELO change
        achievementsUnlocked: 0, // TODO: Count from achievements
      },
      season: {
        games: 0, // TODO: Calculate from current season
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        winRate: 0,
        kdRatio: 0,
        avgKillsPerGame: 0,
        bombsPlaced: 0,
        powerupsCollected: 0,
        eloChange: 0,
        achievementsUnlocked: 0,
      },
      weekly: {
        games: 0, // TODO: Calculate from last 7 days
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        winRate: 0,
        kdRatio: 0,
        avgKillsPerGame: 0,
        bombsPlaced: 0,
        powerupsCollected: 0,
        eloChange: 0,
        achievementsUnlocked: 0,
      },
      bestWinStreak: 0, // TODO: Query from profiles.best_win_streak
      currentWinStreak: 0, // TODO: Query from profiles.current_win_streak
      avgGameDuration: 300, // TODO: Calculate from game history
      powerupStats: {
        // TODO: Calculate from game history
        bomb: 0,
        fire: 0,
        speed: 0,
        kick: 0,
        punch: 0,
      },
    };

    return NextResponse.json(
      { success: true, data: stats },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
