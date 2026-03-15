/**
 * Database Types for Bomberman Online
 * Manual type definitions matching Supabase schema
 * These will be replaced/augmented by auto-generated types from Supabase CLI
 */

// ============================================================================
// TABLE TYPES - ROW (what you get from SELECT)
// ============================================================================

/**
 * Profile table row type
 * Stores user profile data synced from Clerk
 */
export interface ProfileRow {
  /** UUID primary key */
  id: string;
  /** Clerk user ID (unique) */
  clerk_id: string;
  /** Unique username */
  username: string;
  /** Optional display name */
  display_name: string | null;
  /** Avatar URL from Clerk or uploaded */
  avatar_url: string | null;
  /** ELO rating (default 1000) */
  elo_rating: number;
  /** Total wins */
  total_wins: number;
  /** Total games played */
  total_games: number;
  /** Total kills */
  total_kills: number;
  /** Total deaths */
  total_deaths: number;
  /** Preferred player color (0-7) */
  preferred_color: number;
  /** Profile bio */
  bio: string | null;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string | null;
  /** Whether currently online */
  is_online: boolean;
  /** Last seen timestamp */
  last_seen_at: string;
  /** Account creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Game table row type
 * Represents a game session
 */
export interface GameRow {
  /** UUID primary key */
  id: string;
  /** Unique room code */
  room_code: string;
  /** Game status */
  status: GameStatus;
  /** Reference to map played */
  map_id: string | null;
  /** Winner profile ID */
  winner_id: string | null;
  /** JSON game settings */
  settings: GameSettingsJson;
  /** Final results JSON */
  results: GameResultsJson | null;
  /** Total rounds played */
  rounds_played: number;
  /** Game duration in seconds */
  duration_seconds: number | null;
  /** Creation timestamp */
  created_at: string;
  /** Start timestamp */
  started_at: string | null;
  /** Finish timestamp */
  finished_at: string | null;
}

/**
 * Game player table row type
 * Junction table for players in a game
 */
export interface GamePlayerRow {
  /** UUID primary key */
  id: string;
  /** Reference to game */
  game_id: string;
  /** Reference to player profile */
  player_id: string;
  /** Player position/slot (1-16) */
  position: number;
  /** Player color in this game */
  color: number;
  /** Kills in this game */
  kills: number;
  /** Deaths in this game */
  deaths: number;
  /** Final placement (1st, 2nd, etc.) */
  placement: number | null;
  /** Rounds won */
  rounds_won: number;
  /** ELO change from this game */
  elo_change: number;
  /** ELO before this game */
  elo_before: number;
  /** Join timestamp */
  joined_at: string;
}

/**
 * Map table row type
 * Custom and official game maps
 */
export interface MapRow {
  /** UUID primary key */
  id: string;
  /** Creator profile ID (null for official) */
  creator_id: string | null;
  /** Map name */
  name: string;
  /** Map description */
  description: string | null;
  /** JSON map data (tiles, spawns) */
  data: MapDataJson;
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
  /** Max players supported */
  max_players: number;
  /** Whether this is an official map */
  is_official: boolean;
  /** Whether map is published/public */
  is_published: boolean;
  /** Times played */
  play_count: number;
  /** Number of likes */
  likes: number;
  /** Thumbnail URL */
  thumbnail_url: string | null;
  /** Map version */
  version: number;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Achievement table row type
 * Achievement definitions
 */
export interface AchievementRow {
  /** UUID primary key */
  id: string;
  /** Unique achievement code */
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
  /** Points value */
  points: number;
  /** Whether hidden until unlocked */
  is_secret: boolean;
  /** JSON unlock criteria */
  criteria: AchievementCriteriaJson;
  /** Sort order */
  sort_order: number;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Player achievement table row type
 * Tracks player achievement unlocks
 */
export interface PlayerAchievementRow {
  /** UUID primary key */
  id: string;
  /** Reference to player profile */
  player_id: string;
  /** Reference to achievement */
  achievement_id: string;
  /** Progress value (for progressive achievements) */
  progress: number;
  /** Whether fully unlocked */
  is_unlocked: boolean;
  /** Unlock timestamp */
  unlocked_at: string | null;
  /** Last progress update */
  updated_at: string;
}

/**
 * Replay table row type
 * Stored game replays
 */
export interface ReplayRow {
  /** UUID primary key */
  id: string;
  /** Reference to game */
  game_id: string;
  /** Compressed replay data (stored in Supabase Storage) */
  storage_path: string;
  /** File size in bytes */
  file_size: number;
  /** Duration in seconds */
  duration_seconds: number;
  /** Replay format version */
  version: number;
  /** View count */
  view_count: number;
  /** Whether featured */
  is_featured: boolean;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Tournament table row type
 */
export interface TournamentRow {
  /** UUID primary key */
  id: string;
  /** Creator profile ID */
  creator_id: string;
  /** Tournament name */
  name: string;
  /** Description */
  description: string | null;
  /** Current status */
  status: TournamentStatus;
  /** Tournament format */
  format: TournamentFormat;
  /** Max participants */
  max_players: number;
  /** Prize pool description */
  prize_pool: string | null;
  /** JSON prizes */
  prizes: TournamentPrizesJson | null;
  /** JSON entry requirements */
  requirements: TournamentRequirementsJson | null;
  /** JSON bracket data */
  bracket_data: TournamentBracketJson | null;
  /** Registration opens */
  registration_opens_at: string;
  /** Registration closes */
  registration_closes_at: string;
  /** Tournament starts */
  starts_at: string;
  /** Tournament ended */
  ended_at: string | null;
  /** Whether official/sponsored */
  is_official: boolean;
  /** Whether featured */
  is_featured: boolean;
  /** Creation timestamp */
  created_at: string;
  /** Last update */
  updated_at: string;
}

/**
 * Tournament participant table row type
 */
export interface TournamentParticipantRow {
  /** UUID primary key */
  id: string;
  /** Reference to tournament */
  tournament_id: string;
  /** Reference to player profile */
  player_id: string;
  /** Seed number */
  seed: number | null;
  /** Participant status */
  status: TournamentParticipantStatus;
  /** Wins in tournament */
  wins: number;
  /** Losses in tournament */
  losses: number;
  /** Final placement */
  placement: number | null;
  /** Registration timestamp */
  registered_at: string;
}

/**
 * Friendship table row type
 */
export interface FriendshipRow {
  /** UUID primary key */
  id: string;
  /** Requester profile ID */
  requester_id: string;
  /** Addressee profile ID */
  addressee_id: string;
  /** Friendship status */
  status: FriendshipStatus;
  /** Whether favorited by requester */
  is_favorite_requester: boolean;
  /** Whether favorited by addressee */
  is_favorite_addressee: boolean;
  /** Request/creation timestamp */
  created_at: string;
  /** Last update */
  updated_at: string;
}

/**
 * Chat message table row type
 */
export interface ChatMessageRow {
  /** UUID primary key */
  id: string;
  /** Reference to game (null for lobby chat) */
  game_id: string | null;
  /** Sender profile ID */
  sender_id: string;
  /** Message content */
  content: string;
  /** Message type */
  type: ChatMessageType;
  /** Whether deleted/hidden */
  is_deleted: boolean;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Map like table row type
 */
export interface MapLikeRow {
  /** UUID primary key */
  id: string;
  /** Reference to map */
  map_id: string;
  /** Reference to player profile */
  player_id: string;
  /** Like timestamp */
  created_at: string;
}

/**
 * Player stats table row type (aggregated stats)
 */
export interface PlayerStatsRow {
  /** UUID primary key */
  id: string;
  /** Reference to player profile */
  player_id: string;
  /** Stats period type */
  period_type: StatsPeriodType;
  /** Period start date */
  period_start: string;
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
  /** Bombs placed */
  bombs_placed: number;
  /** Powerups collected */
  powerups_collected: number;
  /** ELO change in period */
  elo_change: number;
  /** Best win streak */
  best_win_streak: number;
  /** Last update */
  updated_at: string;
}

// ============================================================================
// TABLE TYPES - INSERT (what you provide for INSERT)
// ============================================================================

export interface ProfileInsert {
  id?: string;
  clerk_id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  elo_rating?: number;
  total_wins?: number;
  total_games?: number;
  total_kills?: number;
  total_deaths?: number;
  preferred_color?: number;
  bio?: string | null;
  country?: string | null;
}

export interface GameInsert {
  id?: string;
  room_code: string;
  status?: GameStatus;
  map_id?: string | null;
  settings?: GameSettingsJson;
}

export interface GamePlayerInsert {
  id?: string;
  game_id: string;
  player_id: string;
  position: number;
  color?: number;
}

export interface MapInsert {
  id?: string;
  creator_id?: string | null;
  name: string;
  description?: string | null;
  data: MapDataJson;
  width: number;
  height: number;
  max_players: number;
  is_official?: boolean;
  is_published?: boolean;
}

export interface PlayerAchievementInsert {
  id?: string;
  player_id: string;
  achievement_id: string;
  progress?: number;
  is_unlocked?: boolean;
}

export interface TournamentInsert {
  id?: string;
  creator_id: string;
  name: string;
  description?: string | null;
  format: TournamentFormat;
  max_players: number;
  prize_pool?: string | null;
  prizes?: TournamentPrizesJson | null;
  requirements?: TournamentRequirementsJson | null;
  registration_opens_at: string;
  registration_closes_at: string;
  starts_at: string;
}

export interface TournamentParticipantInsert {
  id?: string;
  tournament_id: string;
  player_id: string;
  seed?: number | null;
}

export interface FriendshipInsert {
  id?: string;
  requester_id: string;
  addressee_id: string;
  status?: FriendshipStatus;
}

export interface ChatMessageInsert {
  id?: string;
  game_id?: string | null;
  sender_id: string;
  content: string;
  type?: ChatMessageType;
}

export interface MapLikeInsert {
  id?: string;
  map_id: string;
  player_id: string;
}

// ============================================================================
// TABLE TYPES - UPDATE (what you provide for UPDATE)
// ============================================================================

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  elo_rating?: number;
  total_wins?: number;
  total_games?: number;
  total_kills?: number;
  total_deaths?: number;
  preferred_color?: number;
  bio?: string | null;
  country?: string | null;
  is_online?: boolean;
  last_seen_at?: string;
}

export interface GameUpdate {
  status?: GameStatus;
  winner_id?: string | null;
  results?: GameResultsJson | null;
  rounds_played?: number;
  duration_seconds?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface GamePlayerUpdate {
  kills?: number;
  deaths?: number;
  placement?: number | null;
  rounds_won?: number;
  elo_change?: number;
}

export interface MapUpdate {
  name?: string;
  description?: string | null;
  data?: MapDataJson;
  is_published?: boolean;
  play_count?: number;
  likes?: number;
  thumbnail_url?: string | null;
  version?: number;
}

export interface PlayerAchievementUpdate {
  progress?: number;
  is_unlocked?: boolean;
  unlocked_at?: string | null;
}

export interface TournamentUpdate {
  name?: string;
  description?: string | null;
  status?: TournamentStatus;
  bracket_data?: TournamentBracketJson | null;
  ended_at?: string | null;
  is_featured?: boolean;
}

export interface TournamentParticipantUpdate {
  seed?: number | null;
  status?: TournamentParticipantStatus;
  wins?: number;
  losses?: number;
  placement?: number | null;
}

export interface FriendshipUpdate {
  status?: FriendshipStatus;
  is_favorite_requester?: boolean;
  is_favorite_addressee?: boolean;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

export type GameStatus = 'waiting' | 'starting' | 'playing' | 'finished' | 'cancelled';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory = 'gameplay' | 'kills' | 'wins' | 'social' | 'special' | 'seasonal';

export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';

export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';

export type TournamentParticipantStatus = 'registered' | 'active' | 'eliminated' | 'withdrawn';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type ChatMessageType = 'text' | 'emoji' | 'quick_chat' | 'system';

export type StatsPeriodType = 'daily' | 'weekly' | 'monthly' | 'season' | 'all_time';

// ============================================================================
// JSON COLUMN TYPES
// ============================================================================

/**
 * Game settings stored as JSON
 */
export interface GameSettingsJson {
  maxPlayers: number;
  roundTime: number;
  roundsToWin: number;
  mapId?: string | null;
  isPrivate: boolean;
  allowSpectators: boolean;
  startingBombs: number;
  startingRadius: number;
  startingSpeed: number;
  powerupFrequency: number;
  suddenDeathEnabled: boolean;
  suddenDeathTime: number;
}

/**
 * Game results stored as JSON
 */
export interface GameResultsJson {
  winnerId: string | null;
  winnerUsername?: string;
  rounds: Array<{
    roundNumber: number;
    winnerId: string | null;
    duration: number;
  }>;
  playerResults: Array<{
    playerId: string;
    username: string;
    placement: number;
    kills: number;
    deaths: number;
    roundsWon: number;
    eloChange: number;
  }>;
}

/**
 * Map data stored as JSON
 */
export interface MapDataJson {
  tiles: number[][];
  spawnPoints: Array<{ x: number; y: number; playerIndex: number }>;
  version: number;
}

/**
 * Achievement criteria stored as JSON
 */
export interface AchievementCriteriaJson {
  type: 'count' | 'streak' | 'single' | 'cumulative';
  stat: string;
  target: number;
  conditions?: Record<string, unknown>;
}

/**
 * Tournament prizes stored as JSON
 */
export type TournamentPrizesJson = Array<{
  placement: number;
  description: string;
  value?: number;
}>;

/**
 * Tournament requirements stored as JSON
 */
export interface TournamentRequirementsJson {
  minElo?: number;
  maxElo?: number;
  minGames?: number;
  minAccountAge?: number;
}

/**
 * Tournament bracket stored as JSON
 */
export interface TournamentBracketJson {
  type: TournamentFormat;
  totalRounds: number;
  currentRound: number;
  matches: Array<{
    id: string;
    round: number;
    matchNumber: number;
    player1Id?: string;
    player2Id?: string;
    winnerId?: string;
    status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
    gameId?: string;
    score?: { player1: number; player2: number };
  }>;
}

// ============================================================================
// DATABASE TYPE (Main export matching Supabase generated types)
// ============================================================================

/**
 * Complete database schema type
 * This structure matches what Supabase CLI generates
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      games: {
        Row: GameRow;
        Insert: GameInsert;
        Update: GameUpdate;
      };
      game_players: {
        Row: GamePlayerRow;
        Insert: GamePlayerInsert;
        Update: GamePlayerUpdate;
      };
      maps: {
        Row: MapRow;
        Insert: MapInsert;
        Update: MapUpdate;
      };
      achievements: {
        Row: AchievementRow;
        Insert: never; // Seeded only
        Update: never;
      };
      player_achievements: {
        Row: PlayerAchievementRow;
        Insert: PlayerAchievementInsert;
        Update: PlayerAchievementUpdate;
      };
      replays: {
        Row: ReplayRow;
        Insert: Omit<ReplayRow, 'id' | 'view_count' | 'is_featured' | 'created_at'>;
        Update: Pick<ReplayRow, 'view_count' | 'is_featured'>;
      };
      tournaments: {
        Row: TournamentRow;
        Insert: TournamentInsert;
        Update: TournamentUpdate;
      };
      tournament_participants: {
        Row: TournamentParticipantRow;
        Insert: TournamentParticipantInsert;
        Update: TournamentParticipantUpdate;
      };
      friendships: {
        Row: FriendshipRow;
        Insert: FriendshipInsert;
        Update: FriendshipUpdate;
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: ChatMessageInsert;
        Update: Pick<ChatMessageRow, 'is_deleted'>;
      };
      map_likes: {
        Row: MapLikeRow;
        Insert: MapLikeInsert;
        Update: never;
      };
      player_stats: {
        Row: PlayerStatsRow;
        Insert: never; // Computed/aggregated
        Update: never;
      };
    };
    Views: {
      leaderboard_elo: {
        Row: {
          rank: number;
          player_id: string;
          username: string;
          avatar_url: string | null;
          elo_rating: number;
          total_wins: number;
          total_games: number;
          win_rate: number;
          country: string | null;
        };
      };
      leaderboard_wins: {
        Row: {
          rank: number;
          player_id: string;
          username: string;
          avatar_url: string | null;
          total_wins: number;
          total_games: number;
          elo_rating: number;
        };
      };
      leaderboard_kills: {
        Row: {
          rank: number;
          player_id: string;
          username: string;
          avatar_url: string | null;
          total_kills: number;
          total_deaths: number;
          kd_ratio: number;
        };
      };
    };
    Functions: {
      increment_play_count: {
        Args: { map_id: string };
        Returns: void;
      };
      update_elo_ratings: {
        Args: { game_id: string };
        Returns: void;
      };
      get_player_rank: {
        Args: { player_id: string };
        Returns: number;
      };
      check_achievement_progress: {
        Args: { player_id: string; achievement_code: string };
        Returns: {
          is_unlocked: boolean;
          progress: number;
          target: number;
        };
      };
    };
    Enums: {
      game_status: GameStatus;
      achievement_rarity: AchievementRarity;
      achievement_category: AchievementCategory;
      tournament_status: TournamentStatus;
      tournament_format: TournamentFormat;
      tournament_participant_status: TournamentParticipantStatus;
      friendship_status: FriendshipStatus;
      chat_message_type: ChatMessageType;
      stats_period_type: StatsPeriodType;
    };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Extract row type from a table
 */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Extract insert type from a table
 */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Extract update type from a table
 */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/**
 * All table names
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * All view names
 */
export type ViewName = keyof Database['public']['Views'];

/**
 * All function names
 */
export type FunctionName = keyof Database['public']['Functions'];
