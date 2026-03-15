/**
 * Server Game State for Bomberman Game Server
 * Authoritative game state with tick-based simulation
 */

import crypto from 'crypto';
import type {
  Position,
  Direction,
  TileType,
  GameMap,
  Player,
  Bomb,
  Powerup,
  Explosion,
  PowerupType,
  GamePhase,
  RoundState,
  RoundPhase,
  StateMessage,
  SerializedPlayer,
  SerializedBomb,
  SerializedPowerup,
  SerializedExplosion,
  SerializedRound,
  GameEvent,
  GameEventType,
} from './types';
import { ServerPlayer } from './Player';
import { Physics, type ExplosionResult, type CollisionContext } from './Physics';
import { MapGenerator, getSpawnPositions } from './MapGenerator';

// ============================================================================
// CONSTANTS
// ============================================================================

const TICK_RATE = 20; // Hz
const TICK_INTERVAL_MS = 1000 / TICK_RATE; // 50ms

const BOMB_FUSE_MS = 2200;
const EXPLOSION_DURATION_MS = 600;
const INTERMISSION_MS = 3500;
const COUNTDOWN_MS = 3000;
const DEFAULT_ROUND_TIME_MS = 180000; // 3 minutes

const POWERUP_SPAWN_PROBABILITY = 0.25;
const POWERUP_TYPES: PowerupType[] = [
  'bomb_up', 'fire_up', 'speed_up', 'kick', 'punch', 'shield', 'skull'
];
const POWERUP_WEIGHTS: Record<PowerupType, number> = {
  bomb_up: 25,
  fire_up: 25,
  speed_up: 20,
  kick: 10,
  punch: 8,
  shield: 7,
  skull: 5,
};

const TILE = {
  EMPTY: 0 as TileType,
  SOLID: 1 as TileType,
  SOFT: 2 as TileType,
};

// ============================================================================
// SERVER GAME STATE CLASS
// ============================================================================

export class ServerGameState {
  /** Current server tick number */
  tick: number;

  /** Game phase */
  phase: GamePhase;

  /** Game map */
  map: GameMap;

  /** All players (by ID) */
  players: Map<string, ServerPlayer>;

  /** All active bombs (by ID) */
  bombs: Map<string, Bomb>;

  /** All spawned powerups (by ID) */
  powerups: Map<string, Powerup>;

  /** Active explosions */
  explosions: Explosion[];

  /** Round state */
  round: RoundState;

  /** Room ID */
  roomId: string;

  /** Random seed for determinism */
  seed: number;

  /** Time remaining in current phase (ms) */
  timeRemainingMs: number;

  /** Sudden death level (0 = none) */
  suddenDeathLevel: number;

  /** Next sudden death tick */
  nextSuddenDeathTick: number;

  /** Game events for replay */
  private events: GameEvent[];

  /** Last tick time for delta calculation */
  private lastTickTime: number;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    roomId: string,
    players: Map<string, ServerPlayer>,
    settings: {
      roundsToWin?: number;
      roundTimeMs?: number;
      mapId?: string;
    } = {}
  ) {
    this.roomId = roomId;
    this.players = players;
    this.tick = 0;
    this.phase = 'countdown';
    this.seed = Math.floor(Math.random() * 1e9);

    // Initialize map
    this.map = MapGenerator.generateMap({
      seed: this.seed,
      playerCount: players.size,
    });

    // Initialize collections
    this.bombs = new Map();
    this.powerups = new Map();
    this.explosions = [];
    this.events = [];

    // Initialize round state
    this.round = {
      number: 1,
      roundsToWin: settings.roundsToWin ?? 3,
      timeRemainingMs: settings.roundTimeMs ?? DEFAULT_ROUND_TIME_MS,
      winnerId: null,
      scores: {},
      phase: 'countdown',
    };

    // Initialize scores for all players
    for (const player of players.values()) {
      this.round.scores[player.id] = 0;
    }

    this.timeRemainingMs = COUNTDOWN_MS;
    this.suddenDeathLevel = 0;
    this.nextSuddenDeathTick = 0;
    this.lastTickTime = Date.now();

    // Assign spawn positions
    this.assignSpawnPositions();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Assign spawn positions to all players
   */
  private assignSpawnPositions(): void {
    const spawnPoints = this.map.spawnPoints;
    let index = 0;

    for (const player of this.players.values()) {
      const spawnPoint = spawnPoints[index % spawnPoints.length];
      player.position = { ...spawnPoint };
      player.spawnIndex = index;
      player.resetForRound(spawnPoint);
      index++;
    }
  }

  // ============================================================================
  // GAME LOOP
  // ============================================================================

  /**
   * Main tick function - called every TICK_INTERVAL_MS
   */
  processTick(): GameEvent[] {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    this.lastTickTime = now;
    this.tick++;
    this.events = [];

    // Handle phase-specific logic
    switch (this.phase) {
      case 'countdown':
        this.processCountdown(deltaMs);
        break;

      case 'playing':
        this.processPlaying(deltaMs);
        break;

      case 'intermission':
        this.processIntermission(deltaMs);
        break;

      case 'finished':
        // Game is over, no processing
        break;
    }

    return this.events;
  }

  /**
   * Process countdown phase
   */
  private processCountdown(deltaMs: number): void {
    this.timeRemainingMs -= deltaMs;

    if (this.timeRemainingMs <= 0) {
      this.phase = 'playing';
      this.round.phase = 'active';
      this.timeRemainingMs = DEFAULT_ROUND_TIME_MS;

      this.addEvent('round_start', {
        roundNumber: this.round.number,
      });
    }
  }

  /**
   * Process active gameplay
   */
  private processPlaying(deltaMs: number): void {
    // Process input for all players
    this.processPlayerInputs(deltaMs);

    // Update bomb timers and trigger explosions
    this.processBombs();

    // Update explosions and check for kills
    this.processExplosions();

    // Update player effects (skull, shield, etc.)
    this.updatePlayerEffects();

    // Check for round end conditions
    this.checkRoundEnd();

    // Process sudden death if active
    this.processSuddenDeath();

    // Update round timer
    this.timeRemainingMs -= deltaMs;
    if (this.timeRemainingMs <= 0) {
      this.endRoundByTimeout();
    }
  }

  /**
   * Process intermission phase
   */
  private processIntermission(deltaMs: number): void {
    this.timeRemainingMs -= deltaMs;

    if (this.timeRemainingMs <= 0) {
      // Check if match is over
      const winner = this.checkMatchWinner();
      if (winner) {
        this.phase = 'finished';
        this.addEvent('game_end', {
          winnerId: winner.id,
          winnerName: winner.name,
          scores: { ...this.round.scores },
        });
      } else {
        // Start next round
        this.startNextRound();
      }
    }
  }

  // ============================================================================
  // INPUT PROCESSING
  // ============================================================================

  /**
   * Process input for a specific player
   */
  processInput(playerId: string, input: {
    direction?: Direction | null;
    bomb?: boolean;
    seq: number;
  }): void {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return;

    player.processInput({
      type: input.direction ? 'move' : input.bomb ? 'bomb' : 'stop',
      direction: input.direction,
      seq: input.seq,
      playerId,
      timestamp: Date.now(),
    });
  }

  /**
   * Process all player inputs
   */
  private processPlayerInputs(deltaMs: number): void {
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      // Update movement cooldown
      player.updateMovement(deltaMs);

      // Process movement
      if (player.canMove()) {
        const direction = player.getEffectiveDirection();
        if (direction) {
          this.movePlayer(player, direction);
        }
      }

      // Process bomb placement
      if (player.shouldPlaceBomb()) {
        this.placeBomb(player.id);
      }
    }
  }

  /**
   * Move a player in a direction
   */
  private movePlayer(player: ServerPlayer, direction: Direction): boolean {
    const context = this.getCollisionContext();
    const result = Physics.movePlayer(
      player as unknown as Player,
      direction,
      context
    );

    if (result.moved) {
      player.position = result.newPosition;
      player.direction = direction;
      player.applyMoveCooldown();

      // Check for powerup collection
      if (result.collectedPowerup) {
        this.collectPowerup(player, result.collectedPowerup.id);
      }

      return true;
    }

    return false;
  }

  // ============================================================================
  // BOMB MANAGEMENT
  // ============================================================================

  /**
   * Place a bomb for a player
   */
  placeBomb(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Check if player can place bomb
    if (player.activeBombs >= player.powerups.maxBombs) return false;

    // Check if position already has a bomb
    const existing = Physics.hasBombAt(
      player.position.x,
      player.position.y,
      this.bombs
    );
    if (existing) return false;

    // Create bomb
    const bomb: Bomb = {
      id: crypto.randomUUID(),
      ownerId: playerId,
      position: { ...player.position },
      radius: player.powerups.bombRadius,
      fuseTime: BOMB_FUSE_MS,
      plantedAt: Date.now(),
      explodeAt: Date.now() + BOMB_FUSE_MS,
      exploded: false,
      state: 'planted',
    };

    // Check for short fuse skull effect
    if (player.hasSkullEffect('short_fuse')) {
      bomb.fuseTime = BOMB_FUSE_MS / 2;
      bomb.explodeAt = Date.now() + bomb.fuseTime;
    }

    this.bombs.set(bomb.id, bomb);
    player.activeBombs++;
    player.stats.bombsPlaced++;

    this.addEvent('bomb_placed', {
      bombId: bomb.id,
      playerId,
      position: bomb.position,
      radius: bomb.radius,
    });

    return true;
  }

  /**
   * Process bomb timers and explosions
   */
  private processBombs(): void {
    const now = Date.now();
    const explodedBombs: string[] = [];

    for (const bomb of this.bombs.values()) {
      if (!bomb.exploded && now >= bomb.explodeAt) {
        this.explodeBomb(bomb.id, now);
        explodedBombs.push(bomb.id);
      }
    }

    // Remove exploded bombs
    for (const id of explodedBombs) {
      this.bombs.delete(id);
    }
  }

  /**
   * Explode a bomb and process chain reactions
   */
  explodeBomb(bombId: string, triggeredAt: number = Date.now()): ExplosionResult | null {
    const bomb = this.bombs.get(bombId);
    if (!bomb || bomb.exploded) return null;

    bomb.exploded = true;

    // Decrease owner's active bomb count
    const owner = this.players.get(bomb.ownerId);
    if (owner) {
      owner.activeBombs = Math.max(0, owner.activeBombs - 1);
    }

    // Calculate explosion
    const context = this.getCollisionContext();
    const result = Physics.calculateExplosion(bomb, context);

    // Create explosion entity
    const explosion: Explosion = {
      id: crypto.randomUUID(),
      cells: result.cells.map(c => c.position),
      startedAt: triggeredAt,
      expiresAt: triggeredAt + EXPLOSION_DURATION_MS,
      chainDepth: 0,
      sourceBombId: bombId,
    };
    this.explosions.push(explosion);

    // Destroy soft blocks
    for (const pos of result.destroyedBlocks) {
      this.destroyBlock(pos.x, pos.y);
    }

    // Remove destroyed powerups
    for (const powerupId of result.destroyedPowerups) {
      this.powerups.delete(powerupId);
    }

    // Kill players
    for (const playerId of result.killedPlayers) {
      this.killPlayer(playerId, bomb.ownerId);
    }

    // Chain reaction - trigger other bombs
    for (const triggeredBombId of result.triggeredBombs) {
      this.explodeBomb(triggeredBombId, triggeredAt);
    }

    this.addEvent('bomb_exploded', {
      bombId,
      cells: explosion.cells,
      destroyedBlocks: result.destroyedBlocks,
      killedPlayers: result.killedPlayers,
    });

    return result;
  }

  // ============================================================================
  // EXPLOSION PROCESSING
  // ============================================================================

  /**
   * Process active explosions
   */
  private processExplosions(): void {
    const now = Date.now();

    // Remove expired explosions
    this.explosions = this.explosions.filter(exp => now < exp.expiresAt);

    // Check for player kills from active explosions
    for (const explosion of this.explosions) {
      for (const cell of explosion.cells) {
        for (const player of this.players.values()) {
          if (!player.isAlive) continue;
          if (player.position.x === cell.x && player.position.y === cell.y) {
            // Find bomb owner
            const sourceBomb = this.bombs.get(explosion.sourceBombId);
            const killerId = sourceBomb?.ownerId || null;
            this.killPlayer(player.id, killerId);
          }
        }
      }
    }
  }

  // ============================================================================
  // BLOCK AND POWERUP MANAGEMENT
  // ============================================================================

  /**
   * Destroy a soft block and potentially spawn a powerup
   */
  private destroyBlock(x: number, y: number): void {
    if (this.map.tiles[y]?.[x] === TILE.SOFT) {
      this.map.tiles[y][x] = TILE.EMPTY;

      this.addEvent('block_destroyed', { x, y });

      // Random chance to spawn powerup
      if (Math.random() < POWERUP_SPAWN_PROBABILITY) {
        this.spawnPowerup({ x, y }, this.getRandomPowerupType());
      }
    }
  }

  /**
   * Spawn a powerup at a position
   */
  spawnPowerup(position: Position, type: PowerupType): Powerup {
    const powerup: Powerup = {
      id: crypto.randomUUID(),
      position: { ...position },
      type,
      spawnedAt: Date.now(),
    };

    this.powerups.set(powerup.id, powerup);

    this.addEvent('powerup_spawned', {
      powerupId: powerup.id,
      type,
      position,
    });

    return powerup;
  }

  /**
   * Collect a powerup
   */
  private collectPowerup(player: ServerPlayer, powerupId: string): void {
    const powerup = this.powerups.get(powerupId);
    if (!powerup) return;

    player.collectPowerup(powerup.type);
    this.powerups.delete(powerupId);

    this.addEvent('powerup_collected', {
      powerupId,
      playerId: player.id,
      type: powerup.type,
    });
  }

  /**
   * Get a random powerup type based on weights
   */
  private getRandomPowerupType(): PowerupType {
    const totalWeight = Object.values(POWERUP_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of Object.entries(POWERUP_WEIGHTS)) {
      random -= weight;
      if (random <= 0) {
        return type as PowerupType;
      }
    }

    return 'bomb_up'; // Fallback
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  /**
   * Kill a player
   */
  killPlayer(playerId: string, killerId: string | null): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const killed = player.kill(killerId);
    if (!killed) return false;

    // Record kill for killer
    if (killerId && killerId !== playerId) {
      const killer = this.players.get(killerId);
      if (killer) {
        killer.recordKill();
      }
    }

    this.addEvent('player_death', {
      playerId,
      playerName: player.name,
      killerId,
      killerName: killerId ? this.players.get(killerId)?.name : null,
      position: player.position,
    });

    return true;
  }

  /**
   * Update player effects (skull, shield expiry)
   */
  private updatePlayerEffects(): void {
    for (const player of this.players.values()) {
      player.updateEffects();
    }
  }

  // ============================================================================
  // ROUND MANAGEMENT
  // ============================================================================

  /**
   * Check if round should end
   */
  private checkRoundEnd(): void {
    const alivePlayers = this.getAlivePlayers();

    // End if 0 or 1 players alive
    if (alivePlayers.length <= 1 && this.players.size > 1) {
      const winner = alivePlayers[0] || null;
      this.endRound(winner?.id || null);
    }
  }

  /**
   * End round with a winner
   */
  private endRound(winnerId: string | null): void {
    this.phase = 'intermission';
    this.round.phase = 'results';
    this.round.winnerId = winnerId;

    if (winnerId) {
      const winner = this.players.get(winnerId);
      if (winner) {
        winner.recordWin();
        this.round.scores[winnerId] = (this.round.scores[winnerId] || 0) + 1;
      }
    }

    this.timeRemainingMs = INTERMISSION_MS;

    this.addEvent('round_end', {
      roundNumber: this.round.number,
      winnerId,
      winnerName: winnerId ? this.players.get(winnerId)?.name : null,
      scores: { ...this.round.scores },
    });
  }

  /**
   * End round by timeout
   */
  private endRoundByTimeout(): void {
    const alivePlayers = this.getAlivePlayers();

    // Winner is player with most kills, or random if tied
    let winner: ServerPlayer | null = null;
    let maxKills = -1;

    for (const player of alivePlayers) {
      if (player.stats.kills > maxKills) {
        maxKills = player.stats.kills;
        winner = player;
      }
    }

    this.endRound(winner?.id || null);
  }

  /**
   * Start next round
   */
  private startNextRound(): void {
    this.round.number++;
    this.round.phase = 'countdown';
    this.round.winnerId = null;

    // Generate new map
    this.seed = Math.floor(Math.random() * 1e9);
    this.map = MapGenerator.generateMap({
      seed: this.seed,
      playerCount: this.players.size,
    });

    // Reset bombs, powerups, explosions
    this.bombs.clear();
    this.powerups.clear();
    this.explosions = [];

    // Reset sudden death
    this.suddenDeathLevel = 0;
    this.nextSuddenDeathTick = 0;

    // Reassign spawn positions and reset players
    this.assignSpawnPositions();

    // Start countdown
    this.phase = 'countdown';
    this.timeRemainingMs = COUNTDOWN_MS;

    this.addEvent('round_start', {
      roundNumber: this.round.number,
    });
  }

  /**
   * Check if any player has won the match
   */
  private checkMatchWinner(): ServerPlayer | null {
    for (const player of this.players.values()) {
      const wins = this.round.scores[player.id] || 0;
      if (wins >= this.round.roundsToWin) {
        return player;
      }
    }
    return null;
  }

  // ============================================================================
  // SUDDEN DEATH
  // ============================================================================

  /**
   * Process sudden death mechanic
   */
  private processSuddenDeath(): void {
    // TODO: Implement sudden death zone shrinking
    // This would happen after a certain time threshold
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get collision context for physics calculations
   */
  private getCollisionContext(): CollisionContext {
    return {
      map: this.map,
      bombs: this.bombs,
      players: this.players as unknown as Map<string, Player>,
      powerups: this.powerups,
    };
  }

  /**
   * Get all alive players
   */
  getAlivePlayers(): ServerPlayer[] {
    return Array.from(this.players.values()).filter(p => p.isAlive);
  }

  /**
   * Add a game event
   */
  private addEvent(type: GameEventType, data: Record<string, unknown>): void {
    this.events.push({
      type,
      tick: this.tick,
      data,
    });
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  /**
   * Serialize full state for network transmission
   */
  serialize(): StateMessage {
    const players: SerializedPlayer[] = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: p.position.x,
      y: p.position.y,
      direction: p.direction,
      isAlive: p.isAlive,
      stats: {
        kills: p.stats.kills,
        deaths: p.stats.deaths,
        wins: p.stats.wins,
      },
      maxBombs: p.powerups.maxBombs,
      bombRadius: p.powerups.bombRadius,
      speed: 1.0,
      hasShield: p.powerups.hasShield,
    }));

    const now = Date.now();
    const bombs: SerializedBomb[] = Array.from(this.bombs.values())
      .filter(b => !b.exploded)
      .map(b => ({
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        ownerId: b.ownerId,
        radius: b.radius,
        fuseTimeMs: Math.max(0, b.explodeAt - now),
      }));

    const powerups: SerializedPowerup[] = Array.from(this.powerups.values()).map(p => ({
      id: p.id,
      x: p.position.x,
      y: p.position.y,
      type: p.type,
    }));

    const explosions: SerializedExplosion[] = this.explosions.map(e => ({
      id: e.id,
      cells: e.cells,
      remainingMs: Math.max(0, e.expiresAt - now),
    }));

    const round: SerializedRound = {
      number: this.round.number,
      phase: this.round.phase,
      winnerId: this.round.winnerId || undefined,
      scores: this.round.scores,
      timeRemainingMs: this.timeRemainingMs,
    };

    // Find last processed input across all players
    let lastProcessedInput = 0;
    for (const player of this.players.values()) {
      if (player.lastInputSeq > lastProcessedInput) {
        lastProcessedInput = player.lastInputSeq;
      }
    }

    return {
      type: 'state',
      tick: this.tick,
      serverTime: now,
      lastProcessedInput,
      phase: this.phase,
      players,
      bombs,
      powerups,
      explosions,
      round,
      board: {
        width: this.map.width,
        height: this.map.height,
        tiles: this.map.tiles,
      },
    };
  }

  /**
   * Get state snapshot for replay
   */
  getSnapshot(): Record<string, unknown> {
    return {
      tick: this.tick,
      phase: this.phase,
      seed: this.seed,
      map: {
        width: this.map.width,
        height: this.map.height,
        tiles: this.map.tiles.map(row => [...row]),
      },
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        position: { ...p.position },
        direction: p.direction,
        isAlive: p.isAlive,
        powerups: { ...p.powerups },
        stats: { ...p.stats },
      })),
      bombs: Array.from(this.bombs.values()).map(b => ({ ...b })),
      powerups: Array.from(this.powerups.values()).map(p => ({ ...p })),
      explosions: this.explosions.map(e => ({ ...e })),
      round: { ...this.round },
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createGameState(
  roomId: string,
  players: Map<string, ServerPlayer>,
  settings?: {
    roundsToWin?: number;
    roundTimeMs?: number;
    mapId?: string;
  }
): ServerGameState {
  return new ServerGameState(roomId, players, settings);
}

export default ServerGameState;
