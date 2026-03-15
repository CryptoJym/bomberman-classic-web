import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByClerkId, updateProfile } from '@/lib/supabase/queries/profiles';
import type { UpdateProfileRequest } from '@/types/api';

/**
 * GET /api/profile
 * Get the current user's profile
 */
export async function GET() {
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

    // Profile from getProfileByClerkId is already in API format with derived fields
    // Just add the inGame field which requires runtime check
    const profileResponse = {
      ...profile,
      inGame: false, // TODO: Determine from active game sessions
    };

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

/**
 * PATCH /api/profile
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body: UpdateProfileRequest = await request.json();
    const supabase = await createClient();

    // Get current profile
    // Type cast needed because server client type differs from browser client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentProfile = await getProfileByClerkId(supabase as any, userId);
    if (!currentProfile) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Map API fields to database fields
    const updates: Record<string, unknown> = {};

    if (body.displayName !== undefined) {
      updates.display_name = body.displayName;
    }
    if (body.bio !== undefined) {
      updates.bio = body.bio;
    }
    if (body.country !== undefined) {
      updates.country_code = body.country;
    }
    if (body.preferredColor !== undefined) {
      updates.preferred_color = body.preferredColor;
    }
    // TODO: Handle settings when settings table is implemented
    // if (body.settings) {
    //   updates.settings = {
    //     ...currentProfile.settings,
    //     ...body.settings,
    //   };
    // }

    // Update profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedProfile = await updateProfile(supabase as any, currentProfile.id, updates);

    // Profile from updateProfile is already in API format with derived fields
    // Just add the inGame field which requires runtime check
    const profileResponse = {
      ...updatedProfile,
      inGame: false, // TODO: Determine from active game sessions
    };

    return NextResponse.json(
      { success: true, data: profileResponse, message: 'Profile updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
