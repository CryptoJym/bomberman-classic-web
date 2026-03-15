/**
 * useChat Hook
 * Manages chat state and actions
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ChatState,
  ChatMessageDisplay,
  SystemMessage,
  SendMessagePayload,
  MutedUser,
  ChatReportReason,
} from '@/types/chat';
import { processMessage, MessageRateLimiter } from '@/lib/chat/filter';
import { executeCommand, type CommandContext } from '@/lib/chat/commands';

export interface UseChatOptions {
  /** Initial context */
  context: ChatState['context'];
  /** Initial context ID */
  contextId?: string;
  /** Current user ID */
  userId: string;
  /** Current username */
  username: string;
  /** Whether user is host */
  isHost?: boolean;
  /** Whether user is admin */
  isAdmin?: boolean;
}

export interface UseChatReturn {
  /** Chat state */
  state: ChatState;
  /** Send a message */
  sendMessage: (content: string, type?: 'text' | 'emoji' | 'quick_chat') => Promise<void>;
  /** Add a message */
  addMessage: (message: ChatMessageDisplay) => void;
  /** Add a system message */
  addSystemMessage: (message: SystemMessage) => void;
  /** Clear messages */
  clearMessages: () => void;
  /** Mark as read */
  markAsRead: () => void;
  /** Mute user */
  muteUser: (userId: string, duration: number | null) => void;
  /** Unmute user */
  unmuteUser: (userId: string) => void;
  /** Check if user is muted */
  isUserMuted: (userId: string) => boolean;
  /** Delete message */
  deleteMessage: (messageId: string) => void;
  /** Report message */
  reportMessage: (messageId: string, reason: ChatReportReason, details?: string) => Promise<void>;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { context, contextId, userId, username, isHost = false, isAdmin = false } = options;

  const rateLimiterRef = useRef(new MessageRateLimiter());

  const [state, setState] = useState<ChatState>({
    messages: [],
    systemMessages: [],
    mutedUsers: [],
    isConnected: false,
    isLoadingHistory: false,
    isSending: false,
    context,
    contextId,
    unreadCount: 0,
    lastReadAt: Date.now(),
  });

  /**
   * Add a message to the chat
   */
  const addMessage = useCallback((message: ChatMessageDisplay) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      unreadCount: message.isOwnMessage ? prev.unreadCount : prev.unreadCount + 1,
    }));
  }, []);

  /**
   * Add a system message
   */
  const addSystemMessage = useCallback((message: SystemMessage) => {
    setState(prev => ({
      ...prev,
      systemMessages: [...prev.systemMessages, message],
    }));
  }, []);

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (content: string, type: 'text' | 'emoji' | 'quick_chat' = 'text') => {
      // Check rate limit
      const rateLimitCheck = rateLimiterRef.current.canSendMessage(userId, content);
      if (!rateLimitCheck.allowed) {
        addSystemMessage({
          type: 'system',
          messageType: 'player_muted',
          content: rateLimitCheck.reason || 'Rate limited',
          timestamp: Date.now(),
        });
        return;
      }

      setState(prev => ({ ...prev, isSending: true }));

      try {
        // Check if it's a command
        const commandContext: CommandContext = {
          userId,
          username,
          roomId: contextId,
          isHost,
          isAdmin,
        };

        const commandResult = executeCommand(content, commandContext);

        if (commandResult) {
          // Handle command
          if (commandResult.success) {
            if (commandResult.action?.type === 'clear') {
              // Clear local chat
              setState(prev => ({
                ...prev,
                messages: [],
                systemMessages: [],
              }));
            } else {
              // Add command result as system message or regular message
              if (commandResult.isSystemMessage) {
                addSystemMessage({
                  type: 'system',
                  messageType: 'player_muted', // Generic type for commands
                  content: commandResult.message,
                  timestamp: Date.now(),
                });
              } else {
                addMessage({
                  id: `cmd-${Date.now()}`,
                  senderId: userId,
                  senderUsername: username,
                  content: commandResult.message,
                  type: 'text',
                  timestamp: Date.now(),
                  isOwnMessage: true,
                });
              }
            }
          } else {
            // Show error
            addSystemMessage({
              type: 'system',
              messageType: 'player_muted',
              content: commandResult.message,
              timestamp: Date.now(),
            });
          }
          setState(prev => ({ ...prev, isSending: false }));
          return;
        }

        // Process regular message
        const processed = processMessage(content);
        if (!processed.valid) {
          addSystemMessage({
            type: 'system',
            messageType: 'player_muted',
            content: processed.error || 'Invalid message',
            timestamp: Date.now(),
          });
          setState(prev => ({ ...prev, isSending: false }));
          return;
        }

        // Record message in rate limiter
        rateLimiterRef.current.recordMessage(userId, content);

        // Create message payload
        const payload: SendMessagePayload = {
          content: processed.sanitized || content,
          type: type === 'text' ? 'text' : type === 'emoji' ? 'emoji' : 'quick_chat',
          context,
          contextId,
        };

        // Send to server (this should be replaced with actual API call)
        // For now, just add to local state
        const newMessage: ChatMessageDisplay = {
          id: `local-${Date.now()}`,
          senderId: userId,
          senderUsername: username,
          content: payload.content,
          type: payload.type,
          timestamp: Date.now(),
          isOwnMessage: true,
        };

        addMessage(newMessage);

        // Show warning if profanity was detected
        if (processed.hadProfanity) {
          addSystemMessage({
            type: 'system',
            messageType: 'player_muted',
            content: 'Your message contained filtered words.',
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        addSystemMessage({
          type: 'system',
          messageType: 'player_muted',
          content: 'Failed to send message. Please try again.',
          timestamp: Date.now(),
        });
      } finally {
        setState(prev => ({ ...prev, isSending: false }));
      }
    },
    [userId, username, context, contextId, isHost, isAdmin, addMessage, addSystemMessage]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      systemMessages: [],
      unreadCount: 0,
    }));
  }, []);

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      unreadCount: 0,
      lastReadAt: Date.now(),
    }));
  }, []);

  /**
   * Mute a user
   */
  const muteUser = useCallback((mutedUserId: string, duration: number | null) => {
    const now = Date.now();
    const mutedUser: MutedUser = {
      userId: mutedUserId,
      username: '', // Should be fetched from context
      reason: 'Muted by host',
      mutedBy: userId,
      mutedAt: now,
      duration,
      unmuteAt: duration ? now + duration : null,
    };

    setState(prev => ({
      ...prev,
      mutedUsers: [...prev.mutedUsers, mutedUser],
    }));

    addSystemMessage({
      type: 'system',
      messageType: 'player_muted',
      content: `User has been muted ${duration ? `for ${Math.round(duration / 60000)} minutes` : 'permanently'}`,
      timestamp: now,
    });
  }, [userId, addSystemMessage]);

  /**
   * Unmute a user
   */
  const unmuteUser = useCallback((mutedUserId: string) => {
    setState(prev => ({
      ...prev,
      mutedUsers: prev.mutedUsers.filter(u => u.userId !== mutedUserId),
    }));

    addSystemMessage({
      type: 'system',
      messageType: 'player_unmuted',
      content: 'User has been unmuted',
      timestamp: Date.now(),
    });
  }, [addSystemMessage]);

  /**
   * Check if user is muted
   */
  const isUserMuted = useCallback(
    (checkUserId: string) => {
      const now = Date.now();
      return state.mutedUsers.some(u => {
        if (u.userId !== checkUserId) {
          return false;
        }
        if (u.unmuteAt === null) {
          return true; // Permanent mute
        }
        return u.unmuteAt > now; // Still within mute duration
      });
    },
    [state.mutedUsers]
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, isDeleted: true, content: '[Deleted]' } : msg
      ),
    }));
  }, []);

  /**
   * Report a message
   */
  const reportMessage = useCallback(
    async (_messageId: string, _reason: ChatReportReason, _details?: string) => {
      try {
        // Send report to server (replace with actual API call)
        // Reporting message (removed console.log)

        addSystemMessage({
          type: 'system',
          messageType: 'player_muted',
          content: 'Message reported. Thank you for helping keep the community safe.',
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Failed to report message:', error);
        addSystemMessage({
          type: 'system',
          messageType: 'player_muted',
          content: 'Failed to report message. Please try again.',
          timestamp: Date.now(),
        });
      }
    },
    [addSystemMessage]
  );

  return {
    state,
    sendMessage,
    addMessage,
    addSystemMessage,
    clearMessages,
    markAsRead,
    muteUser,
    unmuteUser,
    isUserMuted,
    deleteMessage,
    reportMessage,
  };
}
