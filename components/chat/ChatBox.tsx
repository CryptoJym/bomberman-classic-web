'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { EmojiPicker } from './EmojiPicker';
import { QuickChat } from './QuickChat';
import { ChatModeration } from './ChatModeration';
import type { ChatMessageDisplay, ChatContext, SystemMessage } from '@/types/chat';
import type { QuickChatMessage } from '@/lib/chat/quickChat';

export interface ChatBoxProps {
  /** Chat context */
  context: ChatContext;
  /** Context ID (room ID, game ID, etc.) */
  contextId?: string;
  /** Messages */
  messages: ChatMessageDisplay[];
  /** System messages */
  systemMessages?: SystemMessage[];
  /** Whether connected */
  isConnected: boolean;
  /** Whether loading */
  isLoading?: boolean;
  /** Whether sending */
  isSending?: boolean;
  /** Current user ID */
  currentUserId: string;
  /** Whether current user is host */
  isHost?: boolean;
  /** Unread count */
  unreadCount?: number;
  /** Unlocked achievements */
  unlockedAchievements?: string[];
  /** On send message */
  onSendMessage: (content: string, type: 'text' | 'emoji' | 'quick_chat') => void;
  /** On load more */
  onLoadMore?: () => void;
  /** On mute user */
  onMuteUser?: (userId: string, duration: number | null) => void;
  /** On unmute user */
  onUnmuteUser?: (userId: string) => void;
  /** On report message */
  onReportMessage?: (messageId: string, reason: string, details?: string) => void;
  /** On delete message */
  onDeleteMessage?: (messageId: string) => void;
  /** Show header */
  showHeader?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom height */
  height?: string;
}

export function ChatBox({
  context,
  contextId: _contextId,
  messages,
  systemMessages = [],
  isConnected,
  isLoading = false,
  isSending = false,
  currentUserId: _currentUserId,
  isHost = false,
  unreadCount = 0,
  unlockedAchievements = [],
  onSendMessage,
  onLoadMore,
  onMuteUser,
  onUnmuteUser,
  onReportMessage,
  onDeleteMessage,
  showHeader = true,
  compact = false,
  height = '600px',
}: ChatBoxProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [moderationMessage, setModerationMessage] = useState<ChatMessageDisplay>();

  const handleSendMessage = (content: string) => {
    onSendMessage(content, 'text');
  };

  const handleSelectEmoji = (emoji: string) => {
    onSendMessage(emoji, 'emoji');
  };

  const handleSelectQuickChat = (message: QuickChatMessage) => {
    onSendMessage(message.text, 'quick_chat');
  };

  const handleMessageClick = (message: ChatMessageDisplay) => {
    if (message.isOwnMessage) {
      return;
    }
    setModerationMessage(message);
  };

  const contextLabel = {
    lobby: 'Lobby Chat',
    room: 'Room Chat',
    game: 'Game Chat',
    private: 'Private Message',
  }[context];

  return (
    <>
      <Card
        className={cn(
          'flex flex-col overflow-hidden',
          compact && 'border-game-wall/50'
        )}
        style={{ height }}
      >
        {showHeader && (
          <div className="flex items-center justify-between p-3 bg-retro-dark border-b-2 border-game-wall">
            <div className="flex items-center gap-2">
              <h3 className="font-pixel text-sm uppercase text-white">
                {contextLabel}
              </h3>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-bomber-green' : 'bg-bomber-red'
                )}
                title={isConnected ? 'Connected' : 'Disconnected'}
              />
              {unreadCount > 0 && (
                <Badge variant="danger" size="sm">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <div className="font-retro text-xs text-gray-500">
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ChatMessages
            messages={messages}
            systemMessages={systemMessages}
            isLoading={isLoading}
            showTimestamps={!compact}
            showAvatars={!compact}
            compact={compact}
            autoScroll
            onMessageClick={handleMessageClick}
            onLoadMore={onLoadMore}
            maxHeight={showHeader ? `calc(${height} - 140px)` : `calc(${height} - 90px)`}
          />
        </div>

        <ChatInput
          disabled={!isConnected}
          isSending={isSending}
          onSendMessage={handleSendMessage}
          onOpenEmojiPicker={() => setIsEmojiPickerOpen(true)}
          onOpenQuickChat={() => setIsQuickChatOpen(true)}
          showEmojiButton
          showQuickChatButton
        />
      </Card>

      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelectEmoji={handleSelectEmoji}
        unlockedAchievements={unlockedAchievements}
      />

      <QuickChat
        isOpen={isQuickChatOpen}
        onClose={() => setIsQuickChatOpen(false)}
        onSelectMessage={handleSelectQuickChat}
      />

      <ChatModeration
        isOpen={!!moderationMessage}
        onClose={() => setModerationMessage(undefined)}
        message={moderationMessage}
        isHost={isHost}
        onMuteUser={onMuteUser}
        onUnmuteUser={onUnmuteUser}
        onReportMessage={onReportMessage}
        onDeleteMessage={onDeleteMessage}
      />
    </>
  );
}
