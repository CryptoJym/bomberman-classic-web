/**
 * Chat API Route
 * Handles sending and receiving chat messages
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { processMessage } from '@/lib/chat/filter';
import type { SendMessagePayload } from '@/types/chat';

/**
 * POST /api/chat
 * Send a chat message
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json()) as SendMessagePayload;
    const { content, type, context, contextId } = body;

    // Validate input
    if (!content || !type || !context) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process and validate message
    const processed = processMessage(content);
    if (!processed.valid) {
      return NextResponse.json({ error: processed.error }, { status: 400 });
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('clerk_id', clerkId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Type guard for profile
    const profile: { id: string; username: string } = profileData;

    // Check if user is muted (if in a game context)
    if (contextId) {
      // TODO: Check mute status from game/room state
      // For now, we'll skip this check
    }

    // Insert message into database
    // Note: Using type assertion to work around TypeScript control flow analysis issue
    // where early returns narrow the supabase client type incorrectly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messageData, error: insertError } = await (supabase.from('chat_messages') as any)
      .insert({
        sender_id: profile.id,
        content: processed.sanitized!,
        message_type: type,
        game_id: contextId || null,
      })
      .select()
      .single();

    if (insertError || !messageData) {
      console.error('Failed to insert message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Type guard for message
    const message: {
      id: string;
      sender_id: string;
      content: string;
      message_type: string;
      created_at: string;
    } = messageData;

    // Return success
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.sender_id,
        senderUsername: profile.username,
        content: message.content,
        type: message.message_type,
        timestamp: new Date(message.created_at).getTime(),
        isOwnMessage: true,
      },
      hadProfanity: processed.hadProfanity || false,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/chat
 * Get chat messages (for initial load or history)
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before');
    const after = searchParams.get('after');

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

    // Type guard for profile
    const profile: { id: string } = profileData;

    // Build query
    let query = supabase
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
      .limit(limit);

    // Filter by context
    if (contextId) {
      query = query.eq('game_id', contextId);
    } else {
      query = query.is('game_id', null); // Lobby chat
    }

    // Filter by timestamp
    if (before) {
      query = query.lt('created_at', new Date(parseInt(before, 10)).toISOString());
    }
    if (after) {
      query = query.gt('created_at', new Date(parseInt(after, 10)).toISOString());
    }

    const { data: messages, error: queryError } = await query;

    if (queryError) {
      console.error('Failed to fetch messages:', queryError);
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
      isOwnMessage: msg.sender_id === profile.id,
      isDeleted: msg.is_deleted,
    }));

    // Return messages (reverse to get chronological order)
    return NextResponse.json({
      messages: transformedMessages.reverse(),
      hasMore: messages.length === limit,
      total: messages.length,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
