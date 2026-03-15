'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChatMessage } from './ChatMessage';
import { SystemMessage } from './SystemMessage';
import type { ChatMessageDisplay, SystemMessage as SystemMessageType } from '@/types/chat';
import { Spinner } from '@/components/ui/Spinner';

export interface ChatMessagesProps {
  /** Messages to display */
  messages: ChatMessageDisplay[];
  /** System messages */
  systemMessages?: SystemMessageType[];
  /** Whether loading more messages */
  isLoading?: boolean;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Auto-scroll to bottom */
  autoScroll?: boolean;
  /** On message click */
  onMessageClick?: (message: ChatMessageDisplay) => void;
  /** On load more */
  onLoadMore?: () => void;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Max height */
  maxHeight?: string;
}

export function ChatMessages({
  messages,
  systemMessages = [],
  isLoading = false,
  showTimestamps = true,
  showAvatars = true,
  compact = false,
  autoScroll = true,
  onMessageClick,
  onLoadMore,
  emptyState,
  maxHeight = '500px',
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Combine and sort all messages by timestamp
  const allMessages = [
    ...messages.map(m => ({ ...m, isSystemMessage: false })),
    ...systemMessages.map(m => ({ ...m, isSystemMessage: true })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length, autoScroll, shouldAutoScroll]);

  // Check if user is near bottom
  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShouldAutoScroll(isNearBottom);

    // Load more when scrolled to top
    if (scrollTop === 0 && onLoadMore && !isLoading) {
      onLoadMore();
    }
  };

  if (allMessages.length === 0 && !isLoading) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 font-retro text-sm"
        style={{ height: maxHeight }}
      >
        {emptyState || (
          <div className="text-center">
            <div className="text-2xl mb-2">💬</div>
            <div>No messages yet</div>
            <div className="text-xs mt-1">Be the first to chat!</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-y-auto overflow-x-hidden',
        'scrollbar-thin scrollbar-thumb-game-wall scrollbar-track-retro-darker'
      )}
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      <div className="space-y-0.5">
        {allMessages.map((message, index) => {
          if ('isSystemMessage' in message && message.isSystemMessage) {
            return (
              <SystemMessage
                key={`system-${message.timestamp}-${index}`}
                message={message as SystemMessageType}
                showTimestamp={showTimestamps}
              />
            );
          }

          // Type guard: at this point we know it's a ChatMessageDisplay
          const chatMessage = message as ChatMessageDisplay;
          return (
            <ChatMessage
              key={chatMessage.id}
              message={chatMessage}
              showTimestamp={showTimestamps}
              showAvatar={showAvatars}
              compact={compact}
              onClick={onMessageClick}
            />
          );
        })}
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}
