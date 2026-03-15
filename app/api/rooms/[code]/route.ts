import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { RoomState } from '@/types/game';

/**
 * GET /api/rooms/[code]
 * Get details of a specific room
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const roomCode = params.code.toUpperCase();

    if (!roomCode || roomCode.length < 4) {
      return NextResponse.json(
        { error: 'Invalid room code' },
        { status: 400 }
      );
    }

    const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:8080';

    try {
      const response = await fetch(`${gameServerUrl}/api/rooms/${roomCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }

      if (!response.ok) {
        throw new Error('Failed to fetch room from game server');
      }

      const room: RoomState = await response.json();

      return NextResponse.json({
        room,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError) {
      console.error('Failed to fetch room from game server:', fetchError);

      return NextResponse.json(
        { error: 'Game server unavailable' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error(`Error in GET /api/rooms/[code]:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rooms/[code]
 * Request to join a room
 * Note: Actual join happens via WebSocket, this is for pre-validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const roomCode = params.code.toUpperCase();
    const body = await request.json();
    const { password } = body;

    if (!roomCode || roomCode.length < 4) {
      return NextResponse.json(
        { error: 'Invalid room code' },
        { status: 400 }
      );
    }

    const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:8080';

    try {
      // Validate join request with game server
      const response = await fetch(`${gameServerUrl}/api/rooms/${roomCode}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }

      if (response.status === 403) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.error || 'Cannot join room' },
          { status: 403 }
        );
      }

      if (!response.ok) {
        throw new Error('Failed to validate join request');
      }

      const result = await response.json();

      return NextResponse.json({
        canJoin: true,
        roomCode,
        ...result,
      });
    } catch (fetchError) {
      console.error('Failed to validate join with game server:', fetchError);

      return NextResponse.json(
        { error: 'Game server unavailable' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error(`Error in POST /api/rooms/[code]:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
