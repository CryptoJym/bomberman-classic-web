'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import type { ChatMessageDisplay } from '@/types/chat';
import { parseEmotes } from '@/lib/chat/emotes';

export interface ChatMessageProps {
  /** Message data */
  message: ChatMessageDisplay;
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** On click handler */
  onClick?: (message: ChatMessageDisplay) => void;
}

export const ChatMessage = memo<ChatMessageProps>(
  ({ message, showTimestamp = true, showAvatar = true, compact = false, onClick }) => {
    const isSystem = message.type === 'system';
    const isQuickChat = message.type === 'quick_chat';
    const isEmoji = message.type === 'emoji';

    // Format timestamp
    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    // Parse emotes in content
    const parsedContent = parseEmotes(message.content);

    if (isSystem) {
      return (
        <div className="flex items-center justify-center py-2 px-4">
          <div className="flex items-center gap-2 font-retro text-xs text-gray-400 bg-retro-dark/50 px-3 py-1.5 rounded border border-game-wall/30">
            <span className="text-accent-gold">●</span>
            <span>{parsedContent}</span>
            {showTimestamp && (
              <span className="text-[10px] text-gray-500">{formatTime(message.timestamp)}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'group flex gap-2 px-3 transition-colors hover:bg-retro-dark/30',
          compact ? 'py-1' : 'py-2',
          message.isDeleted && 'opacity-50',
          onClick && 'cursor-pointer'
        )}
        onClick={() => onClick?.(message)}
      >
        {showAvatar && !compact && (
          <Avatar
            src={message.senderAvatar}
            alt={message.senderUsername}
            size="sm"
            className="flex-shrink-0 mt-0.5"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={cn(
                'font-pixel text-xs font-bold truncate',
                message.isOwnMessage ? 'text-bomber-blue' : 'text-accent-gold'
              )}
            >
              {message.senderUsername}
            </span>
            {showTimestamp && (
              <span className="font-retro text-[10px] text-gray-500">
                {formatTime(message.timestamp)}
              </span>
            )}
            {message.isMuted && (
              <span className="font-pixel text-[9px] text-bomber-red bg-bomber-red/20 px-1.5 py-0.5 rounded border border-bomber-red/50">
                MUTED
              </span>
            )}
          </div>

          <div
            className={cn(
              'font-retro break-words',
              compact ? 'text-xs' : 'text-sm',
              isQuickChat && 'text-bomber-green font-semibold',
              isEmoji && 'text-lg leading-relaxed',
              message.isDeleted ? 'italic text-gray-500' : 'text-gray-200'
            )}
          >
            {message.isDeleted ? '[Message deleted]' : parsedContent}
          </div>
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
