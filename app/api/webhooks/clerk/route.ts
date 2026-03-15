import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent, UserJSON, DeletedObjectJSON } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Clerk Webhook Handler
 *
 * Handles the following events:
 * - user.created: Creates a new profile in Supabase
 * - user.updated: Updates the profile in Supabase
 * - user.deleted: Deletes the profile from Supabase
 *
 * Requires CLERK_WEBHOOK_SECRET environment variable
 */
export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing Svix headers');
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return new Response('Error: Missing webhook secret', {
      status: 500,
    });
  }

  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', {
      status: 400,
    });
  }

  // Create Supabase admin client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const userData = evt.data as UserJSON;
        const result = await handleUserCreated(supabase, userData);
        if (!result.success) {
          return new Response(`Error: ${result.error}`, { status: 500 });
        }
        break;
      }

      case 'user.updated': {
        const userData = evt.data as UserJSON;
        const result = await handleUserUpdated(supabase, userData);
        if (!result.success) {
          return new Response(`Error: ${result.error}`, { status: 500 });
        }
        break;
      }

      case 'user.deleted': {
        const userData = evt.data as DeletedObjectJSON;
        if (userData.id) {
          const result = await handleUserDeleted(supabase, userData.id);
          if (!result.success) {
            return new Response(`Error: ${result.error}`, { status: 500 });
          }
        } else {
          console.error('User deleted event missing user ID');
        }
        break;
      }

      default:
        // Unhandled webhook event type
    }
  } catch (err) {
    console.error(`Error processing ${eventType} webhook:`, err);
    return new Response('Error: Database operation failed', { status: 500 });
  }

  return new Response('Webhook processed successfully', { status: 200 });
}

/**
 * Handle user.created webhook event
 * Creates a new profile in Supabase
 */
async function handleUserCreated(
  supabase: SupabaseClient,
  userData: UserJSON
): Promise<{ success: boolean; error?: string }> {
  const { id, username, first_name, last_name, image_url } = userData;

  const displayName =
    [first_name, last_name].filter(Boolean).join(' ') || username || 'Player';

  // Generate a unique username if not provided
  const finalUsername = username || `player_${id.slice(-8)}`;

  const { error } = await supabase.from('profiles').insert({
    clerk_id: id,
    username: finalUsername,
    display_name: displayName,
    avatar_url: image_url || null,
    elo_rating: 1000, // Starting ELO
    total_wins: 0,
    total_games: 0,
    total_kills: 0,
  });

  if (error) {
    // Check if it's a duplicate error (user might already exist)
    if (error.code === '23505') {
      return { success: true };
    }
    console.error('Error creating profile:', error);
    return { success: false, error: 'Failed to create profile' };
  }

  return { success: true };
}

/**
 * Handle user.updated webhook event
 * Updates the profile in Supabase
 */
async function handleUserUpdated(
  supabase: SupabaseClient,
  userData: UserJSON
): Promise<{ success: boolean; error?: string }> {
  const { id, username, first_name, last_name, image_url } = userData;

  const displayName =
    [first_name, last_name].filter(Boolean).join(' ') || username || undefined;

  // Build update object with only defined fields
  const updateData: Record<string, string | null | undefined> = {};

  if (username !== undefined && username !== null) {
    updateData.username = username;
  }
  if (displayName !== undefined) {
    updateData.display_name = displayName;
  }
  if (image_url !== undefined) {
    updateData.avatar_url = image_url || null;
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('clerk_id', id);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }

  return { success: true };
}

/**
 * Handle user.deleted webhook event
 * Deletes the profile from Supabase
 */
async function handleUserDeleted(
  supabase: SupabaseClient,
  clerkId: string
): Promise<{ success: boolean; error?: string }> {
  // Hard delete the profile
  // Note: Consider soft delete if you need to preserve game history
  const { error } = await supabase.from('profiles').delete().eq('clerk_id', clerkId);

  if (error) {
    console.error('Error deleting profile:', error);
    return { success: false, error: 'Failed to delete profile' };
  }

  return { success: true };
}
