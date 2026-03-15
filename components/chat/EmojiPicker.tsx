'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  getUserEmotes,
  type Emote,
  type EmoteCategory,
} from '@/lib/chat/emotes';

export interface EmojiPickerProps {
  /** Whether picker is open */
  isOpen: boolean;
  /** On close */
  onClose: () => void;
  /** On select emoji */
  onSelectEmoji: (emoji: string) => void;
  /** On select emote */
  onSelectEmote?: (emote: Emote) => void;
  /** Unlocked achievements (for special emotes) */
  unlockedAchievements?: string[];
}

const CATEGORIES: { id: EmoteCategory; label: string; icon: string }[] = [
  { id: 'basic', label: 'Basic', icon: '😊' },
  { id: 'reaction', label: 'Reactions', icon: '👍' },
  { id: 'special', label: 'Special', icon: '💣' },
  { id: 'seasonal', label: 'Seasonal', icon: '🎃' },
];

export function EmojiPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectEmote,
  unlockedAchievements = [],
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<EmoteCategory>('basic');

  const userEmotes = getUserEmotes(unlockedAchievements);
  const categoryEmotes = userEmotes.filter(e => e.category === activeCategory);

  const handleSelectEmote = (emote: Emote) => {
    onSelectEmoji(emote.emoji);
    onSelectEmote?.(emote);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emojis & Emotes"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="basic" value={activeCategory} onValueChange={(value) => setActiveCategory(value as EmoteCategory)}>
          <TabsList>
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id}>
                <span className="flex items-center gap-1">
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 bg-retro-darker rounded border-2 border-game-wall min-h-[200px]">
          {categoryEmotes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="text-3xl mb-2">🔒</div>
              <div className="font-retro text-xs text-center">
                No emotes available
                <br />
                <span className="text-[10px]">Unlock by earning achievements!</span>
              </div>
            </div>
          ) : (
            categoryEmotes.map(emote => (
              <button
                key={emote.id}
                type="button"
                onClick={() => handleSelectEmote(emote)}
                className={cn(
                  'aspect-square flex items-center justify-center',
                  'text-2xl sm:text-3xl',
                  'bg-retro-dark hover:bg-game-wall/50',
                  'border-2 border-game-wall hover:border-bomber-blue',
                  'rounded transition-all duration-150',
                  'hover:scale-110 active:scale-95'
                )}
                title={emote.name}
              >
                {emote.emoji}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            CLOSE
          </Button>
        </div>
      </div>
    </Modal>
  );
}
