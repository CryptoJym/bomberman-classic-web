/**
 * Bomberman Online - Server TypeScript Types
 *
 * This file contains all type definitions for the game server.
 * These types are shared between server modules and can be imported by the client.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/** 2D position on the game grid */
export interface Position {
  x: number;
  y: number;
}

/** Cardinal directions for movement */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Tile types for the game board */
export enum TileType {
  EMPTY = 0,
  SOLID = 1, // Indestructible wall
  SOFT = 2, // Destructible block
}

/** Power-up types that can be collected */
export type PowerupType =
  | 'bomb_up' // +1 max bombs
  | 'fire_up' // +1 explosion radius
  | 'speed_up' // +movement speed
  | 'kick' // Can kick bombs
  | 'punch' // Can throw bombs
  | 'shield' // One-hit protection
  | 'skull'; // Random debuff

// =============================================================================
// PLAYER TYPES
// =============================================================================

/** Player state within a game */
export interface Player {
  /** Unique player ID (UUID) */
  id: string;

  /** Clerk user ID for authentication */
  clerkId: string;

  /** Display name */
  name: string;

  /** Player color (hex) */
  color: string;

  /** Optional avatar URL */
  avatarUrl?: string;

  /** Current grid position */
  position: Position;

  /** Facing direction */
  direction: Direction;

  /** Whether player is alive this round */
  isAlive: boolean;

  /** Respawn timestamp (0 if not respawning) */
  respawnAt: number;

  /** Player statistics */
  stats: PlayerStats;

  /** Active powerup effects */
  powerups: PowerupEffects;

  /** Number of bombs currently placed */
  activeBombs: number;

  /** Last processed input sequence number */
  lastInputSeq: number;

  /** Connection state */
  connectionState: ConnectionState;

  /** Time of last activity (for AFK detection) */
  lastActivityAt: number;
}

/** Player statistics tracked per game */
export interface PlayerStats {
  kills: number;
  deaths: number;
  wins: number;
  gamesPlayed: number;
  bombsPlaced: number;
  powerupsCollected: number;
}

/** Active powerup effects on a player */
export interface PowerupEffects {
  /** Maximum bombs player can place */
  maxBombs: number;

  /** Explosion radius in tiles */
  bombRadius: number;

  /** Movement cooldown in ms (lower = faster) */
  moveCooldownMs: number;

  /** Can kick bombs */
  canKick: boolean;

  /** Can punch/throw bombs */
  canPunch: boolean;

  /** Has shield (one-hit protection) */
  hasShield: boolean;

  /** Skull effect active */
  skullEffect?: SkullEffect;
}

/** Possible skull (debuff) effects */
export type SkullEffect =
  | 'slow' // Reduced speed
  | 'reverse' // Reversed controls
  | 'diarrhea' // Auto bomb placement
  | 'short_fuse' // Faster bomb explosion
  | 'no_bombs'; // Cannot place bombs

/** Player connection state */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

// =============================================================================
// BOMB TYPES
// =============================================================================

/** Bomb entity */
export interface Bomb {
  /** Unique bomb ID */
  id: string;

  /** Owner player ID */
  ownerId: string;

  /** Grid position */
  position: Position;

  /** Explosion radius in tiles */
  radius: number;

  /** Fuse time in ms */
  fuseTime: number;

  /** Timestamp when bomb was placed */
  plantedAt: number;

  /** Timestamp when bomb will explode */
  explodeAt: number;

  /** Whether bomb has exploded */
  exploded: boolean;

  /** Bomb state for animations */
  state: BombState;

  /** If kicked, direction of movement */
  kickDirection?: Direction;

  /** If kicked, current movement position (sub-grid) */
  kickProgress?: number;
}

/** Bomb lifecycle state */
export type BombState = 'planted' | 'exploding' | 'removed';

// =============================================================================
// POWERUP TYPES
// =============================================================================

/** Powerup entity on the game board */
export interface Powerup {
  /** Unique powerup ID */
  id: string;

  /** Grid position */
  position: Position;

  /** Type of powerup */
  type: PowerupType;

  /** Timestamp when spawned */
  spawnedAt: number;
}

// =============================================================================
// EXPLOSION TYPES
// =============================================================================

/** Explosion entity (visual effect) */
export interface Explosion {
  /** Unique explosion ID */
  id: string;

  /** All cells affected by this explosion */
  cells: Position[];

  /** Timestamp when explosion started */
  startedAt: number;

  /** Timestamp when explosion ends */
  expiresAt: number;

  /** Chain depth (for visual effects) */
  chainDepth: number;

  /** Source bomb ID */
  sourceBombId: string;
}

// =============================================================================
// MAP TYPES
// =============================================================================

/** Game map/board structure */
export interface GameMap {
  /** Unique map ID */
  id: string;

  /** Map name */
  name: string;

  /** Width in tiles */
  width: number;

  /** Height in tiles */
  height: number;

  /** 2D tile array [y][x] */
  tiles: TileType[][];

  /** Valid spawn positions */
  spawnPoints: Position[];

  /** Whether this is an official map */
  isOfficial: boolean;

  /** Creator ID (if custom map) */
  creatorId?: string;
}

// =============================================================================
// GAME STATE TYPES
// =============================================================================

/** Complete game state at a point in time */
export interface GameState {
  /** Current server tick number */
  tick: number;

  /** Server timestamp */
  serverTime: number;

  /** Current game phase */
  phase: GamePhase;

  /** Game map */
  map: GameMap;

  /** All players (by ID) */
  players: Map<string, Player>;

  /** All active bombs (by ID) */
  bombs: Map<string, Bomb>;

  /** All spawned powerups (by ID) */
  powerups: Map<string, Powerup>;

  /** Active explosions */
  explosions: Explosion[];

  /** Round information */
  round: RoundState;
}

/** Game phase states */
export type GamePhase =
  | 'waiting' // In lobby, waiting for players
  | 'countdown' // All ready, counting down
  | 'playing' // Active gameplay
  | 'intermission' // Between rounds
  | 'finished'; // Match complete

/** Round state within a match */
export interface RoundState {
  /** Current round number */
  number: number;

  /** Rounds needed to win */
  roundsToWin: number;

  /** Time remaining in round (ms) */
  timeRemainingMs: number;

  /** Winner of current/last round */
  winnerId: string | null;

  /** Scores per player */
  scores: Record<string, number>;

  /** Phase within the round */
  phase: RoundPhase;
}

/** Round phase states */
export type RoundPhase =
  | 'setup'
  | 'countdown'
  | 'active'
  | 'ending'
  | 'results';

// =============================================================================
// ROOM TYPES
// =============================================================================

/** Game room */
export interface Room {
  /** Unique room ID */
  id: string;

  /** Human-readable room code (e.g., "ABCD") */
  roomCode: string;

  /** Host player ID */
  hostId: string;

  /** Room settings */
  settings: RoomSettings;

  /** Room status */
  status: RoomStatus;

  /** Creation timestamp */
  createdAt: number;

  /** Last activity timestamp */
  lastActivityAt: number;

  /** Players in room */
  players: Map<string, Player>;

  /** Spectators watching */
  spectators: Map<string, Spectator>;

  /** Current game state (if playing) */
  gameState: GameState | null;

  /** Chat history */
  chatHistory: ChatMessage[];

  /** Replay recorder */
  replayData: ReplayFrame[];
}

/** Room settings configurable by host */
export interface RoomSettings {
  /** Maximum players allowed */
  maxPlayers: number;

  /** Round time limit in seconds */
  roundTime: number;

  /** Rounds needed to win match */
  roundsToWin: number;

  /** Custom map ID (null for random) */
  mapId: string | null;

  /** Whether room is private */
  isPrivate: boolean;

  /** Allow spectators */
  allowSpectators: boolean;

  /** Game mode */
  gameMode: GameMode;

  /** Power-up spawn settings */
  powerupSettings: PowerupSettings;
}

/** Room status */
export type RoomStatus =
  | 'waiting' // Accepting players
  | 'countdown' // Starting soon
  | 'playing' // Game in progress
  | 'intermission' // Between rounds
  | 'finished' // Match complete
  | 'closed'; // Room closed

/** Game modes */
export type GameMode =
  | 'ffa' // Free-for-all
  | 'team_2v2' // 2v2 teams
  | 'team_4v4' // 4v4 teams
  | 'battle_royale'; // Last man standing with shrinking zone

/** Powerup spawn configuration */
export interface PowerupSettings {
  /** Chance to spawn when block destroyed (0-1) */
  spawnChance: number;

  /** Enabled powerup types */
  enabledTypes: PowerupType[];

  /** Maximum powerups on map at once */
  maxOnMap: number;
}

// =============================================================================
// SPECTATOR TYPES
// =============================================================================

/** Spectator watching a game */
export interface Spectator {
  /** Unique spectator ID */
  id: string;

  /** User ID if authenticated */
  userId?: string;

  /** Display name */
  name: string;

  /** Currently focused player ID */
  focusPlayerId: string | null;

  /** Camera position (for free cam) */
  cameraPosition: Position;

  /** Join timestamp */
  joinedAt: number;
}

// =============================================================================
// CHAT TYPES
// =============================================================================

/** Chat message */
export interface ChatMessage {
  /** Unique message ID */
  id: string;

  /** Sender player ID */
  senderId: string;

  /** Sender display name */
  senderName: string;

  /** Message content */
  content: string;

  /** Chat channel */
  channel: ChatChannel;

  /** Message timestamp */
  timestamp: number;

  /** Message type */
  type: ChatMessageType;
}

/** Chat channels */
export type ChatChannel =
  | 'room' // All players in room
  | 'team' // Team only
  | 'spectator' // Spectators only
  | 'system'; // System messages

/** Chat message types */
export type ChatMessageType =
  | 'text' // Regular text
  | 'emoji' // Emoji only
  | 'system' // System announcement
  | 'kill'; // Kill notification

// =============================================================================
// REPLAY TYPES
// =============================================================================

/** Single frame of replay data */
export interface ReplayFrame {
  /** Tick number */
  tick: number;

  /** Timestamp */
  timestamp: number;

  /** Player inputs this frame */
  inputs: PlayerInput[];

  /** Game events this frame */
  events: GameEvent[];

  /** State hash for verification */
  stateHash: string;
}

/** Player input for replay */
export interface PlayerInput {
  playerId: string;
  seq: number;
  type: InputType;
  direction?: Direction;
  timestamp: number;
}

/** Input types */
export type InputType = 'move' | 'stop' | 'bomb' | 'kick' | 'punch';

/** Game events for replay */
export interface GameEvent {
  type: GameEventType;
  tick: number;
  data: Record<string, unknown>;
}

/** Game event types */
export type GameEventType =
  | 'player_spawn'
  | 'player_move'
  | 'player_death'
  | 'bomb_placed'
  | 'bomb_exploded'
  | 'powerup_spawned'
  | 'powerup_collected'
  | 'block_destroyed'
  | 'round_start'
  | 'round_end'
  | 'game_end';

// =============================================================================
// MESSAGE TYPES - CLIENT TO SERVER
// =============================================================================

/** All client -> server message types */
export type ClientMessage =
  | JoinMessage
  | MoveMessage
  | StopMessage
  | BombMessage
  | ChatClientMessage
  | ReadyMessage
  | SpectateMessage
  | PingMessage
  | SettingsMessage
  | KickMessage
  | LeaveMessage
  | InputMessage;

/** Join room request */
export interface JoinMessage {
  type: 'join';
  roomCode?: string;
  createPrivate?: boolean;
  settings?: Partial<RoomSettings>;
}

/** Movement input */
export interface MoveMessage {
  type: 'move';
  direction: Direction;
  seq: number;
}

/** Stop movement */
export interface StopMessage {
  type: 'stop';
  seq: number;
}

/** Place bomb */
export interface BombMessage {
  type: 'bomb';
  seq: number;
}

/** Send chat message */
export interface ChatClientMessage {
  type: 'chat';
  content: string;
  channel: ChatChannel;
}

/** Ready toggle */
export interface ReadyMessage {
  type: 'ready';
  ready: boolean;
}

/** Join as spectator */
export interface SpectateMessage {
  type: 'spectate';
  roomCode: string;
  targetPlayerId?: string;
}

/** Latency ping */
export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

/** Update room settings */
export interface SettingsMessage {
  type: 'settings';
  settings: Partial<RoomSettings>;
}

/** Kick player */
export interface KickMessage {
  type: 'kick';
  playerId: string;
  reason?: string;
}

/** Leave room */
export interface LeaveMessage {
  type: 'leave';
}

/** Combined input (legacy) */
export interface InputMessage {
  type: 'input';
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  bomb: boolean;
  seq: number;
}

// =============================================================================
// MESSAGE TYPES - SERVER TO CLIENT
// =============================================================================

/** All server -> client message types */
export type ServerMessage =
  | StateMessage
  | DeltaMessage
  | JoinedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage
  | GameEndMessage
  | ExplosionEventMessage
  | DeathMessage
  | PowerupSpawnMessage
  | PowerupCollectMessage
  | ChatBroadcastMessage
  | PongMessage
  | ErrorMessage
  | SettingsUpdatedMessage
  | ReadyStateMessage
  | CountdownMessage
  | SpectatorEventMessage
  | AchievementUnlockedMessage;

/** Full game state */
export interface StateMessage {
  type: 'state';
  tick: number;
  serverTime: number;
  lastProcessedInput: number;
  phase: GamePhase;
  players: SerializedPlayer[];
  bombs: SerializedBomb[];
  powerups: SerializedPowerup[];
  explosions: SerializedExplosion[];
  board?: SerializedBoard;
  round: SerializedRound;
}

/** State delta (optimization) */
export interface DeltaMessage {
  type: 'delta';
  tick: number;
  baseTick: number;
  players?: Partial<Record<string, Partial<SerializedPlayer> | null>>;
  bombs?: {
    added?: SerializedBomb[];
    removed?: string[];
  };
  powerups?: {
    added?: SerializedPowerup[];
    removed?: string[];
  };
  explosions?: SerializedExplosion[];
  tiles?: Array<{ x: number; y: number; type: TileType }>;
}

/** Room join confirmation */
export interface JoinedMessage {
  type: 'joined';
  playerId: string;
  roomCode: string;
  isHost: boolean;
  roomState: {
    settings: RoomSettings;
    players: SerializedPlayerInfo[];
    spectators: SerializedSpectatorInfo[];
    phase: GamePhase;
  };
  reconnectToken?: string;
}

/** Player join notification */
export interface PlayerJoinedMessage {
  type: 'player_joined';
  player: SerializedPlayerInfo;
}

/** Player leave notification */
export interface PlayerLeftMessage {
  type: 'player_left';
  playerId: string;
  reason: 'left' | 'kicked' | 'disconnected' | 'timeout';
  newHostId?: string;
}

/** Game start notification */
export interface GameStartMessage {
  type: 'game_start';
  countdownMs: number;
  map: SerializedBoard;
  spawnPositions: Record<string, Position>;
}

/** Game end notification */
export interface GameEndMessage {
  type: 'game_end';
  winnerId: string | null;
  winnerName: string | null;
  reason: 'elimination' | 'timeout' | 'forfeit';
  finalScores: Record<string, number>;
  stats: GameStats;
  eloChanges: Record<string, number>;
  replayId?: string;
}

/** Explosion event */
export interface ExplosionEventMessage {
  type: 'explosion';
  bombId: string;
  cells: Position[];
  chainCount: number;
}

/** Player death event */
export interface DeathMessage {
  type: 'death';
  playerId: string;
  playerName: string;
  killerId: string | null;
  killerName: string | null;
  position: Position;
  placement: number;
}

/** Powerup spawn event */
export interface PowerupSpawnMessage {
  type: 'powerup_spawn';
  powerup: SerializedPowerup;
}

/** Powerup collect event */
export interface PowerupCollectMessage {
  type: 'powerup_collect';
  powerupId: string;
  playerId: string;
  playerName: string;
  type: PowerupType;
}

/** Chat message broadcast */
export interface ChatBroadcastMessage {
  type: 'chat';
  senderId: string;
  senderName: string;
  content: string;
  channel: ChatChannel;
  timestamp: number;
}

/** Pong response */
export interface PongMessage {
  type: 'pong';
  clientTimestamp: number;
  serverTimestamp: number;
}

/** Error message */
export interface ErrorMessage {
  type: 'error';
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Settings updated notification */
export interface SettingsUpdatedMessage {
  type: 'settings_updated';
  settings: RoomSettings;
}

/** Ready state update */
export interface ReadyStateMessage {
  type: 'ready_state';
  playerId: string;
  ready: boolean;
  allReady: boolean;
}

/** Countdown tick */
export interface CountdownMessage {
  type: 'countdown';
  secondsRemaining: number;
}

/** Spectator join/leave event */
export interface SpectatorEventMessage {
  type: 'spectator_joined' | 'spectator_left';
  spectator: SerializedSpectatorInfo;
  totalSpectators: number;
}

/** Achievement unlock notification */
export interface AchievementUnlockedMessage {
  type: 'achievement_unlocked';
  playerId: string;
  playerName: string;
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
  };
}

// =============================================================================
// SERIALIZED TYPES (for network transmission)
// =============================================================================

/** Serialized player state */
export interface SerializedPlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  direction: Direction;
  isAlive: boolean;
  stats: {
    kills: number;
    deaths: number;
    wins: number;
  };
  maxBombs: number;
  bombRadius: number;
  speed: number;
  hasShield: boolean;
}

/** Serialized player info (lobby) */
export interface SerializedPlayerInfo {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  eloRating: number;
  isReady: boolean;
  isHost: boolean;
}

/** Serialized spectator info */
export interface SerializedSpectatorInfo {
  id: string;
  name: string;
}

/** Serialized bomb state */
export interface SerializedBomb {
  id: string;
  x: number;
  y: number;
  ownerId: string;
  radius: number;
  fuseTimeMs: number;
}

/** Serialized powerup state */
export interface SerializedPowerup {
  id: string;
  x: number;
  y: number;
  type: PowerupType;
}

/** Serialized explosion state */
export interface SerializedExplosion {
  id: string;
  cells: Position[];
  remainingMs: number;
}

/** Serialized board state */
export interface SerializedBoard {
  width: number;
  height: number;
  tiles: TileType[][];
}

/** Serialized round state */
export interface SerializedRound {
  number: number;
  phase: RoundPhase;
  countdownMs?: number;
  winnerId?: string;
  scores: Record<string, number>;
  timeRemainingMs: number;
}

// =============================================================================
// ERROR CODES
// =============================================================================

/** Error code enumeration */
export enum ErrorCode {
  // Connection errors (1000-1999)
  AUTH_FAILED = 1001,
  AUTH_REQUIRED = 1002,
  CONNECTION_LIMIT = 1003,

  // Room errors (2000-2999)
  ROOM_NOT_FOUND = 2001,
  ROOM_FULL = 2002,
  ROOM_IN_PROGRESS = 2003,
  ROOM_CLOSED = 2004,
  NOT_HOST = 2005,

  // Game errors (3000-3999)
  INVALID_ACTION = 3001,
  RATE_LIMITED = 3002,
  INVALID_INPUT = 3003,

  // Server errors (4000-4999)
  SERVER_FULL = 4001,
  SERVER_ERROR = 4002,
  MAINTENANCE = 4003,
}

// =============================================================================
// MATCHMAKING TYPES
// =============================================================================

/** Queue types for matchmaking */
export type QueueType =
  | 'casual_ffa'
  | 'casual_team'
  | 'ranked_ffa'
  | 'ranked_2v2'
  | 'ranked_4v4';

/** Matchmaking regions */
export type Region =
  | 'na-east'
  | 'na-west'
  | 'eu-west'
  | 'eu-central'
  | 'ap-southeast'
  | 'ap-northeast';

/** Queue entry */
export interface QueueEntry {
  id: string;
  playerId: string;
  partyIds?: string[];
  queueType: QueueType;
  region: Region;
  eloRating: number;
  queuedAt: number;
  expandLevel: number;
  priority: number;
}

/** Match formation result */
export interface Match {
  id: string;
  players: QueueEntry[];
  averageElo: number;
  region: Region;
  serverId: string;
  roomCode: string;
  createdAt: number;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/** Server configuration */
export interface ServerConfig {
  port: number;
  tickRate: number;
  maxRooms: number;
  maxPlayersPerRoom: number;
  socketTimeout: number;
  heartbeatInterval: number;

  game: GameConfig;
  matchmaking: MatchmakingConfig;
  rateLimit: RateLimitConfig;
}

/** Game configuration */
export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  bombFuseMs: number;
  explosionDurationMs: number;
  defaultMoveCooldownMs: number;
  defaultBombRadius: number;
  defaultMaxBombs: number;
  intermissionMs: number;
  countdownSeconds: number;
  roundTimeSeconds: number;
}

/** Matchmaking configuration */
export interface MatchmakingConfig {
  initialElo: number;
  initialSearchRange: number;
  maxSearchRange: number;
  rangeExpandIntervalMs: number;
  rangeExpandAmount: number;
  acceptTimeoutMs: number;
  queueTimeoutMs: number;
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  move: { maxPerSecond: number; burstAllowance: number };
  bomb: { maxPerSecond: number; burstAllowance: number };
  chat: { maxPerSecond: number; burstAllowance: number };
  global: { maxPerSecond: number; burstAllowance: number };
}

// =============================================================================
// STATISTICS TYPES
// =============================================================================

/** Game statistics */
export interface GameStats {
  duration: number;
  totalKills: number;
  bombsPlaced: number;
  powerupsCollected: number;
  mvpId: string;
  playerStats: Record<string, PlayerGameStats>;
}

/** Per-player game statistics */
export interface PlayerGameStats {
  kills: number;
  deaths: number;
  bombsPlaced: number;
  powerupsCollected: number;
  survivalTime: number;
  damageDealt: number;
}

/** Achievement rarity levels */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** Connection state for WebSocket */
export interface Connection {
  id: string;
  ws: WebSocket;
  playerId: string | null;
  roomId: string | null;
  connectedAt: number;
  lastPingAt: number;
  latencyMs: number;
}

/** Token bucket for rate limiting */
export interface TokenBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
}

/** Reconnection token */
export interface ReconnectToken {
  playerId: string;
  roomId: string;
  sessionId: string;
  expiresAt: number;
  signature: string;
}
