'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  getQuickChatByCategory,
  getQuickChatCategories,
  type QuickChatMessage,
  type QuickChatCategory,
} from '@/lib/chat/quickChat';

export interface QuickChatProps {
  /** Whether picker is open */
  isOpen: boolean;
  /** On close */
  onClose: () => void;
  /** On select message */
  onSelectMessage: (message: QuickChatMessage) => void;
}

const CATEGORY_LABELS: Record<QuickChatCategory, { label: string; icon: string }> = {
  greeting: { label: 'Greetings', icon: '👋' },
  gameplay: { label: 'Gameplay', icon: '🎮' },
  strategy: { label: 'Strategy', icon: '🧠' },
  reaction: { label: 'Reactions', icon: '😲' },
  taunt: { label: 'Taunts', icon: '😎' },
};

export function QuickChat({ isOpen, onClose, onSelectMessage }: QuickChatProps) {
  const [activeCategory, setActiveCategory] = useState<QuickChatCategory>('greeting');

  const categories = getQuickChatCategories();
  const categoryMessages = getQuickChatByCategory(activeCategory);

  const handleSelectMessage = (message: QuickChatMessage) => {
    onSelectMessage(message);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Chat"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="greeting" value={activeCategory} onValueChange={(value) => setActiveCategory(value as QuickChatCategory)}>
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>
                <span className="flex items-center gap-1">
                  <span>{CATEGORY_LABELS[cat].icon}</span>
                  <span className="hidden sm:inline">{CATEGORY_LABELS[cat].label}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-2 p-2 bg-retro-darker rounded border-2 border-game-wall min-h-[200px]">
          {categoryMessages.map(message => (
            <button
              key={message.id}
              type="button"
              onClick={() => handleSelectMessage(message)}
              className={cn(
                'flex items-center gap-2 p-3',
                'bg-retro-dark hover:bg-game-wall/50',
                'border-2 border-game-wall hover:border-bomber-blue',
                'rounded transition-all duration-150',
                'text-left',
                'hover:translate-x-1 active:scale-98'
              )}
            >
              {message.emoji && (
                <span className="text-2xl flex-shrink-0">{message.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-retro text-sm text-white truncate">
                  {message.text}
                </div>
                {message.shortcut && (
                  <div className="font-pixel text-[10px] text-gray-500 mt-0.5">
                    Shortcut: {message.shortcut}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="font-retro text-xs text-gray-500">
            <span className="font-pixel text-bomber-yellow">TIP:</span> Press 1-9 in-game for quick access
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            CLOSE
          </Button>
        </div>
      </div>
    </Modal>
  );
}
