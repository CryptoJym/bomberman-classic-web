'use client';

import { cn } from '@/lib/utils/cn';
import type { SystemMessage as SystemMessageType } from '@/types/chat';

export interface SystemMessageProps {
  /** System message data */
  message: SystemMessageType;
  /** Show timestamp */
  showTimestamp?: boolean;
}

const MESSAGE_ICONS: Record<string, string> = {
  player_joined: '👋',
  player_left: '👋',
  player_kicked: '🚫',
  game_starting: '🎮',
  game_started: '▶️',
  game_ended: '🏁',
  round_start: '🔔',
  round_end: '⏱️',
  player_ready: '✅',
  player_not_ready: '❌',
  settings_changed: '⚙️',
  host_changed: '👑',
  player_muted: '🔇',
  player_unmuted: '🔊',
};

const MESSAGE_COLORS: Record<string, string> = {
  player_joined: 'text-bomber-green',
  player_left: 'text-gray-400',
  player_kicked: 'text-bomber-red',
  game_starting: 'text-bomber-yellow',
  game_started: 'text-bomber-green',
  game_ended: 'text-bomber-blue',
  round_start: 'text-bomber-yellow',
  round_end: 'text-gray-400',
  player_ready: 'text-bomber-green',
  player_not_ready: 'text-gray-400',
  settings_changed: 'text-bomber-blue',
  host_changed: 'text-accent-gold',
  player_muted: 'text-bomber-red',
  player_unmuted: 'text-bomber-green',
};

export function SystemMessage({ message, showTimestamp = true }: SystemMessageProps) {
  const icon = MESSAGE_ICONS[message.messageType] || '●';
  const color = MESSAGE_COLORS[message.messageType] || 'text-gray-400';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="flex items-center justify-center py-1.5 px-4">
      <div
        className={cn(
          'flex items-center gap-2 font-retro text-xs',
          'bg-retro-dark/50 px-3 py-1.5 rounded',
          'border border-game-wall/30',
          color
        )}
      >
        <span className="text-base leading-none">{icon}</span>
        <span>{message.content}</span>
        {showTimestamp && (
          <span className="text-[10px] text-gray-500 ml-1">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
