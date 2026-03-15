/**
 * Quick Chat Messages
 * Predefined messages for fast in-game communication
 */

export interface QuickChatMessage {
  /** Unique ID */
  id: string;
  /** Display text */
  text: string;
  /** Category */
  category: QuickChatCategory;
  /** Optional emoji */
  emoji?: string;
  /** Shortcut key (1-9) */
  shortcut?: number;
}

export type QuickChatCategory =
  | 'greeting'
  | 'gameplay'
  | 'strategy'
  | 'reaction'
  | 'taunt';

/**
 * All quick chat messages
 */
export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  // Greetings
  {
    id: 'hello',
    text: 'Hello!',
    category: 'greeting',
    emoji: '👋',
    shortcut: 1,
  },
  {
    id: 'gg',
    text: 'Good game!',
    category: 'greeting',
    emoji: '🤝',
    shortcut: 2,
  },
  {
    id: 'glhf',
    text: 'Good luck, have fun!',
    category: 'greeting',
    emoji: '🍀',
  },
  {
    id: 'bye',
    text: 'Goodbye!',
    category: 'greeting',
    emoji: '👋',
  },

  // Gameplay
  {
    id: 'nice',
    text: 'Nice!',
    category: 'gameplay',
    emoji: '👍',
    shortcut: 3,
  },
  {
    id: 'nice_bomb',
    text: 'Nice bomb!',
    category: 'gameplay',
    emoji: '💣',
    shortcut: 4,
  },
  {
    id: 'close',
    text: 'That was close!',
    category: 'gameplay',
    emoji: '😅',
  },
  {
    id: 'lucky',
    text: 'So lucky!',
    category: 'gameplay',
    emoji: '🍀',
  },
  {
    id: 'unlucky',
    text: 'Unlucky!',
    category: 'gameplay',
    emoji: '😢',
  },

  // Strategy
  {
    id: 'wait',
    text: 'Wait!',
    category: 'strategy',
    emoji: '✋',
    shortcut: 5,
  },
  {
    id: 'go',
    text: "Let's go!",
    category: 'strategy',
    emoji: '🏃',
    shortcut: 6,
  },
  {
    id: 'help',
    text: 'Help!',
    category: 'strategy',
    emoji: '🆘',
    shortcut: 7,
  },
  {
    id: 'watch_out',
    text: 'Watch out!',
    category: 'strategy',
    emoji: '⚠️',
  },
  {
    id: 'follow',
    text: 'Follow me!',
    category: 'strategy',
    emoji: '👉',
  },

  // Reactions
  {
    id: 'wow',
    text: 'Wow!',
    category: 'reaction',
    emoji: '😲',
    shortcut: 8,
  },
  {
    id: 'omg',
    text: 'OMG!',
    category: 'reaction',
    emoji: '😱',
  },
  {
    id: 'lol',
    text: 'LOL!',
    category: 'reaction',
    emoji: '😂',
  },
  {
    id: 'oops',
    text: 'Oops!',
    category: 'reaction',
    emoji: '🤦',
    shortcut: 9,
  },
  {
    id: 'sorry',
    text: 'Sorry!',
    category: 'reaction',
    emoji: '🙏',
  },

  // Taunts (friendly)
  {
    id: 'too_slow',
    text: 'Too slow!',
    category: 'taunt',
    emoji: '🐌',
  },
  {
    id: 'catch_me',
    text: "Can't catch me!",
    category: 'taunt',
    emoji: '🏃',
  },
  {
    id: 'ez',
    text: 'Too easy!',
    category: 'taunt',
    emoji: '😎',
  },
  {
    id: 'rematch',
    text: 'Rematch?',
    category: 'taunt',
    emoji: '🔄',
  },
];

/**
 * Get quick chat messages by category
 */
export function getQuickChatByCategory(category: QuickChatCategory): QuickChatMessage[] {
  return QUICK_CHAT_MESSAGES.filter(msg => msg.category === category);
}

/**
 * Get quick chat message by ID
 */
export function getQuickChatById(id: string): QuickChatMessage | undefined {
  return QUICK_CHAT_MESSAGES.find(msg => msg.id === id);
}

/**
 * Get quick chat messages with shortcuts
 */
export function getQuickChatWithShortcuts(): QuickChatMessage[] {
  return QUICK_CHAT_MESSAGES.filter(msg => msg.shortcut !== undefined).sort(
    (a, b) => (a.shortcut || 0) - (b.shortcut || 0)
  );
}

/**
 * Get quick chat message by shortcut key
 */
export function getQuickChatByShortcut(shortcut: number): QuickChatMessage | undefined {
  return QUICK_CHAT_MESSAGES.find(msg => msg.shortcut === shortcut);
}

/**
 * Format quick chat message for display
 */
export function formatQuickChatMessage(
  message: QuickChatMessage,
  username: string
): string {
  if (message.emoji) {
    return `${message.emoji} ${username}: ${message.text}`;
  }
  return `${username}: ${message.text}`;
}

/**
 * Get all categories
 */
export function getQuickChatCategories(): QuickChatCategory[] {
  return ['greeting', 'gameplay', 'strategy', 'reaction', 'taunt'];
}
