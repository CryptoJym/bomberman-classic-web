import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { RoomListItem } from '@/types/game';

/**
 * GET /api/rooms
 * List all available game rooms
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In a real implementation, this would fetch rooms from:
    // 1. Game server via HTTP API
    // 2. Database (cached room list)
    // 3. Redis (real-time room data)

    // For now, we'll return mock data
    // This should be replaced with actual game server communication
    const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:8080';

    try {
      const response = await fetch(`${gameServerUrl}/api/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms from game server');
      }

      const rooms: RoomListItem[] = await response.json();

      return NextResponse.json({
        rooms,
        count: rooms.length,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError) {
      console.error('Failed to fetch from game server:', fetchError);

      // Fallback to empty list if game server is unavailable
      return NextResponse.json({
        rooms: [],
        count: 0,
        timestamp: new Date().toISOString(),
        warning: 'Game server unavailable',
      });
    }
  } catch (error) {
    console.error('Error in GET /api/rooms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
