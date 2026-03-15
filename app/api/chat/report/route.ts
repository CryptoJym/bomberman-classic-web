/**
 * Chat Report API Route
 * Handles reporting inappropriate chat messages
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import type { ChatReportReason } from '@/types/chat';

interface ReportRequest {
  messageId: string;
  reason: ChatReportReason;
  details?: string;
}

/**
 * POST /api/chat/report
 * Report a chat message
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json()) as ReportRequest;
    const { messageId, reason, details } = body;

    // Validate input
    if (!messageId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate reason
    const validReasons: ChatReportReason[] = [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
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

    // Check if message exists
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Type guard for message
    const message: { id: string; sender_id: string; content: string } = messageData;

    // Prevent self-reporting
    if (message.sender_id === profile.id) {
      return NextResponse.json({ error: 'Cannot report your own message' }, { status: 400 });
    }

    // Check for duplicate reports (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingReport, error: duplicateError } = await supabase
      .from('chat_reports')
      .select('id')
      .eq('message_id', messageId)
      .eq('reporter_id', profile.id)
      .gte('created_at', oneDayAgo)
      .maybeSingle();

    if (duplicateError) {
      console.error('Failed to check for duplicate reports:', duplicateError);
    }

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this message' },
        { status: 409 }
      );
    }

    // Insert report
    // Note: chat_reports table doesn't exist in current schema - needs migration
    // TODO: Add chat_reports table to database schema and regenerate types
    // Using type assertion to bypass missing table type
    const reportQuery = supabase.from('chat_reports');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: report, error: insertError } = await (reportQuery as any)
      .insert({
        message_id: messageId,
        reported_user_id: message.sender_id,
        reporter_id: profile.id,
        reason,
        details: details || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert report:', insertError);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // TODO: Implement auto-moderation logic
    // - Count reports for this message
    // - If threshold exceeded, auto-hide message or mute user
    // - Notify moderators

    // Return success
    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully. Thank you for helping keep the community safe.',
    });
  } catch (error) {
    console.error('Chat report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/chat/report
 * Get reports for moderation (admin/host only)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get user profile and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('clerk_id', clerkId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // TODO: Add proper admin check
    // For now, we'll allow any authenticated user (should be restricted to admins)
    // if (!profile.is_admin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || 'pending';

    // Fetch reports
    const { data: reports, error: reportsError } = await supabase
      .from('chat_reports')
      .select(
        `
        *,
        message:chat_messages!message_id (
          id,
          content,
          type,
          created_at
        ),
        reported_user:profiles!reported_user_id (
          id,
          username,
          avatar_url
        ),
        reporter:profiles!reporter_id (
          id,
          username
        )
      `
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reportsError) {
      console.error('Failed to fetch reports:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Transform reports
    const transformedReports = reports.map((report: {
      id: string;
      message_id: string;
      message?: { content?: string; type?: string; created_at?: string };
      reported_user_id: string;
      reported_user?: { username?: string; avatar_url?: string };
      reporter_id: string;
      reporter?: { username?: string };
      reason: string;
      details: string | null;
      status: string;
      created_at: string;
    }) => ({
      id: report.id,
      messageId: report.message_id,
      messageContent: report.message?.content,
      messageType: report.message?.type,
      messageTimestamp: report.message?.created_at ? new Date(report.message.created_at).getTime() : 0,
      reportedUserId: report.reported_user_id,
      reportedUsername: report.reported_user?.username,
      reporterId: report.reporter_id,
      reporterUsername: report.reporter?.username,
      reason: report.reason,
      details: report.details,
      status: report.status,
      timestamp: new Date(report.created_at).getTime(),
    }));

    return NextResponse.json({
      reports: transformedReports,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Chat report GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
