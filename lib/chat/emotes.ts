/**
 * Emote Definitions for Chat
 * SNES-style emojis and quick reactions
 */

export interface Emote {
  /** Unique emote identifier */
  id: string;
  /** Display emoji/character */
  emoji: string;
  /** Emote name */
  name: string;
  /** Category */
  category: EmoteCategory;
  /** Whether unlocked by default */
  isDefault: boolean;
  /** Unlock requirement (achievement code) */
  unlockRequirement?: string;
}

export type EmoteCategory = 'basic' | 'reaction' | 'special' | 'seasonal';

/**
 * All available emotes
 */
export const EMOTES: Emote[] = [
  // Basic emotes
  { id: 'smile', emoji: '😊', name: 'Smile', category: 'basic', isDefault: true },
  { id: 'laugh', emoji: '😂', name: 'Laugh', category: 'basic', isDefault: true },
  { id: 'cool', emoji: '😎', name: 'Cool', category: 'basic', isDefault: true },
  { id: 'angry', emoji: '😠', name: 'Angry', category: 'basic', isDefault: true },
  { id: 'sad', emoji: '😢', name: 'Sad', category: 'basic', isDefault: true },
  { id: 'thinking', emoji: '🤔', name: 'Thinking', category: 'basic', isDefault: true },
  { id: 'heart', emoji: '❤️', name: 'Heart', category: 'basic', isDefault: true },
  { id: 'fire', emoji: '🔥', name: 'Fire', category: 'basic', isDefault: true },

  // Reaction emotes
  { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up', category: 'reaction', isDefault: true },
  { id: 'thumbsdown', emoji: '👎', name: 'Thumbs Down', category: 'reaction', isDefault: true },
  { id: 'clap', emoji: '👏', name: 'Clap', category: 'reaction', isDefault: true },
  { id: 'wave', emoji: '👋', name: 'Wave', category: 'reaction', isDefault: true },
  { id: 'ok', emoji: '👌', name: 'OK', category: 'reaction', isDefault: true },
  { id: 'point', emoji: '☝️', name: 'Point', category: 'reaction', isDefault: true },

  // Game-specific emotes
  { id: 'bomb', emoji: '💣', name: 'Bomb', category: 'special', isDefault: true },
  { id: 'explosion', emoji: '💥', name: 'Explosion', category: 'special', isDefault: true },
  { id: 'trophy', emoji: '🏆', name: 'Trophy', category: 'special', isDefault: true },
  { id: 'skull', emoji: '💀', name: 'Skull', category: 'special', isDefault: true },
  { id: 'crown', emoji: '👑', name: 'Crown', category: 'special', isDefault: false, unlockRequirement: 'win_100' },
  { id: 'star', emoji: '⭐', name: 'Star', category: 'special', isDefault: true },
  { id: 'lightning', emoji: '⚡', name: 'Lightning', category: 'special', isDefault: true },
  { id: 'shield', emoji: '🛡️', name: 'Shield', category: 'special', isDefault: true },
];

/**
 * Get emotes by category
 */
export function getEmotesByCategory(category: EmoteCategory): Emote[] {
  return EMOTES.filter(emote => emote.category === category);
}

/**
 * Get default (unlocked) emotes
 */
export function getDefaultEmotes(): Emote[] {
  return EMOTES.filter(emote => emote.isDefault);
}

/**
 * Get emote by ID
 */
export function getEmoteById(id: string): Emote | undefined {
  return EMOTES.find(emote => emote.id === id);
}

/**
 * Check if user has unlocked an emote
 */
export function isEmoteUnlocked(
  emote: Emote,
  unlockedAchievements: string[]
): boolean {
  if (emote.isDefault) {
    return true;
  }
  if (!emote.unlockRequirement) {
    return false;
  }
  return unlockedAchievements.includes(emote.unlockRequirement);
}

/**
 * Get all emotes unlocked by user
 */
export function getUserEmotes(unlockedAchievements: string[]): Emote[] {
  return EMOTES.filter(emote => isEmoteUnlocked(emote, unlockedAchievements));
}

/**
 * Parse emote codes in text (e.g., :smile: -> 😊)
 */
export function parseEmotes(text: string): string {
  let parsed = text;

  EMOTES.forEach(emote => {
    const regex = new RegExp(`:${emote.id}:`, 'gi');
    parsed = parsed.replace(regex, emote.emoji);
  });

  return parsed;
}

/**
 * Convert text with emojis to emote codes
 */
export function textToEmoteCodes(text: string): string {
  let parsed = text;

  EMOTES.forEach(emote => {
    parsed = parsed.replace(new RegExp(emote.emoji, 'g'), `:${emote.id}:`);
  });

  return parsed;
}
