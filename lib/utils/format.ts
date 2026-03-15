/**
 * Format utilities for Bomberman Online
 */

/**
 * Format a duration in milliseconds to MM:SS format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format a number with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a win rate as a percentage
 */
export function formatWinRate(wins: number, games: number): string {
  if (games === 0) {
    return '0%';
  }
  return `${Math.round((wins / games) * 100)}%`;
}

/**
 * Format an ELO rating with rank indicator
 */
export function formatElo(elo: number): { value: string; rank: string; color: string } {
  const value = formatNumber(elo);

  if (elo >= 2000) {
    return { value, rank: 'Diamond', color: 'text-bomber-cyan' };
  }
  if (elo >= 1600) {
    return { value, rank: 'Gold', color: 'text-accent-gold' };
  }
  if (elo >= 1200) {
    return { value, rank: 'Silver', color: 'text-accent-silver' };
  }
  return { value, rank: 'Bronze', color: 'text-accent-bronze' };
}

/**
 * Format a timestamp to relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return target.toLocaleDateString();
}

/**
 * Format distance to now (alternative for formatRelativeTime)
 */
export function formatDistanceToNow(date: Date | string): string {
  return formatRelativeTime(date).replace(' ago', '');
}

/**
 * Generate a random room code
 */
export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
