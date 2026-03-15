/**
 * WebSocket Message Types for Bomberman Online
 * Defines all client -> server and server -> client message types
 * Uses discriminated unions for type-safe message handling
 */

import type {
  Direction,
  Player,
  PlayerSummary,
  Bomb,
  Powerup,
  Explosion,
  GamePhase,
  RoomState,
  RoomSettings,
  GameState,
  GameStateDelta,
  Position,
  RoundResult,
  GameMap,
  PlayerColor,
  InputResult,
} from './game';
import type { AchievementUnlock, PlayerGameResult } from './api';

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Base message interface with type discriminator
 */
interface BaseMessage {
  /** Message type discriminator */
  type: string;
}

/**
 * Message with sequence number for client-side prediction
 */
interface SequencedMessage extends BaseMessage {
  /** Input sequence number for reconciliation */
  seq: number;
}

/**
 * Authentication token payload
 */
export interface AuthPayload {
  /** Clerk session token */
  token: string;
  /** User's Clerk ID */
  clerkId: string;
}

// ============================================================================
// CLIENT -> SERVER MESSAGES
// ============================================================================

/**
 * Join a game room
 */
export interface JoinRoomMessage extends BaseMessage {
  type: 'join_room';
  /** Room code to join */
  roomCode: string;
  /** Authentication token */
  auth: AuthPayload;
  /** Join as spectator */
  asSpectator?: boolean;
  /** Room password (if private) */
  password?: string;
}

/**
 * Create a new game room
 */
export interface CreateRoomMessage extends BaseMessage {
  type: 'create_room';
  /** Authentication token */
  auth: AuthPayload;
  /** Room settings */
  settings: Partial<RoomSettings>;
}

/**
 * Leave the current room
 */
export interface LeaveRoomMessage extends BaseMessage {
  type: 'leave_room';
}

/**
 * Player movement input
 */
export interface MoveMessage extends SequencedMessage {
  type: 'move';
  /** Movement direction */
  direction: Direction;
  /** Client timestamp for latency calculation */
  timestamp: number;
}

/**
 * Player stop moving
 */
export interface StopMessage extends SequencedMessage {
  type: 'stop';
  /** Client timestamp */
  timestamp: number;
}

/**
 * Place a bomb
 */
export interface PlaceBombMessage extends SequencedMessage {
  type: 'bomb';
  /** Client timestamp */
  timestamp: number;
}

/**
 * Special action (kick, punch)
 */
export interface SpecialActionMessage extends SequencedMessage {
  type: 'special';
  /** Action type */
  action: 'kick' | 'punch';
  /** Direction for action */
  direction: Direction;
  /** Client timestamp */
  timestamp: number;
}

/**
 * Toggle ready state in lobby
 */
export interface ReadyMessage extends BaseMessage {
  type: 'ready';
  /** Ready state */
  isReady: boolean;
}

/**
 * Request game start (host only)
 */
export interface StartGameMessage extends BaseMessage {
  type: 'start_game';
}

/**
 * Update room settings (host only)
 */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'update_settings';
  /** Updated settings */
  settings: Partial<RoomSettings>;
}

/**
 * Select a map (host only)
 */
export interface SelectMapMessage extends BaseMessage {
  type: 'select_map';
  /** Map ID to select */
  mapId: string;
}

/**
 * Kick a player (host only)
 */
export interface KickPlayerMessage extends BaseMessage {
  type: 'kick_player';
  /** Player ID to kick */
  playerId: string;
}

/**
 * Transfer host to another player (host only)
 */
export interface TransferHostMessage extends BaseMessage {
  type: 'transfer_host';
  /** New host player ID */
  newHostId: string;
}

/**
 * Change player color
 */
export interface ChangeColorMessage extends BaseMessage {
  type: 'change_color';
  /** Desired color */
  color: PlayerColor;
}

/**
 * Send chat message
 */
export interface ChatMessage extends BaseMessage {
  type: 'chat';
  /** Message content */
  content: string;
  /** Message type */
  messageType: 'text' | 'emoji' | 'quick_chat';
}

/**
 * Ping for latency measurement
 */
export interface PingMessage extends BaseMessage {
  type: 'ping';
  /** Client timestamp */
  timestamp: number;
}

/**
 * Request full state sync
 */
export interface RequestSyncMessage extends BaseMessage {
  type: 'request_sync';
}

/**
 * Spectator: follow a specific player
 */
export interface SpectatePlayerMessage extends BaseMessage {
  type: 'spectate_player';
  /** Player ID to follow (null for free camera) */
  playerId: string | null;
}

/**
 * Request to rematch after game ends
 */
export interface RematchMessage extends BaseMessage {
  type: 'rematch';
  /** Vote for rematch */
  vote: boolean;
}

/**
 * Reconnect to a game in progress
 */
export interface ReconnectMessage extends BaseMessage {
  type: 'reconnect';
  /** Authentication token */
  auth: AuthPayload;
  /** Room code */
  roomCode: string;
  /** Last known tick */
  lastTick?: number;
}

/**
 * Union of all client -> server messages
 */
export type ClientMessage =
  | JoinRoomMessage
  | CreateRoomMessage
  | LeaveRoomMessage
  | MoveMessage
  | StopMessage
  | PlaceBombMessage
  | SpecialActionMessage
  | ReadyMessage
  | StartGameMessage
  | UpdateSettingsMessage
  | SelectMapMessage
  | KickPlayerMessage
  | TransferHostMessage
  | ChangeColorMessage
  | ChatMessage
  | PingMessage
  | RequestSyncMessage
  | SpectatePlayerMessage
  | RematchMessage
  | ReconnectMessage;

// ============================================================================
// SERVER -> CLIENT MESSAGES
// ============================================================================

/**
 * Connection established confirmation
 */
export interface ConnectedMessage extends BaseMessage {
  type: 'connected';
  /** Assigned connection ID */
  connectionId: string;
  /** Server timestamp */
  serverTime: number;
}

/**
 * Room joined successfully
 */
export interface RoomJoinedMessage extends BaseMessage {
  type: 'room_joined';
  /** Player's ID in the room */
  playerId: string;
  /** Full room state */
  roomState: RoomState;
  /** Whether joined as spectator */
  isSpectator: boolean;
}

/**
 * Room created successfully
 */
export interface RoomCreatedMessage extends BaseMessage {
  type: 'room_created';
  /** Room code */
  roomCode: string;
  /** Full room state */
  roomState: RoomState;
}

/**
 * Another player joined the room
 */
export interface PlayerJoinedMessage extends BaseMessage {
  type: 'player_joined';
  /** New player info */
  player: PlayerSummary;
}

/**
 * A player left the room
 */
export interface PlayerLeftMessage extends BaseMessage {
  type: 'player_left';
  /** Player ID who left */
  playerId: string;
  /** Reason for leaving */
  reason: 'disconnect' | 'leave' | 'kick';
  /** New host if changed */
  newHostId?: string;
}

/**
 * Player ready state changed
 */
export interface PlayerReadyMessage extends BaseMessage {
  type: 'player_ready';
  /** Player ID */
  playerId: string;
  /** New ready state */
  isReady: boolean;
}

/**
 * Room settings updated
 */
export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'settings_updated';
  /** Updated settings */
  settings: RoomSettings;
}

/**
 * Map selection changed
 */
export interface MapSelectedMessage extends BaseMessage {
  type: 'map_selected';
  /** Selected map info */
  map: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    maxPlayers: number;
  };
}

/**
 * Player color changed
 */
export interface ColorChangedMessage extends BaseMessage {
  type: 'color_changed';
  /** Player ID */
  playerId: string;
  /** New color */
  color: PlayerColor;
}

/**
 * Game starting countdown
 */
export interface GameStartingMessage extends BaseMessage {
  type: 'game_starting';
  /** Countdown seconds remaining */
  countdown: number;
  /** Map to be played */
  map: GameMap;
}

/**
 * Game has started
 */
export interface GameStartMessage extends BaseMessage {
  type: 'game_start';
  /** Initial game state */
  initialState: GameState;
  /** Player's assigned spawn position */
  spawnPosition: Position;
}

/**
 * Game state update (sent every tick)
 */
export interface StateUpdateMessage extends BaseMessage {
  type: 'state';
  /** Current server tick */
  tick: number;
  /** Delta state changes (if delta compression) */
  delta?: GameStateDelta;
  /** Full player states */
  players: Record<string, Player>;
  /** Active bombs */
  bombs: Bomb[];
  /** Powerups on map */
  powerups: Powerup[];
  /** Active explosions */
  explosions: Explosion[];
  /** Time remaining in current phase */
  timeRemaining: number;
  /** Last processed input per player */
  lastProcessedInputs: Record<string, number>;
}

/**
 * Full state sync (on reconnect or request)
 */
export interface FullStateSyncMessage extends BaseMessage {
  type: 'full_state_sync';
  /** Complete game state */
  state: GameState;
}

/**
 * Input acknowledgment
 */
export interface InputAckMessage extends BaseMessage {
  type: 'input_ack';
  /** Results for processed inputs */
  results: InputResult[];
}

/**
 * Bomb placed event
 */
export interface BombPlacedMessage extends BaseMessage {
  type: 'bomb_placed';
  /** Bomb that was placed */
  bomb: Bomb;
}

/**
 * Explosion occurred
 */
export interface ExplosionMessage extends BaseMessage {
  type: 'explosion';
  /** Explosion data */
  explosion: Explosion;
  /** Tiles destroyed by explosion */
  destroyedTiles: Array<{ x: number; y: number }>;
  /** Powerups revealed */
  revealedPowerups: Powerup[];
}

/**
 * Powerup collected
 */
export interface PowerupCollectedMessage extends BaseMessage {
  type: 'powerup_collected';
  /** Powerup ID */
  powerupId: string;
  /** Player who collected */
  playerId: string;
  /** Updated player stats */
  playerStats: {
    maxBombs: number;
    explosionRadius: number;
    speed: number;
    canKick: boolean;
    canPunch: boolean;
    hasShield: boolean;
  };
}

/**
 * Player death event
 */
export interface PlayerDeathMessage extends BaseMessage {
  type: 'player_death';
  /** Player who died */
  playerId: string;
  /** Player who got the kill (null for suicide) */
  killerId: string | null;
  /** Death position */
  position: Position;
}

/**
 * Player respawn event (if respawns enabled)
 */
export interface PlayerRespawnMessage extends BaseMessage {
  type: 'player_respawn';
  /** Player who respawned */
  playerId: string;
  /** Spawn position */
  position: Position;
  /** Invincibility duration */
  invincibilityDuration: number;
}

/**
 * Round ended
 */
export interface RoundEndMessage extends BaseMessage {
  type: 'round_end';
  /** Round result */
  result: RoundResult;
  /** Updated round wins */
  roundWins: Record<string, number>;
  /** Countdown to next round */
  nextRoundCountdown: number;
}

/**
 * New round starting
 */
export interface RoundStartMessage extends BaseMessage {
  type: 'round_start';
  /** Round number */
  roundNumber: number;
  /** Reset positions */
  spawnPositions: Record<string, Position>;
  /** Countdown */
  countdown: number;
}

/**
 * Game phase changed
 */
export interface PhaseChangeMessage extends BaseMessage {
  type: 'phase_change';
  /** New phase */
  phase: GamePhase;
  /** Phase-specific data */
  data?: {
    countdown?: number;
    suddenDeathLevel?: number;
  };
}

/**
 * Sudden death shrink event
 */
export interface SuddenDeathMessage extends BaseMessage {
  type: 'sudden_death';
  /** Current shrink level */
  level: number;
  /** Tiles being destroyed */
  destroyedTiles: Array<{ x: number; y: number }>;
  /** Seconds until next shrink */
  nextShrinkIn: number;
}

/**
 * Game ended
 */
export interface GameEndMessage extends BaseMessage {
  type: 'game_end';
  /** Winner player ID */
  winnerId: string | null;
  /** Winner username */
  winnerUsername?: string;
  /** All player results */
  playerResults: PlayerGameResult[];
  /** All round results */
  rounds: RoundResult[];
  /** Game duration */
  duration: number;
  /** Replay ID */
  replayId?: string;
}

/**
 * Achievement unlocked notification
 */
export interface AchievementUnlockedMessage extends BaseMessage {
  type: 'achievement_unlocked';
  /** Player who unlocked */
  playerId: string;
  /** Achievement data */
  achievement: AchievementUnlock;
}

/**
 * Chat message received
 */
export interface ChatReceivedMessage extends BaseMessage {
  type: 'chat_received';
  /** Message ID */
  messageId: string;
  /** Sender player ID */
  senderId: string;
  /** Sender username */
  senderUsername: string;
  /** Message content */
  content: string;
  /** Message type */
  messageType: 'text' | 'emoji' | 'quick_chat' | 'system';
  /** Timestamp */
  timestamp: number;
}

/**
 * Pong response for latency
 */
export interface PongMessage extends BaseMessage {
  type: 'pong';
  /** Original client timestamp */
  clientTimestamp: number;
  /** Server timestamp */
  serverTimestamp: number;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  /** Error code */
  code: ErrorCode;
  /** Human-readable message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Kicked from room
 */
export interface KickedMessage extends BaseMessage {
  type: 'kicked';
  /** Reason for kick */
  reason: 'host_kick' | 'inactivity' | 'violation';
  /** Additional message */
  message?: string;
}

/**
 * Rematch voting update
 */
export interface RematchVoteMessage extends BaseMessage {
  type: 'rematch_vote';
  /** Current votes */
  votes: Record<string, boolean>;
  /** Total players */
  totalPlayers: number;
  /** Votes needed */
  votesNeeded: number;
  /** Countdown if enough votes */
  countdown?: number;
}

/**
 * Spectator count update
 */
export interface SpectatorCountMessage extends BaseMessage {
  type: 'spectator_count';
  /** Number of spectators */
  count: number;
}

/**
 * Host changed
 */
export interface HostChangedMessage extends BaseMessage {
  type: 'host_changed';
  /** New host player ID */
  newHostId: string;
  /** New host username */
  newHostUsername: string;
}

/**
 * Union of all server -> client messages
 */
export type ServerMessage =
  | ConnectedMessage
  | RoomJoinedMessage
  | RoomCreatedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReadyMessage
  | SettingsUpdatedMessage
  | MapSelectedMessage
  | ColorChangedMessage
  | GameStartingMessage
  | GameStartMessage
  | StateUpdateMessage
  | FullStateSyncMessage
  | InputAckMessage
  | BombPlacedMessage
  | ExplosionMessage
  | PowerupCollectedMessage
  | PlayerDeathMessage
  | PlayerRespawnMessage
  | RoundEndMessage
  | RoundStartMessage
  | PhaseChangeMessage
  | SuddenDeathMessage
  | GameEndMessage
  | AchievementUnlockedMessage
  | ChatReceivedMessage
  | PongMessage
  | ErrorMessage
  | KickedMessage
  | RematchVoteMessage
  | SpectatorCountMessage
  | HostChangedMessage;

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * WebSocket error codes
 */
export type ErrorCode =
  // Authentication errors
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_EXPIRED'
  // Room errors
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'ROOM_PASSWORD_REQUIRED'
  | 'ROOM_PASSWORD_INVALID'
  | 'ALREADY_IN_ROOM'
  // Permission errors
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'NOT_PLAYER'
  // Game errors
  | 'GAME_NOT_STARTED'
  | 'PLAYER_DEAD'
  | 'INVALID_ACTION'
  | 'ACTION_COOLDOWN'
  | 'MAX_BOMBS_REACHED'
  // Rate limiting
  | 'RATE_LIMITED'
  | 'SPAM_DETECTED'
  // Server errors
  | 'SERVER_ERROR'
  | 'SERVER_FULL'
  | 'MAINTENANCE';

// ============================================================================
// MESSAGE TYPE GUARDS
// ============================================================================

/**
 * Type guard for client messages
 */
export function isClientMessage(msg: unknown): msg is ClientMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as BaseMessage).type === 'string'
  );
}

/**
 * Type guard for server messages
 */
export function isServerMessage(msg: unknown): msg is ServerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as BaseMessage).type === 'string'
  );
}

/**
 * Type guard for error messages
 */
export function isErrorMessage(msg: ServerMessage): msg is ErrorMessage {
  return msg.type === 'error';
}

/**
 * Type guard for state update messages
 */
export function isStateUpdateMessage(msg: ServerMessage): msg is StateUpdateMessage {
  return msg.type === 'state';
}

// ============================================================================
// MESSAGE FACTORY HELPERS
// ============================================================================

/**
 * Create a typed client message
 */
export function createClientMessage<T extends ClientMessage['type']>(
  type: T,
  payload: Omit<Extract<ClientMessage, { type: T }>, 'type'>
): Extract<ClientMessage, { type: T }> {
  return { type, ...payload } as Extract<ClientMessage, { type: T }>;
}

/**
 * Create a typed server message
 */
export function createServerMessage<T extends ServerMessage['type']>(
  type: T,
  payload: Omit<Extract<ServerMessage, { type: T }>, 'type'>
): Extract<ServerMessage, { type: T }> {
  return { type, ...payload } as Extract<ServerMessage, { type: T }>;
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

/**
 * WebSocket connection events
 */
export type WebSocketEvent =
  | 'open'
  | 'close'
  | 'error'
  | 'message'
  | 'reconnecting'
  | 'reconnected';

/**
 * WebSocket close codes
 */
export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  INVALID_DATA: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  SERVER_ERROR: 1011,
  // Custom codes (4000-4999)
  AUTH_FAILED: 4001,
  ROOM_CLOSED: 4002,
  KICKED: 4003,
  INACTIVITY: 4004,
  SERVER_SHUTDOWN: 4005,
  RATE_LIMITED: 4006,
} as const;

export type WebSocketCloseCode = (typeof WS_CLOSE_CODES)[keyof typeof WS_CLOSE_CODES];

// ============================================================================
// CONNECTION STATE
// ============================================================================

/**
 * WebSocket connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Connection info for debugging
 */
export interface ConnectionInfo {
  /** Current state */
  state: ConnectionState;
  /** Latency in ms */
  latency: number;
  /** Server time offset */
  serverTimeOffset: number;
  /** Reconnection attempts */
  reconnectAttempts: number;
  /** Last message received */
  lastMessageAt: number;
  /** Connection ID */
  connectionId?: string;
}
