/**
 * Chat Types for Bomberman Online
 * Defines types for the chat system
 */

import type { ChatMessageType } from './database';
import type { QuickChatMessage } from '@/lib/chat/quickChat';
import type { Emote } from '@/lib/chat/emotes';

/**
 * Chat context types
 */
export type ChatContext = 'lobby' | 'room' | 'game' | 'private';

/**
 * Chat message display data
 */
export interface ChatMessageDisplay {
  /** Message ID */
  id: string;
  /** Sender ID */
  senderId: string;
  /** Sender username */
  senderUsername: string;
  /** Sender avatar URL */
  senderAvatar?: string;
  /** Message content */
  content: string;
  /** Message type */
  type: ChatMessageType;
  /** Timestamp */
  timestamp: number;
  /** Whether this is the current user's message */
  isOwnMessage: boolean;
  /** Whether user is muted */
  isMuted?: boolean;
  /** Whether message is deleted */
  isDeleted?: boolean;
}

/**
 * System message types
 */
export type SystemMessageType =
  | 'player_joined'
  | 'player_left'
  | 'player_kicked'
  | 'game_starting'
  | 'game_started'
  | 'game_ended'
  | 'round_start'
  | 'round_end'
  | 'player_ready'
  | 'player_not_ready'
  | 'settings_changed'
  | 'host_changed'
  | 'player_muted'
  | 'player_unmuted';

/**
 * System message
 */
export interface SystemMessage {
  type: 'system';
  messageType: SystemMessageType;
  content: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Chat notification
 */
export interface ChatNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: 'mention' | 'dm' | 'system';
  /** Message preview */
  preview: string;
  /** Sender username */
  senderUsername?: string;
  /** Timestamp */
  timestamp: number;
  /** Whether read */
  isRead: boolean;
}

/**
 * Muted user info
 */
export interface MutedUser {
  /** User ID */
  userId: string;
  /** Username */
  username: string;
  /** Mute reason */
  reason?: string;
  /** Muted by (host/admin ID) */
  mutedBy: string;
  /** Mute timestamp */
  mutedAt: number;
  /** Mute duration (ms, null = permanent) */
  duration: number | null;
  /** Unmute timestamp (null = permanent) */
  unmuteAt: number | null;
}

/**
 * Chat report
 */
export interface ChatReport {
  /** Report ID */
  id: string;
  /** Reported message ID */
  messageId: string;
  /** Reported user ID */
  reportedUserId: string;
  /** Reporter user ID */
  reporterId: string;
  /** Report reason */
  reason: ChatReportReason;
  /** Additional details */
  details?: string;
  /** Report timestamp */
  timestamp: number;
}

export type ChatReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate'
  | 'other';

/**
 * Chat settings
 */
export interface ChatSettings {
  /** Show timestamps */
  showTimestamps: boolean;
  /** Show system messages */
  showSystemMessages: boolean;
  /** Enable sound notifications */
  soundNotifications: boolean;
  /** Enable desktop notifications */
  desktopNotifications: boolean;
  /** Chat font size */
  fontSize: 'small' | 'medium' | 'large';
  /** Profanity filter */
  profanityFilter: boolean;
  /** Show emojis */
  showEmojis: boolean;
}

/**
 * Chat state
 */
export interface ChatState {
  /** All messages */
  messages: ChatMessageDisplay[];
  /** System messages */
  systemMessages: SystemMessage[];
  /** Muted users */
  mutedUsers: MutedUser[];
  /** Whether chat is connected */
  isConnected: boolean;
  /** Whether loading history */
  isLoadingHistory: boolean;
  /** Whether sending message */
  isSending: boolean;
  /** Current context */
  context: ChatContext;
  /** Context ID (room ID, game ID, etc.) */
  contextId?: string;
  /** Unread count */
  unreadCount: number;
  /** Last read timestamp */
  lastReadAt: number;
}

/**
 * Send message payload
 */
export interface SendMessagePayload {
  /** Message content */
  content: string;
  /** Message type */
  type: ChatMessageType;
  /** Context */
  context: ChatContext;
  /** Context ID */
  contextId?: string;
  /** Quick chat ID (if quick chat) */
  quickChatId?: string;
  /** Emote ID (if emote) */
  emoteId?: string;
}

/**
 * Chat history request
 */
export interface ChatHistoryRequest {
  /** Context */
  context: ChatContext;
  /** Context ID */
  contextId?: string;
  /** Limit */
  limit?: number;
  /** Before timestamp */
  before?: number;
  /** After timestamp */
  after?: number;
}

/**
 * Chat history response
 */
export interface ChatHistoryResponse {
  messages: ChatMessageDisplay[];
  hasMore: boolean;
  total: number;
}
