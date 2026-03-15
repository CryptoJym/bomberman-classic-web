/**
 * Chat Profanity Filter and Content Moderation
 * Keeps the game family-friendly
 */

/**
 * List of filtered words (partial list for demonstration)
 * In production, use a comprehensive library or API service
 */
const FILTERED_WORDS = [
  'badword1',
  'badword2',
  // Add more as needed - intentionally minimal for demo
];

/**
 * Spam detection patterns
 */
const SPAM_PATTERNS = [
  /(.)\1{5,}/gi, // Repeated characters (5+ times)
  /[A-Z\s]{20,}/g, // Excessive caps
  /(.{2,})\1{3,}/gi, // Repeated phrases
];

/**
 * Maximum message lengths
 */
export const MESSAGE_LIMITS = {
  TEXT: 200,
  EMOJI: 10,
  QUICK_CHAT: 100,
} as const;

/**
 * Rate limiting config
 */
export const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 10,
  MESSAGES_PER_SECOND: 2,
  DUPLICATE_MESSAGE_COOLDOWN: 3000, // 3 seconds
} as const;

/**
 * Filter profanity from text
 */
export function filterProfanity(text: string): { filtered: string; hadProfanity: boolean } {
  let filtered = text;
  let hadProfanity = false;

  FILTERED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    if (regex.test(filtered)) {
      hadProfanity = true;
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
  });

  return { filtered, hadProfanity };
}

/**
 * Check if message is spam
 */
export function isSpam(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if message contains only emojis
 */
export function isOnlyEmojis(text: string): boolean {
  // Remove emojis and check if anything remains
  const withoutEmojis = text.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );
  return withoutEmojis.trim().length === 0 && text.length > 0;
}

/**
 * Validate message length
 */
export function validateMessageLength(
  text: string,
  type: keyof typeof MESSAGE_LIMITS
): { valid: boolean; error?: string } {
  const limit = MESSAGE_LIMITS[type];

  if (text.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (text.length > limit) {
    return { valid: false, error: `Message too long (max ${limit} characters)` };
  }

  return { valid: true };
}

/**
 * Sanitize message text
 */
export function sanitizeMessage(text: string): string {
  // Remove leading/trailing whitespace
  let sanitized = text.trim();

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove non-printable characters (except emojis)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Check rate limit for user messages
 */
export class MessageRateLimiter {
  private userMessages: Map<string, number[]> = new Map();
  private lastMessages: Map<string, string> = new Map();

  /**
   * Check if user can send a message
   */
  canSendMessage(userId: string, message: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const userTimes = this.userMessages.get(userId) || [];

    // Remove messages older than 1 minute
    const recentMessages = userTimes.filter(time => now - time < 60000);

    // Check messages per minute
    if (recentMessages.length >= RATE_LIMITS.MESSAGES_PER_MINUTE) {
      return { allowed: false, reason: 'Too many messages. Slow down!' };
    }

    // Check messages per second
    const veryRecentMessages = recentMessages.filter(time => now - time < 1000);
    if (veryRecentMessages.length >= RATE_LIMITS.MESSAGES_PER_SECOND) {
      return { allowed: false, reason: 'Sending too fast. Wait a moment.' };
    }

    // Check for duplicate messages
    const lastMessage = this.lastMessages.get(userId);
    if (lastMessage === message) {
      const lastTime = recentMessages[recentMessages.length - 1];
      if (lastTime && now - lastTime < RATE_LIMITS.DUPLICATE_MESSAGE_COOLDOWN) {
        return { allowed: false, reason: 'Cannot send duplicate message so quickly.' };
      }
    }

    return { allowed: true };
  }

  /**
   * Record that a message was sent
   */
  recordMessage(userId: string, message: string): void {
    const now = Date.now();
    const userTimes = this.userMessages.get(userId) || [];

    // Add current time and remove old entries
    userTimes.push(now);
    const recentMessages = userTimes.filter(time => now - time < 60000);

    this.userMessages.set(userId, recentMessages);
    this.lastMessages.set(userId, message);
  }

  /**
   * Clear rate limit for user (e.g., on disconnect)
   */
  clearUser(userId: string): void {
    this.userMessages.delete(userId);
    this.lastMessages.delete(userId);
  }

  /**
   * Clear old data periodically
   */
  cleanup(): void {
    const now = Date.now();

    for (const [userId, times] of this.userMessages.entries()) {
      const recentTimes = times.filter(time => now - time < 60000);
      if (recentTimes.length === 0) {
        this.userMessages.delete(userId);
        this.lastMessages.delete(userId);
      } else {
        this.userMessages.set(userId, recentTimes);
      }
    }
  }
}

/**
 * Process incoming chat message
 */
export function processMessage(text: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
  hadProfanity?: boolean;
} {
  // Sanitize first
  const sanitized = sanitizeMessage(text);

  // Check length
  const lengthCheck = validateMessageLength(sanitized, 'TEXT');
  if (!lengthCheck.valid) {
    return { valid: false, error: lengthCheck.error };
  }

  // Check for spam
  if (isSpam(sanitized)) {
    return { valid: false, error: 'Message appears to be spam' };
  }

  // Filter profanity
  const { filtered, hadProfanity } = filterProfanity(sanitized);

  return {
    valid: true,
    sanitized: filtered,
    hadProfanity,
  };
}
