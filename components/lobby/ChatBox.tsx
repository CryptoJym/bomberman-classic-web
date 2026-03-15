'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export interface ChatMessage {
  /** Message ID */
  id: string;
  /** Sender ID */
  senderId: string;
  /** Sender name */
  senderName: string;
  /** Sender avatar URL */
  senderAvatar?: string | null;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Message type */
  type?: 'message' | 'system' | 'join' | 'leave' | 'ready';
}

export interface ChatBoxProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Current user ID */
  currentUserId: string;
  /** Send message handler */
  onSend: (message: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Maximum height */
  maxHeight?: number;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

const EMOJI_SHORTCUTS: Record<string, string> = {
  ':)': '😊',
  ':(': '😢',
  ':D': '😃',
  ':P': '😛',
  '<3': '❤️',
  ':fire:': '🔥',
  ':bomb:': '💣',
  ':gg:': '🎮',
  ':trophy:': '🏆',
  ':skull:': '💀',
};

const QUICK_EMOJIS = ['👍', '👎', '😂', '😊', '🔥', '💣', '🎮', '💀', '🏆', '❤️'];

/**
 * Chat box component for lobby and game chat
 */
export function ChatBox({
  messages,
  currentUserId,
  onSend,
  loading = false,
  maxHeight = 300,
  showAvatars = true,
  showTimestamps = true,
  placeholder = 'Type a message...',
  className,
}: ChatBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || loading) {
      return;
    }

    // Replace emoji shortcuts
    let processedMessage = inputValue;
    Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
      processedMessage = processedMessage.replace(new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
    });

    onSend(processedMessage.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-retro-navy/80 backdrop-blur-sm',
        'border-2 border-t-gray-600 border-l-gray-600 border-b-game-wall border-r-game-wall',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.4)]',
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-game-wall/30 bg-retro-darker/50">
        <span className="font-pixel text-xs text-bomber-yellow uppercase">CHAT</span>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2">💬</span>
            <span className="font-retro text-xs text-gray-500">No messages yet</span>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
              showAvatar={showAvatars}
              showTimestamp={showTimestamps}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="px-2 py-1 border-t border-game-wall/30 bg-retro-darker/30">
          <div className="flex flex-wrap gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-game-wall/30 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-game-wall/30">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={cn(
            'w-8 h-8 flex items-center justify-center',
            'hover:bg-game-wall/30 rounded transition-colors',
            showEmojis && 'bg-game-wall/30'
          )}
        >
          😊
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          className={cn(
            'flex-1',
            'bg-retro-darker border-2 border-game-wall/50',
            'px-2 py-1',
            'font-retro text-xs text-white',
            'placeholder:text-gray-500',
            'focus:outline-none focus:border-bomber-blue',
            'disabled:opacity-50'
          )}
        />

        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={!inputValue.trim() || loading}
        >
          SEND
        </Button>
      </div>
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
}

function ChatMessageItem({ message, isOwn, showAvatar, showTimestamp }: ChatMessageItemProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // System messages
  if (message.type && message.type !== 'message') {
    const typeConfig = {
      system: { icon: '⚙️', color: 'text-gray-400' },
      join: { icon: '➡️', color: 'text-bomber-green' },
      leave: { icon: '⬅️', color: 'text-bomber-red' },
      ready: { icon: '✓', color: 'text-bomber-yellow' },
    };

    const config = typeConfig[message.type];

    return (
      <div className="flex items-center justify-center gap-2 py-1">
        <span className="text-xs">{config.icon}</span>
        <span className={cn('font-retro text-[10px]', config.color)}>
          {message.content}
        </span>
        {showTimestamp && (
          <span className="font-retro text-[8px] text-gray-600">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        isOwn && 'flex-row-reverse'
      )}
    >
      {showAvatar && (
        <Avatar
          src={message.senderAvatar}
          alt={message.senderName}
          size="sm"
        />
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-pixel text-[10px]',
              isOwn ? 'text-accent-gold' : 'text-bomber-blue'
            )}
          >
            {message.senderName}
          </span>
          {showTimestamp && (
            <span className="font-retro text-[8px] text-gray-600">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>

        <div
          className={cn(
            'px-2 py-1 mt-0.5',
            'font-retro text-xs text-white',
            isOwn
              ? 'bg-bomber-blue/20 border border-bomber-blue/50'
              : 'bg-game-wall/20 border border-game-wall/50'
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

export interface QuickChatProps {
  /** Send message handler */
  onSend: (message: string) => void;
  /** Quick chat options */
  options?: string[];
  /** Additional class names */
  className?: string;
}

const defaultQuickMessages = [
  'Good game!',
  'Nice one!',
  'Good luck!',
  'Ready!',
  'Wait!',
  'LOL',
];

/**
 * Quick chat buttons for fast communication
 */
export function QuickChat({
  onSend,
  options = defaultQuickMessages,
  className,
}: QuickChatProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {options.map((message) => (
        <button
          key={message}
          type="button"
          onClick={() => onSend(message)}
          className={cn(
            'px-2 py-1',
            'bg-retro-darker border border-game-wall/50',
            'font-retro text-[10px] text-gray-300',
            'hover:bg-game-wall/30 hover:text-white',
            'transition-colors'
          )}
        >
          {message}
        </button>
      ))}
    </div>
  );
}

export interface ChatNotificationProps {
  /** Sender name */
  senderName: string;
  /** Message preview */
  message: string;
  /** Whether visible */
  visible: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Chat notification toast for minimized chat
 */
export function ChatNotification({
  senderName,
  message,
  visible,
  onClick,
  className,
}: ChatNotificationProps) {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        'bg-retro-navy/95 backdrop-blur-sm',
        'border-2 border-bomber-blue',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        'hover:bg-retro-navy transition-colors',
        className
      )}
    >
      <span className="text-lg">💬</span>
      <div className="text-left">
        <span className="font-pixel text-[10px] text-bomber-blue block">
          {senderName}
        </span>
        <span className="font-retro text-xs text-white truncate max-w-[150px] block">
          {message}
        </span>
      </div>
    </button>
  );
}
