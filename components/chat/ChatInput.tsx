'use client';

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { isCommand, parseCommand } from '@/lib/chat/commands';
import { MESSAGE_LIMITS } from '@/lib/chat/filter';

export interface ChatInputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Whether disabled */
  disabled?: boolean;
  /** Whether sending */
  isSending?: boolean;
  /** Max length */
  maxLength?: number;
  /** On send message */
  onSendMessage: (message: string) => void;
  /** On typing */
  onTyping?: () => void;
  /** Show emoji picker button */
  showEmojiButton?: boolean;
  /** Show quick chat button */
  showQuickChatButton?: boolean;
  /** On open emoji picker */
  onOpenEmojiPicker?: () => void;
  /** On open quick chat */
  onOpenQuickChat?: () => void;
}

export function ChatInput({
  placeholder = 'Type a message...',
  disabled = false,
  isSending = false,
  maxLength = MESSAGE_LIMITS.TEXT,
  onSendMessage,
  onTyping,
  showEmojiButton = true,
  showQuickChatButton = true,
  onOpenEmojiPicker,
  onOpenQuickChat,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);

      // Trigger typing indicator
      if (onTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping();
        typingTimeoutRef.current = setTimeout(() => {
          // Stop typing after 3 seconds of inactivity
        }, 3000);
      }
    }
  };

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) {
      return;
    }

    onSendMessage(trimmed);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCommandMsg = isCommand(message);
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className="flex flex-col gap-2 p-3 bg-retro-dark border-t-2 border-game-wall">
      <div className="flex gap-2">
        {showQuickChatButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0 px-2"
            onClick={onOpenQuickChat}
            disabled={disabled}
            title="Quick Chat"
          >
            💬
          </Button>
        )}

        {showEmojiButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0 px-2"
            onClick={onOpenEmojiPicker}
            disabled={disabled}
            title="Emojis"
          >
            😊
          </Button>
        )}

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder={placeholder}
            maxLength={maxLength}
            className={cn(
              'w-full px-3 py-2 font-retro text-sm text-white',
              'bg-retro-darker',
              'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]',
              'placeholder:text-gray-500',
              'focus:outline-none focus:border-bomber-blue focus:ring-1 focus:ring-bomber-blue/50',
              'transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isCommandMsg && 'text-bomber-yellow border-bomber-yellow/50'
            )}
          />
          {isNearLimit && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 font-pixel text-[10px] text-gray-400">
              {characterCount}/{maxLength}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled || isSending}
          isLoading={isSending}
          className="flex-shrink-0"
        >
          {isSending ? 'SENDING' : 'SEND'}
        </Button>
      </div>

      {isCommandMsg && (
        <div className="flex items-center gap-2 px-2 py-1 bg-bomber-yellow/10 border border-bomber-yellow/30 rounded">
          <span className="font-pixel text-[10px] text-bomber-yellow">
            ⚡ Command detected: {parseCommand(message).command}
          </span>
        </div>
      )}
    </div>
  );
}
