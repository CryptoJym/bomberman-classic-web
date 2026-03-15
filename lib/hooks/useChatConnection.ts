/**
 * useChatConnection Hook
 * Manages real-time chat connection via Supabase Realtime
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ChatMessageDisplay, ChatContext } from '@/types/chat';

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];

export interface UseChatConnectionOptions {
  /** Chat context */
  context: ChatContext;
  /** Context ID (room ID, game ID, etc.) */
  contextId?: string;
  /** Current user ID */
  userId: string;
  /** Whether to auto-connect */
  autoConnect?: boolean;
  /** On message received */
  onMessageReceived?: (message: ChatMessageDisplay) => void;
  /** On connection state change */
  onConnectionChange?: (connected: boolean) => void;
  /** On error */
  onError?: (error: Error) => void;
}

export interface UseChatConnectionReturn {
  /** Whether connected */
  isConnected: boolean;
  /** Connect to chat */
  connect: () => void;
  /** Disconnect from chat */
  disconnect: () => void;
  /** Send a message */
  sendMessage: (content: string, type: 'text' | 'emoji' | 'quick_chat') => Promise<void>;
}

export function useChatConnection(
  options: UseChatConnectionOptions
): UseChatConnectionReturn {
  const {
    context,
    contextId,
    userId,
    autoConnect = true,
    onMessageReceived,
    onConnectionChange,
    onError,
  } = options;

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  /**
   * Convert database row to display message
   */
  const convertToDisplayMessage = useCallback(
    (row: ChatMessageRow): ChatMessageDisplay => ({
      id: row.id,
      senderId: row.sender_id,
      senderUsername: '', // Should be joined from profiles table
      content: row.content,
      type: row.message_type,
      timestamp: new Date(row.created_at).getTime(),
      isOwnMessage: row.sender_id === userId,
      isDeleted: row.is_deleted,
    }),
    [userId]
  );

  /**
   * Connect to chat channel
   */
  const connect = useCallback(() => {
    if (channelRef.current) {
      console.warn('Already connected to chat');
      return;
    }

    // Build channel name based on context
    const channelName = contextId
      ? `chat:${context}:${contextId}`
      : `chat:${context}`;

    const channel = supabase.channel(channelName);

    // Subscribe to new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: contextId ? `game_id=eq.${contextId}` : undefined,
      },
      (payload) => {
        const message = convertToDisplayMessage(payload.new as ChatMessageRow);
        onMessageReceived?.(message);
      }
    );

    // Subscribe to message updates (deletions)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: contextId ? `game_id=eq.${contextId}` : undefined,
      },
      (payload) => {
        const message = convertToDisplayMessage(payload.new as ChatMessageRow);
        if (message.isDeleted) {
          onMessageReceived?.(message);
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnectedRef.current = true;
        onConnectionChange?.(true);
        console.log(`Connected to chat: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        isConnectedRef.current = false;
        onConnectionChange?.(false);
        onError?.(new Error('Failed to connect to chat'));
      } else if (status === 'TIMED_OUT') {
        isConnectedRef.current = false;
        onConnectionChange?.(false);
        onError?.(new Error('Chat connection timed out'));
      }
    });

    channelRef.current = channel;
  }, [
    context,
    contextId,
    supabase,
    convertToDisplayMessage,
    onMessageReceived,
    onConnectionChange,
    onError,
  ]);

  /**
   * Disconnect from chat channel
   */
  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
      onConnectionChange?.(false);
      console.log('Disconnected from chat');
    }
  }, [supabase, onConnectionChange]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (content: string, type: 'text' | 'emoji' | 'quick_chat' = 'text') => {
      try {
        type ChatInsert = Database['public']['Tables']['chat_messages']['Insert'];
        const insertData: ChatInsert = {
          sender_id: userId,
          content,
          message_type: type,
          game_id: contextId || null,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('chat_messages').insert(insertData);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        onError?.(error as Error);
        throw error;
      }
    },
    [supabase, userId, contextId, onError]
  );

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * Reconnect when context changes
   */
  useEffect(() => {
    if (isConnectedRef.current) {
      disconnect().then(() => {
        connect();
      });
    }
  }, [context, contextId, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    sendMessage,
  };
}
