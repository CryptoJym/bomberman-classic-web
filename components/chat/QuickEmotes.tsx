'use client';

import { cn } from '@/lib/utils/cn';
import { getDefaultEmotes, type Emote } from '@/lib/chat/emotes';

export interface QuickEmotesProps {
  /** On select emote */
  onSelectEmote: (emote: Emote) => void;
  /** Max emotes to show */
  maxEmotes?: number;
  /** Compact mode */
  compact?: boolean;
}

export function QuickEmotes({
  onSelectEmote,
  maxEmotes = 8,
  compact = false,
}: QuickEmotesProps) {
  const emotes = getDefaultEmotes().slice(0, maxEmotes);

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 p-2 bg-retro-dark rounded border-2 border-game-wall',
        compact && 'gap-0.5 p-1'
      )}
    >
      {emotes.map(emote => (
        <button
          key={emote.id}
          type="button"
          onClick={() => onSelectEmote(emote)}
          className={cn(
            'flex items-center justify-center',
            'bg-retro-darker hover:bg-game-wall/50',
            'border border-game-wall/50 hover:border-bomber-blue',
            'rounded transition-all duration-150',
            'hover:scale-110 active:scale-95',
            compact ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl'
          )}
          title={emote.name}
        >
          {emote.emoji}
        </button>
      ))}
    </div>
  );
}
