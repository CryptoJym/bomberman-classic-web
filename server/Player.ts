/**
 * Server Player Class for Bomberman Game Server
 * Manages individual player state and input processing
 */

import crypto from 'crypto';
import type WebSocket from 'ws';
import type {
  Position,
  Direction,
  Player,
  PlayerStats,
  PowerupEffects,
  PowerupType,
  SkullEffect,
  ConnectionState,
  PlayerInput,
  ServerMessage,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MOVE_COOLDOWN_MS = 120;
const MIN_MOVE_COOLDOWN_MS = 60;
const SPEED_BOOST_MS = 15;

const DEFAULT_MAX_BOMBS = 1;
const MAX_BOMBS_CAP = 8;

const DEFAULT_BOMB_RADIUS = 2;
const MAX_BOMB_RADIUS = 8;

const SKULL_EFFECT_DURATION_MS = 10000;
const SHIELD_DURATION_MS = 10000;
const RESPAWN_INVINCIBILITY_MS = 2000;

const INPUT_BUFFER_SIZE = 64;

const COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#0082c8',
  '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  '#d2f53c', '#fabebe', '#008080', '#e6beff',
  '#aa6e28', '#fffac8', '#800000', '#aaffc3',
];

// ============================================================================
// SERVER PLAYER CLASS
// ============================================================================

export class ServerPlayer {
  /** Unique player ID */
  readonly id: string;

  /** Clerk user ID for authentication */
  readonly clerkId: string;

  /** WebSocket connection */
  socket: WebSocket;

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

  /** Invincibility end timestamp */
  invincibilityEndsAt: number;

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

  /** Last ping timestamp */
  lastPingAt: number;

  /** Measured latency in ms */
  latency: number;

  /** Time until next move allowed */
  timeUntilNextMoveMs: number;

  /** Skull effect expiry timestamp */
  skullEffectExpiresAt: number;

  /** Shield expiry timestamp */
  shieldExpiresAt: number;

  /** Room ID player is in */
  roomId: string | null;

  /** Is room host */
  isHost: boolean;

  /** Ready state in lobby */
  isReady: boolean;

  /** Spawn point index */
  spawnIndex: number;

  /** Input buffer for reconciliation */
  private inputBuffer: PlayerInput[];

  /** Current input state */
  private currentInput: {
    direction: Direction | null;
    bomb: boolean;
    lastBomb: boolean;
  };

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    clerkId: string,
    name: string,
    socket: WebSocket,
    colorIndex: number = 0
  ) {
    this.id = crypto.randomUUID();
    this.clerkId = clerkId;
    this.socket = socket;
    this.name = name.slice(0, 16); // Max 16 chars
    this.color = COLORS[colorIndex % COLORS.length];

    // Initialize position (will be set by room)
    this.position = { x: 1, y: 1 };
    this.direction = 'down';

    // State
    this.isAlive = true;
    this.respawnAt = 0;
    this.invincibilityEndsAt = 0;
    this.activeBombs = 0;

    // Input tracking
    this.lastInputSeq = 0;
    this.inputBuffer = [];
    this.currentInput = {
      direction: null,
      bomb: false,
      lastBomb: false,
    };

    // Movement timing
    this.timeUntilNextMoveMs = 0;

    // Connection
    this.connectionState = 'connected';
    this.lastActivityAt = Date.now();
    this.lastPingAt = Date.now();
    this.latency = 0;

    // Room state
    this.roomId = null;
    this.isHost = false;
    this.isReady = false;
    this.spawnIndex = 0;

    // Effects
    this.skullEffectExpiresAt = 0;
    this.shieldExpiresAt = 0;

    // Initialize stats
    this.stats = {
      kills: 0,
      deaths: 0,
      wins: 0,
      gamesPlayed: 0,
      bombsPlaced: 0,
      powerupsCollected: 0,
    };

    // Initialize powerup effects with defaults
    this.powerups = {
      maxBombs: DEFAULT_MAX_BOMBS,
      bombRadius: DEFAULT_BOMB_RADIUS,
      moveCooldownMs: DEFAULT_MOVE_COOLDOWN_MS,
      canKick: false,
      canPunch: false,
      hasShield: false,
    };
  }

  // ============================================================================
  // MESSAGE SENDING
  // ============================================================================

  /**
   * Send a message to this player's WebSocket
   */
  send(message: ServerMessage): void {
    if (this.socket.readyState === this.socket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to player ${this.id}:`, error);
      }
    }
  }

  /**
   * Send error message to player
   */
  sendError(code: number, message: string, details?: Record<string, unknown>): void {
    this.send({
      type: 'error',
      code,
      message,
      details,
    } as ServerMessage);
  }

  // ============================================================================
  // INPUT PROCESSING
  // ============================================================================

  /**
   * Process incoming player input
   */
  processInput(input: PlayerInput): void {
    // Update activity timestamp
    this.lastActivityAt = Date.now();

    // Don't process if dead
    if (!this.isAlive) return;

    // Update sequence number
    if (input.seq > this.lastInputSeq) {
      this.lastInputSeq = input.seq;
    }

    // Add to input buffer
    this.inputBuffer.push(input);
    if (this.inputBuffer.length > INPUT_BUFFER_SIZE) {
      this.inputBuffer.shift();
    }

    // Process based on input type
    switch (input.type) {
      case 'move':
        this.currentInput.direction = input.direction || null;
        if (input.direction) {
          this.direction = input.direction;
        }
        break;

      case 'stop':
        this.currentInput.direction = null;
        break;

      case 'bomb':
        this.currentInput.bomb = true;
        break;
    }
  }

  /**
   * Get current movement direction (handles skull effects)
   */
  getEffectiveDirection(): Direction | null {
    const dir = this.currentInput.direction;
    if (!dir) return null;

    // Reverse controls if skull effect active
    if (this.hasSkullEffect('reverse')) {
      const reversed: Record<Direction, Direction> = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left',
      };
      return reversed[dir];
    }

    return dir;
  }

  /**
   * Check if bomb should be placed
   */
  shouldPlaceBomb(): boolean {
    const wantsBomb = this.currentInput.bomb && !this.currentInput.lastBomb;

    // Update last bomb state
    this.currentInput.lastBomb = this.currentInput.bomb;
    this.currentInput.bomb = false;

    // Check skull effects
    if (this.hasSkullEffect('no_bombs')) {
      return false;
    }

    // Diarrhea effect forces bomb placement
    if (this.hasSkullEffect('diarrhea')) {
      return Math.random() < 0.3; // 30% chance per tick
    }

    return wantsBomb;
  }

  /**
   * Update movement cooldown
   */
  updateMovement(deltaMs: number): void {
    this.timeUntilNextMoveMs = Math.max(0, this.timeUntilNextMoveMs - deltaMs);
  }

  /**
   * Check if player can move
   */
  canMove(): boolean {
    return this.isAlive && this.timeUntilNextMoveMs <= 0;
  }

  /**
   * Get effective movement cooldown (with powerups and effects)
   */
  getMoveCooldown(): number {
    let cooldown = this.powerups.moveCooldownMs;

    // Slow skull effect
    if (this.hasSkullEffect('slow')) {
      cooldown *= 2;
    }

    return cooldown;
  }

  /**
   * Apply movement cooldown after moving
   */
  applyMoveCooldown(): void {
    this.timeUntilNextMoveMs = this.getMoveCooldown();
  }

  // ============================================================================
  // POWERUPS
  // ============================================================================

  /**
   * Collect a powerup
   */
  collectPowerup(type: PowerupType): void {
    this.stats.powerupsCollected++;

    switch (type) {
      case 'bomb_up':
        this.powerups.maxBombs = Math.min(MAX_BOMBS_CAP, this.powerups.maxBombs + 1);
        break;

      case 'fire_up':
        this.powerups.bombRadius = Math.min(MAX_BOMB_RADIUS, this.powerups.bombRadius + 1);
        break;

      case 'speed_up':
        this.powerups.moveCooldownMs = Math.max(
          MIN_MOVE_COOLDOWN_MS,
          this.powerups.moveCooldownMs - SPEED_BOOST_MS
        );
        break;

      case 'kick':
        this.powerups.canKick = true;
        break;

      case 'punch':
        this.powerups.canPunch = true;
        break;

      case 'shield':
        this.powerups.hasShield = true;
        this.shieldExpiresAt = Date.now() + SHIELD_DURATION_MS;
        break;

      case 'skull':
        this.applySkullEffect();
        break;
    }
  }

  /**
   * Apply a random skull effect
   */
  private applySkullEffect(): void {
    const effects: SkullEffect[] = ['slow', 'reverse', 'diarrhea', 'short_fuse', 'no_bombs'];
    const effect = effects[Math.floor(Math.random() * effects.length)];

    this.powerups.skullEffect = effect;
    this.skullEffectExpiresAt = Date.now() + SKULL_EFFECT_DURATION_MS;
  }

  /**
   * Check if player has a specific skull effect
   */
  hasSkullEffect(effect: SkullEffect): boolean {
    if (!this.powerups.skullEffect) return false;
    if (Date.now() > this.skullEffectExpiresAt) {
      this.powerups.skullEffect = undefined;
      return false;
    }
    return this.powerups.skullEffect === effect;
  }

  /**
   * Update time-based effects
   */
  updateEffects(): void {
    const now = Date.now();

    // Clear expired skull effect
    if (this.powerups.skullEffect && now > this.skullEffectExpiresAt) {
      this.powerups.skullEffect = undefined;
    }

    // Clear expired shield
    if (this.powerups.hasShield && now > this.shieldExpiresAt) {
      this.powerups.hasShield = false;
    }
  }

  // ============================================================================
  // DEATH AND RESPAWN
  // ============================================================================

  /**
   * Kill the player
   * @returns true if player died, false if protected by shield
   */
  kill(killerId: string | null): boolean {
    if (!this.isAlive) return false;

    // Check for invincibility
    if (Date.now() < this.invincibilityEndsAt) {
      return false;
    }

    // Check for shield
    if (this.powerups.hasShield) {
      this.powerups.hasShield = false;
      this.shieldExpiresAt = 0;
      return false; // Shield absorbed the hit
    }

    this.isAlive = false;
    this.stats.deaths++;
    this.respawnAt = 0; // Will be set by game state if respawn enabled

    return true;
  }

  /**
   * Respawn the player at a position
   */
  respawn(position: Position): void {
    this.position = { ...position };
    this.isAlive = true;
    this.respawnAt = 0;
    this.invincibilityEndsAt = Date.now() + RESPAWN_INVINCIBILITY_MS;
    this.activeBombs = 0;

    // Reset input state
    this.currentInput = {
      direction: null,
      bomb: false,
      lastBomb: false,
    };
    this.timeUntilNextMoveMs = 0;
  }

  /**
   * Check if player is invincible
   */
  isInvincible(): boolean {
    return Date.now() < this.invincibilityEndsAt;
  }

  // ============================================================================
  // ROUND MANAGEMENT
  // ============================================================================

  /**
   * Reset player for a new round
   */
  resetForRound(spawnPosition: Position): void {
    this.position = { ...spawnPosition };
    this.direction = 'down';
    this.isAlive = true;
    this.respawnAt = 0;
    this.invincibilityEndsAt = 0;
    this.activeBombs = 0;

    // Reset powerups to defaults
    this.powerups = {
      maxBombs: DEFAULT_MAX_BOMBS,
      bombRadius: DEFAULT_BOMB_RADIUS,
      moveCooldownMs: DEFAULT_MOVE_COOLDOWN_MS,
      canKick: false,
      canPunch: false,
      hasShield: false,
    };

    // Clear effects
    this.skullEffectExpiresAt = 0;
    this.shieldExpiresAt = 0;

    // Clear input state
    this.currentInput = {
      direction: null,
      bomb: false,
      lastBomb: false,
    };
    this.inputBuffer = [];
    this.timeUntilNextMoveMs = 0;

    // Reset round stats (keep lifetime stats)
    this.stats.kills = 0;
    this.stats.deaths = 0;
    this.stats.bombsPlaced = 0;
    this.stats.powerupsCollected = 0;
  }

  /**
   * Record a kill
   */
  recordKill(): void {
    this.stats.kills++;
  }

  /**
   * Record a win
   */
  recordWin(): void {
    this.stats.wins++;
  }

  /**
   * Increment games played
   */
  recordGamePlayed(): void {
    this.stats.gamesPlayed++;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Handle disconnect
   */
  disconnect(): void {
    this.connectionState = 'disconnected';
  }

  /**
   * Handle reconnection
   */
  reconnect(socket: WebSocket): void {
    this.socket = socket;
    this.connectionState = 'connected';
    this.lastActivityAt = Date.now();
    this.lastPingAt = Date.now();
  }

  /**
   * Update latency from ping/pong
   */
  updateLatency(rtt: number): void {
    this.latency = rtt;
    this.lastPingAt = Date.now();
  }

  /**
   * Check if connection is stale
   */
  isConnectionStale(timeoutMs: number): boolean {
    return Date.now() - this.lastActivityAt > timeoutMs;
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  /**
   * Serialize player state for network transmission
   */
  serialize(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      x: this.position.x,
      y: this.position.y,
      direction: this.direction,
      isAlive: this.isAlive,
      stats: {
        kills: this.stats.kills,
        deaths: this.stats.deaths,
        wins: this.stats.wins,
      },
      maxBombs: this.powerups.maxBombs,
      bombRadius: this.powerups.bombRadius,
      speed: DEFAULT_MOVE_COOLDOWN_MS / this.powerups.moveCooldownMs, // Relative speed
      hasShield: this.powerups.hasShield,
    };
  }

  /**
   * Serialize for lobby display
   */
  serializeForLobby(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      avatarUrl: this.avatarUrl,
      eloRating: 1000, // TODO: Get from database
      isReady: this.isReady,
      isHost: this.isHost,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new server player
 */
export function createServerPlayer(
  clerkId: string,
  name: string,
  socket: WebSocket,
  colorIndex: number = 0
): ServerPlayer {
  return new ServerPlayer(clerkId, name, socket, colorIndex);
}

export default ServerPlayer;
