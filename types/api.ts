/**
 * API Types for Bomberman Online
 * Types for REST API responses, leaderboards, achievements, tournaments, etc.
 */

import type { GamePhase, PlayerColor, RoomSettings, RoundResult } from './game';

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  itemsPerPage: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
  /** Next cursor (for cursor-based) */
  nextCursor?: string;
  /** Previous cursor */
  previousCursor?: string;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiResponse<T> {
  /** Whether request was successful */
  success: true;
  /** Response data */
  data: T;
  /** Optional message */
  message?: string;
}

/**
 * Standard API error response
 */
export interface ApiError {
  /** Whether request was successful */
  success: false;
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Field-level validation errors */
  fieldErrors?: Record<string, string[]>;
}

/**
 * Union type for all API responses
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================================
// PROFILE TYPES
// ============================================================================

/**
 * Player rank tier
 */
export type RankTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'grandmaster';

/**
 * Player profile data
 */
export interface Profile {
  /** Unique profile ID (UUID) */
  id: string;
  /** Clerk user ID */
  clerkId: string;
  /** Display username */
  username: string;
  /** Display name (optional) */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Current ELO rating */
  eloRating: number;
  /** Calculated rank tier */
  rankTier: RankTier;
  /** Total games played */
  totalGames: number;
  /** Total wins */
  totalWins: number;
  /** Total kills */
  totalKills: number;
  /** Total deaths */
  totalDeaths: number;
  /** Win rate percentage */
  winRate: number;
  /** Kill/death ratio */
  kdRatio: number;
  /** Preferred player color */
  preferredColor: PlayerColor;
  /** Profile creation date */
  createdAt: string;
  /** Last seen online */
  lastSeenAt: string;
  /** Whether user is currently online */
  isOnline: boolean;
  /** Currently in game */
  inGame: boolean;
  /** Current room code if in game */
  currentRoomCode?: string;
  /** Bio/description */
  bio?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;
}

/**
 * Own profile with additional private fields
 */
export interface OwnProfile extends Profile {
  /** Email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** Account settings */
  settings: ProfileSettings;
  /** Friend request count */
  pendingFriendRequests: number;
  /** Notification preferences */
  notifications: NotificationSettings;
}

/**
 * Profile settings
 */
export interface ProfileSettings {
  /** Whether profile is public */
  isPublic: boolean;
  /** Show online status */
  showOnlineStatus: boolean;
  /** Show current game */
  showCurrentGame: boolean;
  /** Allow friend requests */
  allowFriendRequests: boolean;
  /** Allow game invites */
  allowGameInvites: boolean;
  /** Preferred language */
  language: string;
  /** Sound effects volume (0-100) */
  sfxVolume: number;
  /** Music volume (0-100) */
  musicVolume: number;
  /** Enable screen shake */
  screenShake: boolean;
  /** Show player names above characters */
  showPlayerNames: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Push notifications enabled */
  push: boolean;
  /** Email notifications enabled */
  email: boolean;
  /** Friend request notifications */
  friendRequests: boolean;
  /** Game invite notifications */
  gameInvites: boolean;
  /** Tournament notifications */
  tournaments: boolean;
  /** Achievement notifications */
  achievements: boolean;
}

/**
 * Profile update request
 */
export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  country?: string;
  preferredColor?: PlayerColor;
  settings?: Partial<ProfileSettings>;
  notifications?: Partial<NotificationSettings>;
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard time filter
 */
export type LeaderboardTimeFilter = 'daily' | 'weekly' | 'monthly' | 'all_time';

/**
 * Leaderboard stat type
 */
export type LeaderboardType = 'elo' | 'wins' | 'kills' | 'games' | 'win_streak';

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  /** Rank position (1-indexed) */
  rank: number;
  /** Player profile ID */
  playerId: string;
  /** Username */
  username: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Rank tier */
  rankTier: RankTier;
  /** Primary stat value */
  value: number;
  /** ELO rating */
  eloRating: number;
  /** Total wins */
  totalWins: number;
  /** Total games */
  totalGames: number;
  /** Win rate */
  winRate: number;
  /** Country code */
  country?: string;
  /** Rank change from previous period (+/-) */
  rankChange?: number;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  /** Leaderboard type */
  type: LeaderboardType;
  /** Time filter */
  timeFilter: LeaderboardTimeFilter;
  /** Entries */
  entries: LeaderboardEntry[];
  /** Pagination */
  pagination: PaginationMeta;
  /** Current user's entry (if logged in) */
  currentUserEntry?: LeaderboardEntry;
  /** Last updated timestamp */
  lastUpdated: string;
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

/**
 * Achievement rarity tier
 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Achievement category
 */
export type AchievementCategory =
  | 'gameplay'
  | 'kills'
  | 'wins'
  | 'social'
  | 'special'
  | 'seasonal';

/**
 * Achievement definition
 */
export interface Achievement {
  /** Unique achievement ID */
  id: string;
  /** Achievement code/slug */
  code: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon identifier */
  icon: string;
  /** Rarity tier */
  rarity: AchievementRarity;
  /** Category */
  category: AchievementCategory;
  /** Points/XP value */
  points: number;
  /** Whether achievement is hidden until unlocked */
  isSecret: boolean;
  /** Unlock criteria (for progress tracking) */
  criteria: AchievementCriteria;
  /** Percentage of players who have this */
  globalUnlockRate?: number;
}

/**
 * Achievement unlock criteria
 */
export interface AchievementCriteria {
  /** Type of criteria */
  type: 'count' | 'streak' | 'single' | 'cumulative';
  /** Stat to track */
  stat: string;
  /** Target value */
  target: number;
  /** Additional conditions */
  conditions?: Record<string, unknown>;
}

/**
 * Player's achievement with unlock status
 */
export interface PlayerAchievement extends Achievement {
  /** Whether unlocked */
  isUnlocked: boolean;
  /** Unlock timestamp */
  unlockedAt?: string;
  /** Progress towards achievement (0-1) */
  progress: number;
  /** Current count (for count-based) */
  currentValue?: number;
}

/**
 * Achievement unlock notification
 */
export interface AchievementUnlock {
  achievement: Achievement;
  unlockedAt: string;
  /** Whether this is a first-time unlock */
  isNew: boolean;
}

// ============================================================================
// PLAYER STATS TYPES
// ============================================================================

/**
 * Detailed player statistics
 */
export interface PlayerStats {
  /** Profile ID */
  playerId: string;
  /** All-time stats */
  allTime: StatPeriod;
  /** This season stats */
  season: StatPeriod;
  /** Last 7 days stats */
  weekly: StatPeriod;
  /** Favorite map */
  favoriteMap?: {
    id: string;
    name: string;
    gamesPlayed: number;
    winRate: number;
  };
  /** Most killed opponent */
  nemesis?: {
    playerId: string;
    username: string;
    timesKilled: number;
    timesKilledBy: number;
  };
  /** Best win streak */
  bestWinStreak: number;
  /** Current win streak */
  currentWinStreak: number;
  /** Average game duration */
  avgGameDuration: number;
  /** Powerup pickup stats */
  powerupStats: Record<string, number>;
}

/**
 * Stats for a time period
 */
export interface StatPeriod {
  /** Games played */
  games: number;
  /** Wins */
  wins: number;
  /** Losses */
  losses: number;
  /** Kills */
  kills: number;
  /** Deaths */
  deaths: number;
  /** Win rate */
  winRate: number;
  /** K/D ratio */
  kdRatio: number;
  /** Average kills per game */
  avgKillsPerGame: number;
  /** Bombs placed */
  bombsPlaced: number;
  /** Powerups collected */
  powerupsCollected: number;
  /** ELO change */
  eloChange: number;
  /** Achievements unlocked */
  achievementsUnlocked: number;
}

// ============================================================================
// GAME HISTORY TYPES
// ============================================================================

/**
 * Game summary for history
 */
export interface GameSummary {
  /** Game ID */
  id: string;
  /** Room code */
  roomCode: string;
  /** Map played */
  map: {
    id: string;
    name: string;
    thumbnailUrl?: string;
  };
  /** Game result */
  result: 'win' | 'loss' | 'draw';
  /** Final placement (1st, 2nd, etc.) */
  placement: number;
  /** Total players in game */
  totalPlayers: number;
  /** Player's kills */
  kills: number;
  /** Player's deaths */
  deaths: number;
  /** ELO change */
  eloChange: number;
  /** Game duration in seconds */
  duration: number;
  /** Rounds played */
  rounds: number;
  /** Timestamp */
  playedAt: string;
  /** Whether replay is available */
  hasReplay: boolean;
  /** Replay ID */
  replayId?: string;
  /** Other players */
  players: Array<{
    id: string;
    username: string;
    placement: number;
    kills: number;
  }>;
}

/**
 * Detailed game result
 */
export interface GameResult {
  /** Game ID */
  gameId: string;
  /** Room code */
  roomCode: string;
  /** Final game phase */
  phase: GamePhase;
  /** Map details */
  map: {
    id: string;
    name: string;
  };
  /** Room settings used */
  settings: RoomSettings;
  /** Winner player ID */
  winnerId: string | null;
  /** Winner username */
  winnerUsername?: string;
  /** All player results */
  playerResults: PlayerGameResult[];
  /** Round results */
  rounds: RoundResult[];
  /** Total duration in seconds */
  totalDuration: number;
  /** Game timestamps */
  startedAt: string;
  finishedAt: string;
  /** Replay ID if available */
  replayId?: string;
}

/**
 * Individual player's game result
 */
export interface PlayerGameResult {
  playerId: string;
  username: string;
  color: PlayerColor;
  placement: number;
  roundWins: number;
  totalKills: number;
  totalDeaths: number;
  eloChange: number;
  previousElo: number;
  newElo: number;
  achievementsUnlocked: AchievementUnlock[];
}

// ============================================================================
// REPLAY TYPES
// ============================================================================

/**
 * Replay metadata
 */
export interface ReplayMeta {
  /** Replay ID */
  id: string;
  /** Associated game ID */
  gameId: string;
  /** Map info */
  map: {
    id: string;
    name: string;
  };
  /** Players in replay */
  players: Array<{
    id: string;
    username: string;
    color: PlayerColor;
  }>;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
  /** Replay version */
  version: number;
  /** Recording timestamp */
  recordedAt: string;
  /** Download URL */
  downloadUrl?: string;
  /** Watch online URL */
  watchUrl?: string;
  /** View count */
  viewCount: number;
  /** Featured/highlighted */
  isFeatured: boolean;
}

/**
 * Replay data (for playback)
 */
export interface ReplayData {
  meta: ReplayMeta;
  /** Initial game state */
  initialState: unknown; // GameState snapshot
  /** Array of tick frames */
  frames: ReplayFrame[];
}

/**
 * Single replay frame
 */
export interface ReplayFrame {
  /** Tick number */
  tick: number;
  /** Timestamp offset from start */
  timestamp: number;
  /** State delta */
  delta: unknown; // GameStateDelta
  /** Events that occurred */
  events: ReplayEvent[];
}

/**
 * Replay event
 */
export interface ReplayEvent {
  type: 'kill' | 'powerup' | 'bomb' | 'explosion' | 'phase_change';
  tick: number;
  data: Record<string, unknown>;
}

// ============================================================================
// TOURNAMENT TYPES
// ============================================================================

/**
 * Tournament format
 */
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';

/**
 * Tournament status
 */
export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';

/**
 * Tournament definition
 */
export interface Tournament {
  /** Tournament ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Creator profile ID */
  creatorId: string;
  /** Creator username */
  creatorUsername: string;
  /** Current status */
  status: TournamentStatus;
  /** Tournament format */
  format: TournamentFormat;
  /** Maximum participants */
  maxPlayers: number;
  /** Current participant count */
  currentPlayers: number;
  /** Prize pool description */
  prizePool?: string;
  /** Prize distribution */
  prizes?: TournamentPrize[];
  /** Entry requirements */
  requirements?: TournamentRequirements;
  /** Registration open timestamp */
  registrationOpensAt: string;
  /** Registration close timestamp */
  registrationClosesAt: string;
  /** Tournament start timestamp */
  startsAt: string;
  /** Estimated end timestamp */
  estimatedEndAt?: string;
  /** Actual end timestamp */
  endedAt?: string;
  /** Tournament rules */
  rules?: string;
  /** Bracket data */
  bracket?: TournamentBracket;
  /** Creation timestamp */
  createdAt: string;
  /** Is official/sponsored */
  isOfficial: boolean;
  /** Featured tournament */
  isFeatured: boolean;
}

/**
 * Tournament prize
 */
export interface TournamentPrize {
  /** Placement (1st, 2nd, etc.) */
  placement: number;
  /** Prize description */
  description: string;
  /** Prize value (if applicable) */
  value?: number;
}

/**
 * Tournament entry requirements
 */
export interface TournamentRequirements {
  /** Minimum ELO rating */
  minElo?: number;
  /** Maximum ELO rating */
  maxElo?: number;
  /** Minimum games played */
  minGames?: number;
  /** Minimum account age in days */
  minAccountAge?: number;
}

/**
 * Tournament bracket
 */
export interface TournamentBracket {
  /** Bracket type */
  type: TournamentFormat;
  /** Total rounds */
  totalRounds: number;
  /** Current round */
  currentRound: number;
  /** All matches */
  matches: TournamentMatch[];
  /** Winners bracket (for double elim) */
  winnersBracket?: TournamentMatch[];
  /** Losers bracket (for double elim) */
  losersBracket?: TournamentMatch[];
}

/**
 * Tournament match
 */
export interface TournamentMatch {
  /** Match ID */
  id: string;
  /** Round number */
  round: number;
  /** Match number within round */
  matchNumber: number;
  /** Player 1 info */
  player1?: TournamentParticipant;
  /** Player 2 info */
  player2?: TournamentParticipant;
  /** Winner ID */
  winnerId?: string;
  /** Match status */
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
  /** Scheduled time */
  scheduledAt?: string;
  /** Started timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Associated game ID */
  gameId?: string;
  /** Score (if applicable) */
  score?: {
    player1: number;
    player2: number;
  };
  /** Room code for the match */
  roomCode?: string;
}

/**
 * Tournament participant
 */
export interface TournamentParticipant {
  /** Player profile ID */
  playerId: string;
  /** Username */
  username: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Seed number */
  seed: number;
  /** Current status in tournament */
  status: 'active' | 'eliminated' | 'withdrawn';
  /** Wins in tournament */
  wins: number;
  /** Losses in tournament */
  losses: number;
  /** Final placement */
  placement?: number;
  /** Registration timestamp */
  registeredAt: string;
}

// ============================================================================
// FRIENDSHIP TYPES
// ============================================================================

/**
 * Friendship status
 */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

/**
 * Friend entry
 */
export interface Friend {
  /** Friendship record ID */
  id: string;
  /** Friend's profile */
  profile: Profile;
  /** Friendship status */
  status: FriendshipStatus;
  /** Who sent the request */
  initiator: 'self' | 'friend';
  /** When friendship started */
  since: string;
  /** Favorite/pinned friend */
  isFavorite: boolean;
}

/**
 * Friend request
 */
export interface FriendRequest {
  /** Request ID */
  id: string;
  /** Sender profile */
  from: Pick<Profile, 'id' | 'username' | 'avatarUrl' | 'eloRating' | 'rankTier'>;
  /** Sent timestamp */
  sentAt: string;
}

// ============================================================================
// MAP API TYPES
// ============================================================================

/**
 * Map list filters
 */
export interface MapFilters {
  /** Filter by creator */
  creatorId?: string;
  /** Official maps only */
  isOfficial?: boolean;
  /** Player count support */
  playerCount?: number;
  /** Sort by */
  sortBy?: 'newest' | 'popular' | 'most_played' | 'top_rated';
  /** Search query */
  search?: string;
}

/**
 * Map list item (condensed)
 */
export interface MapListItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  creatorUsername?: string;
  isOfficial: boolean;
  playCount: number;
  likes: number;
  maxPlayers: number;
  createdAt: string;
}

/**
 * Map creation request
 */
export interface CreateMapRequest {
  name: string;
  description?: string;
  /** Tile data */
  tiles: number[][];
  /** Spawn points */
  spawnPoints: Array<{ x: number; y: number }>;
  /** Map dimensions */
  width: number;
  height: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification type
 */
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'tournament_start'
  | 'tournament_match'
  | 'achievement_unlock'
  | 'system';

/**
 * In-app notification
 */
export interface Notification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Title */
  title: string;
  /** Message body */
  message: string;
  /** Associated data */
  data?: Record<string, unknown>;
  /** Action URL */
  actionUrl?: string;
  /** Read status */
  isRead: boolean;
  /** Timestamp */
  createdAt: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Global search results
 */
export interface SearchResults {
  /** Matching players */
  players: Array<Pick<Profile, 'id' | 'username' | 'avatarUrl' | 'rankTier'>>;
  /** Matching maps */
  maps: MapListItem[];
  /** Matching tournaments */
  tournaments: Array<Pick<Tournament, 'id' | 'name' | 'status' | 'startsAt'>>;
  /** Total results */
  totalResults: number;
}
