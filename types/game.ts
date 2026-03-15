/**
 * Core Game Types for Bomberman Online
 * These types define the fundamental game state and entities
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

/**
 * 2D position in tile coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 2D position in pixel coordinates for rendering
 */
export interface PixelPosition {
  x: number;
  y: number;
}

/**
 * Movement direction
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Cardinal and ordinal directions for explosion spread
 */
export type CardinalDirection = 'north' | 'south' | 'east' | 'west';

// ============================================================================
// TILE TYPES
// ============================================================================

/**
 * Types of tiles on the game map
 */
export type TileType = 'empty' | 'wall' | 'block' | 'spawn';

/**
 * Tile visual variants for rendering variety
 */
export type TileVariant = 0 | 1 | 2 | 3;

/**
 * Single tile on the game map
 */
export interface Tile {
  /** Type of tile */
  type: TileType;
  /** Visual variant for rendering */
  variant?: TileVariant;
  /** Hidden powerup that spawns when block is destroyed */
  hiddenPowerup?: PowerupType;
  /** Whether the tile is currently being destroyed */
  isDestroying?: boolean;
  /** Destruction animation frame (0-5) */
  destructionFrame?: number;
}

// ============================================================================
// POWERUP TYPES
// ============================================================================

/**
 * Available powerup types in the game
 */
export type PowerupType =
  | 'bomb_up'    // +1 max bomb
  | 'fire_up'    // +1 explosion radius
  | 'speed_up'   // +movement speed
  | 'kick'       // Kick bombs on collision
  | 'punch'      // Throw/punch bombs
  | 'shield'     // One-hit protection
  | 'skull';     // Random negative effect (skull curse)

/**
 * Skull curse effects (negative powerups)
 */
export type SkullEffect =
  | 'slow'           // Reduced movement speed
  | 'reverse'        // Reversed controls
  | 'diarrhea'       // Auto-place bombs
  | 'constipation'   // Cannot place bombs
  | 'low_power'      // Minimum explosion radius
  | 'rapid_bombs';   // Auto-place bombs rapidly

/**
 * Powerup entity on the map
 */
export interface Powerup {
  /** Unique identifier */
  id: string;
  /** Type of powerup */
  type: PowerupType;
  /** Position on the map (tile coordinates) */
  position: Position;
  /** Timestamp when spawned */
  spawnedAt: number;
  /** Animation frame for bobbing effect */
  animationFrame?: number;
}

// ============================================================================
// PLAYER TYPES
// ============================================================================

/**
 * Player color index for character selection
 */
export type PlayerColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Player animation state
 */
export type PlayerAnimationState =
  | 'idle'
  | 'walk'
  | 'place_bomb'
  | 'death'
  | 'victory'
  | 'stunned';

/**
 * Player entity - core player state
 */
export interface Player {
  /** Unique player ID (UUID) */
  id: string;
  /** Clerk user ID for authentication */
  clerkId: string;
  /** Display username */
  username: string;
  /** Current position (tile coordinates, can be fractional for smooth movement) */
  position: Position;
  /** Facing direction */
  direction: Direction;
  /** Whether player is alive */
  isAlive: boolean;
  /** Current bombs placed (active on map) */
  activeBombs: number;
  /** Maximum bombs player can place */
  maxBombs: number;
  /** Explosion radius in tiles */
  explosionRadius: number;
  /** Movement speed multiplier (1.0 = base speed) */
  speed: number;
  /** Collected powerups */
  powerups: PowerupType[];
  /** Character color index */
  color: PlayerColor;
  /** Whether player has shield active */
  hasShield: boolean;
  /** Whether player can kick bombs */
  canKick: boolean;
  /** Whether player can punch/throw bombs */
  canPunch: boolean;
  /** Current skull effect (if any) */
  skullEffect?: SkullEffect;
  /** Skull effect expiration timestamp */
  skullEffectExpiresAt?: number;
  /** Current animation state */
  animationState: PlayerAnimationState;
  /** Animation frame index */
  animationFrame: number;
  /** Kills this round/game */
  kills: number;
  /** Deaths this round/game */
  deaths: number;
  /** Player's spawn point index */
  spawnIndex: number;
  /** Last input sequence number processed (for reconciliation) */
  lastProcessedInput?: number;
  /** Whether player is ready in lobby */
  isReady?: boolean;
  /** Whether player is the room host */
  isHost?: boolean;
  /** Player's ping latency in ms */
  ping?: number;
}

/**
 * Minimal player data for spectators and lobby
 */
export interface PlayerSummary {
  id: string;
  username: string;
  color: PlayerColor;
  isAlive: boolean;
  kills: number;
  isReady?: boolean;
  isHost?: boolean;
}

// ============================================================================
// BOMB TYPES
// ============================================================================

/**
 * Bomb state
 */
export type BombState = 'planted' | 'exploding' | 'moving';

/**
 * Bomb entity
 */
export interface Bomb {
  /** Unique bomb ID */
  id: string;
  /** Player who planted the bomb */
  ownerId: string;
  /** Position on the map (tile coordinates) */
  position: Position;
  /** Explosion radius in tiles */
  radius: number;
  /** Time until explosion in milliseconds */
  fuseTime: number;
  /** Timestamp when bomb was planted */
  plantedAt: number;
  /** Current bomb state */
  state: BombState;
  /** If kicked/punched, movement direction */
  moveDirection?: Direction;
  /** Animation frame for wobble/fuse */
  animationFrame?: number;
  /** Whether this bomb was remotely detonated */
  isRemoteDetonated?: boolean;
}

// ============================================================================
// EXPLOSION TYPES
// ============================================================================

/**
 * Explosion segment type for rendering
 */
export type ExplosionSegmentType = 'center' | 'horizontal' | 'vertical' | 'end_up' | 'end_down' | 'end_left' | 'end_right';

/**
 * Single explosion segment
 */
export interface ExplosionSegment {
  /** Position of this segment */
  position: Position;
  /** Type of segment for rendering */
  type: ExplosionSegmentType;
}

/**
 * Full explosion entity
 */
export interface Explosion {
  /** Unique explosion ID */
  id: string;
  /** Center position */
  position: Position;
  /** Player who caused the explosion */
  ownerId: string;
  /** All segments of the explosion */
  segments: ExplosionSegment[];
  /** Timestamp when explosion started */
  startedAt: number;
  /** Duration of explosion in milliseconds */
  duration: number;
  /** Current animation frame */
  animationFrame: number;
}

// ============================================================================
// MAP TYPES
// ============================================================================

/**
 * Spawn point configuration
 */
export interface SpawnPoint {
  /** Position on the map */
  position: Position;
  /** Player index (0-15) this spawn is for */
  playerIndex: number;
}

/**
 * Game map definition
 */
export interface GameMap {
  /** Unique map ID */
  id: string;
  /** Map display name */
  name: string;
  /** Map description */
  description?: string;
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** 2D array of tiles [y][x] */
  tiles: Tile[][];
  /** Spawn points for players */
  spawnPoints: SpawnPoint[];
  /** Whether this is an official map */
  isOfficial: boolean;
  /** Creator's user ID (if community map) */
  creatorId?: string;
  /** Creator's username */
  creatorUsername?: string;
  /** Number of times this map has been played */
  playCount: number;
  /** Number of likes */
  likes: number;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Maximum players supported */
  maxPlayers: number;
  /** Recommended player count */
  recommendedPlayers?: number;
  /** Map version for updates */
  version: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Compact map data for transmission
 */
export interface CompactMapData {
  width: number;
  height: number;
  /** Encoded tile data (flat array, type + variant per tile) */
  tileData: number[];
  /** Spawn points */
  spawns: Position[];
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

/**
 * Game phase/lifecycle state
 */
export type GamePhase =
  | 'waiting'      // Waiting for players in lobby
  | 'starting'     // Countdown before game starts
  | 'countdown'    // 3-2-1 countdown
  | 'playing'      // Active gameplay
  | 'sudden_death' // Shrinking map phase
  | 'round_end'    // Round finished, showing results
  | 'intermission' // Between rounds
  | 'finished';    // Game completely over

/**
 * Round result data
 */
export interface RoundResult {
  /** Round number */
  roundNumber: number;
  /** Winner player ID (null if draw) */
  winnerId: string | null;
  /** Winner's username */
  winnerUsername?: string;
  /** Round duration in seconds */
  duration: number;
  /** Kill/death stats per player */
  playerStats: Record<string, { kills: number; deaths: number; placement: number }>;
}

/**
 * Full authoritative game state (server-side)
 */
export interface GameState {
  /** Current server tick number */
  tick: number;
  /** Current game phase */
  phase: GamePhase;
  /** Current map */
  map: GameMap;
  /** All players (keyed by player ID) */
  players: Record<string, Player>;
  /** All active bombs (keyed by bomb ID) */
  bombs: Record<string, Bomb>;
  /** All powerups on map (keyed by powerup ID) */
  powerups: Record<string, Powerup>;
  /** Active explosions */
  explosions: Explosion[];
  /** Current round number */
  currentRound: number;
  /** Rounds needed to win */
  roundsToWin: number;
  /** Round wins per player */
  roundWins: Record<string, number>;
  /** Time remaining in current phase (ms) */
  timeRemaining: number;
  /** Results of completed rounds */
  roundResults: RoundResult[];
  /** Sudden death shrink level (0 = none) */
  suddenDeathLevel: number;
  /** Last processed input sequence per player */
  lastProcessedInputs: Record<string, number>;
}

/**
 * Partial game state for client updates (delta compression)
 */
export interface GameStateDelta {
  tick: number;
  phase?: GamePhase;
  players?: Record<string, Partial<Player>>;
  bombs?: Record<string, Bomb>;
  bombsRemoved?: string[];
  powerups?: Record<string, Powerup>;
  powerupsRemoved?: string[];
  explosions?: Explosion[];
  tilesChanged?: Array<{ x: number; y: number; tile: Tile }>;
  timeRemaining?: number;
  suddenDeathLevel?: number;
}

// ============================================================================
// ROOM TYPES
// ============================================================================

/**
 * Game room visibility
 */
export type RoomVisibility = 'public' | 'private';

/**
 * Room settings configuration
 */
export interface RoomSettings {
  /** Maximum players (2-16) */
  maxPlayers: number;
  /** Round time limit in seconds */
  roundTime: number;
  /** Rounds needed to win the match */
  roundsToWin: number;
  /** Selected map ID (null for random) */
  mapId?: string | null;
  /** Whether room is private */
  isPrivate: boolean;
  /** Whether spectators can join */
  allowSpectators: boolean;
  /** Starting bomb count */
  startingBombs: number;
  /** Starting explosion radius */
  startingRadius: number;
  /** Starting speed multiplier */
  startingSpeed: number;
  /** Powerup spawn frequency (0-1) */
  powerupFrequency: number;
  /** Whether sudden death is enabled */
  suddenDeathEnabled: boolean;
  /** Seconds before sudden death starts */
  suddenDeathTime: number;
  /** Room password (if private) */
  password?: string;
}

/**
 * Default room settings
 */
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 4,
  roundTime: 180,
  roundsToWin: 3,
  mapId: null,
  isPrivate: false,
  allowSpectators: true,
  startingBombs: 1,
  startingRadius: 1,
  startingSpeed: 1.0,
  powerupFrequency: 0.5,
  suddenDeathEnabled: true,
  suddenDeathTime: 120,
};

/**
 * Room state for lobby display
 */
export interface RoomState {
  /** Unique room ID */
  id: string;
  /** Room code for joining */
  roomCode: string;
  /** Host player ID */
  hostId: string;
  /** Room settings */
  settings: RoomSettings;
  /** Current phase */
  phase: GamePhase;
  /** Players in room */
  players: PlayerSummary[];
  /** Spectators in room */
  spectators: Array<{ id: string; username: string }>;
  /** Selected map info */
  map?: {
    id: string;
    name: string;
    thumbnailUrl?: string;
  };
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Room list item for browsing
 */
export interface RoomListItem {
  id: string;
  roomCode: string;
  hostUsername: string;
  playerCount: number;
  maxPlayers: number;
  mapName: string;
  phase: GamePhase;
  isPrivate: boolean;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Player input actions
 */
export type InputAction = 'move' | 'stop' | 'bomb' | 'special';

/**
 * Player input data
 */
export interface PlayerInput {
  /** Input action type */
  action: InputAction;
  /** Direction (for move actions) */
  direction?: Direction;
  /** Input sequence number for reconciliation */
  sequence: number;
  /** Client timestamp */
  timestamp: number;
}

/**
 * Processed input result (server response)
 */
export interface InputResult {
  /** Input sequence that was processed */
  sequence: number;
  /** Resulting player position */
  position: Position;
  /** Whether input was accepted */
  accepted: boolean;
  /** Reason if rejected */
  rejectReason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Game configuration constants
 */
export const GAME_CONSTANTS = {
  /** Tile size in pixels */
  TILE_SIZE: 32,
  /** Default map width in tiles */
  DEFAULT_MAP_WIDTH: 15,
  /** Default map height in tiles */
  DEFAULT_MAP_HEIGHT: 13,
  /** Server tick rate in Hz */
  SERVER_TICK_RATE: 20,
  /** Tick interval in ms */
  TICK_INTERVAL: 50,
  /** Base bomb fuse time in ms */
  BOMB_FUSE_TIME: 3000,
  /** Explosion duration in ms */
  EXPLOSION_DURATION: 500,
  /** Base player speed (tiles per second) */
  BASE_PLAYER_SPEED: 3,
  /** Speed powerup increment */
  SPEED_INCREMENT: 0.3,
  /** Max player speed multiplier */
  MAX_PLAYER_SPEED: 2.5,
  /** Max bombs a player can have */
  MAX_BOMBS: 8,
  /** Max explosion radius */
  MAX_EXPLOSION_RADIUS: 8,
  /** Skull effect duration in ms */
  SKULL_EFFECT_DURATION: 10000,
  /** Respawn invincibility duration in ms */
  RESPAWN_INVINCIBILITY: 2000,
  /** Sudden death shrink interval in ms */
  SUDDEN_DEATH_INTERVAL: 5000,
} as const;

/**
 * Powerup spawn chances (must sum to 1.0)
 */
export const POWERUP_SPAWN_CHANCES: Record<PowerupType, number> = {
  bomb_up: 0.25,
  fire_up: 0.25,
  speed_up: 0.20,
  kick: 0.10,
  punch: 0.08,
  shield: 0.07,
  skull: 0.05,
} as const;
