/**
 * Chat History API Route
 * Fetches chat message history with pagination
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/chat/history
 * Get chat message history with pagination
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const context = searchParams.get('context');
    const contextId = searchParams.get('contextId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200); // Max 200
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const before = searchParams.get('before'); // Timestamp
    const after = searchParams.get('after'); // Timestamp

    // Validate context
    if (!context) {
      return NextResponse.json({ error: 'Missing context parameter' }, { status: 400 });
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Type guard for profileData
    const profile: { id: string } = profileData;
    const profileId = profile.id;

    // Build query for total count
    let countQuery = supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true });

    // Build query for messages
    let messagesQuery = supabase
      .from('chat_messages')
      .select(
        `
        *,
        sender:profiles!sender_id (
          id,
          username,
          avatar_url
        )
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply context filter
    if (contextId) {
      countQuery = countQuery.eq('game_id', contextId);
      messagesQuery = messagesQuery.eq('game_id', contextId);
    } else {
      countQuery = countQuery.is('game_id', null); // Lobby chat
      messagesQuery = messagesQuery.is('game_id', null);
    }

    // Apply timestamp filters
    if (before) {
      const beforeDate = new Date(parseInt(before, 10)).toISOString();
      countQuery = countQuery.lt('created_at', beforeDate);
      messagesQuery = messagesQuery.lt('created_at', beforeDate);
    }
    if (after) {
      const afterDate = new Date(parseInt(after, 10)).toISOString();
      countQuery = countQuery.gt('created_at', afterDate);
      messagesQuery = messagesQuery.gt('created_at', afterDate);
    }

    // Execute queries
    const [{ count: totalCount, error: countError }, { data: messages, error: messagesError }] =
      await Promise.all([countQuery, messagesQuery]);

    if (countError) {
      console.error('Failed to count messages:', countError);
      return NextResponse.json({ error: 'Failed to count messages' }, { status: 500 });
    }

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Transform messages
    const transformedMessages = messages.map((msg: {
      id: string;
      sender_id: string;
      sender?: { username?: string; avatar_url?: string };
      content: string;
      type: string;
      created_at: string;
      is_deleted: boolean;
    }) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderUsername: msg.sender?.username || 'Unknown',
      senderAvatar: msg.sender?.avatar_url,
      content: msg.content,
      type: msg.type,
      timestamp: new Date(msg.created_at).getTime(),
      isOwnMessage: msg.sender_id === profileId,
      isDeleted: msg.is_deleted,
    }));

    // Return paginated response
    return NextResponse.json({
      messages: transformedMessages.reverse(), // Chronological order
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
