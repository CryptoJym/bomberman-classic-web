import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/supabase/queries/profiles';

/**
 * GET /api/profile/[userId]
 * Get another user's profile
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    const { userId: targetUserId } = await params;

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await getProfile(supabase as any, targetUserId);

    if (!profile) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Profile not found' },
        { status: 404 }
      );
    }

    // TODO: Check privacy settings when settings table is implemented
    // For now, all profiles are public

    // Profile from getProfile is already in API format with derived fields
    // Just return it directly
    const profileResponse = profile;

    return NextResponse.json(
      { success: true, data: profileResponse },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
