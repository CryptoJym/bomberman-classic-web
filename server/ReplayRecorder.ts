/**
 * Replay Recorder for Bomberman Game Server
 * Records game inputs and events for replay playback
 */

import crypto from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import type {
  Position,
  Direction,
  TileType,
  GameMap,
  PlayerInput,
  PowerupType,
} from './types';

// Promisify compression functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ============================================================================
// TYPES
// ============================================================================

export interface ReplayMetadata {
  /** Unique replay ID */
  id: string;
  /** Room ID where game was played */
  roomId: string;
  /** Game start timestamp */
  startedAt: number;
  /** Game end timestamp */
  endedAt: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Map name */
  mapName: string;
  /** Map dimensions */
  mapWidth: number;
  mapHeight: number;
  /** Random seed used */
  mapSeed: number;
  /** Player info at game start */
  players: ReplayPlayerInfo[];
  /** Winner player ID (null if draw) */
  winnerId: string | null;
  /** Game mode */
  gameMode: string;
  /** Total rounds played */
  roundsPlayed: number;
  /** Server tick rate */
  tickRate: number;
  /** Version of replay format */
  version: number;
}

export interface ReplayPlayerInfo {
  id: string;
  name: string;
  color: string;
  spawnIndex: number;
  finalStats: {
    kills: number;
    deaths: number;
    wins: number;
  };
}

export interface ReplayFrame {
  /** Tick number */
  tick: number;
  /** Timestamp relative to game start */
  timestamp: number;
  /** Inputs received this frame */
  inputs: ReplayInput[];
  /** Events that occurred this frame */
  events: ReplayEvent[];
}

export interface ReplayInput {
  /** Player ID */
  playerId: string;
  /** Input sequence number */
  seq: number;
  /** Input type */
  type: 'move' | 'stop' | 'bomb';
  /** Direction for move inputs */
  direction?: Direction;
}

export interface ReplayEvent {
  /** Event type */
  type: ReplayEventType;
  /** Event data */
  data: Record<string, unknown>;
}

export type ReplayEventType =
  | 'bomb_placed'
  | 'bomb_exploded'
  | 'player_killed'
  | 'player_respawned'
  | 'block_destroyed'
  | 'powerup_spawned'
  | 'powerup_collected'
  | 'round_start'
  | 'round_end'
  | 'sudden_death'
  | 'player_moved';

export interface ReplayData {
  /** Replay metadata */
  metadata: ReplayMetadata;
  /** Initial map state */
  initialMap: {
    tiles: TileType[][];
    spawnPoints: Position[];
  };
  /** All recorded frames */
  frames: ReplayFrame[];
}

export interface CompressedReplay {
  /** Replay ID */
  id: string;
  /** Metadata (uncompressed for quick access) */
  metadata: ReplayMetadata;
  /** Compressed frame data */
  compressedData: Buffer;
  /** Uncompressed size in bytes */
  uncompressedSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REPLAY_VERSION = 1;
const MAX_FRAMES_PER_REPLAY = 36000; // 30 minutes at 20 ticks/sec
const FRAME_BATCH_SIZE = 100; // Process frames in batches

// ============================================================================
// REPLAY RECORDER CLASS
// ============================================================================

export class ReplayRecorder {
  /** Unique replay ID */
  readonly id: string;

  /** Room ID */
  readonly roomId: string;

  /** Recording start time */
  private startedAt: number;

  /** Recording end time */
  private endedAt: number = 0;

  /** Current tick number */
  private currentTick: number = 0;

  /** Recorded frames */
  private frames: ReplayFrame[] = [];

  /** Current frame being built */
  private currentFrame: ReplayFrame | null = null;

  /** Initial map state */
  private initialMap: { tiles: TileType[][]; spawnPoints: Position[] } | null = null;

  /** Player info */
  private players: Map<string, ReplayPlayerInfo> = new Map();

  /** Map metadata */
  private mapName: string = '';
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private mapSeed: number = 0;

  /** Game settings */
  private gameMode: string = 'classic';
  private tickRate: number = 20;

  /** Winner ID */
  private winnerId: string | null = null;

  /** Rounds played */
  private roundsPlayed: number = 0;

  /** Is recording active */
  private isRecording: boolean = false;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(roomId: string) {
    this.id = crypto.randomUUID();
    this.roomId = roomId;
    this.startedAt = Date.now();
  }

  // ============================================================================
  // RECORDING CONTROL
  // ============================================================================

  /**
   * Start recording a new game
   */
  startRecording(
    map: GameMap,
    players: Array<{ id: string; name: string; color: string; spawnIndex: number }>,
    settings: { gameMode?: string; tickRate?: number; mapSeed?: number }
  ): void {
    this.isRecording = true;
    this.startedAt = Date.now();
    this.currentTick = 0;
    this.frames = [];
    this.currentFrame = null;

    // Store map state
    this.initialMap = {
      tiles: map.tiles.map(row => [...row]),
      spawnPoints: map.spawnPoints.map(p => ({ ...p })),
    };

    this.mapName = map.name;
    this.mapWidth = map.width;
    this.mapHeight = map.height;
    this.mapSeed = settings.mapSeed ?? 0;

    // Store player info
    this.players.clear();
    for (const player of players) {
      this.players.set(player.id, {
        id: player.id,
        name: player.name,
        color: player.color,
        spawnIndex: player.spawnIndex,
        finalStats: { kills: 0, deaths: 0, wins: 0 },
      });
    }

    // Store settings
    this.gameMode = settings.gameMode ?? 'classic';
    this.tickRate = settings.tickRate ?? 20;
  }

  /**
   * Stop recording
   */
  stopRecording(
    winnerId: string | null,
    playerStats: Map<string, { kills: number; deaths: number; wins: number }>
  ): void {
    this.isRecording = false;
    this.endedAt = Date.now();
    this.winnerId = winnerId;

    // Finalize current frame
    this.finalizeCurrentFrame();

    // Update player final stats
    for (const [playerId, stats] of playerStats.entries()) {
      const playerInfo = this.players.get(playerId);
      if (playerInfo) {
        playerInfo.finalStats = { ...stats };
      }
    }
  }

  /**
   * Check if recording is active
   */
  isActive(): boolean {
    return this.isRecording;
  }

  // ============================================================================
  // FRAME MANAGEMENT
  // ============================================================================

  /**
   * Start a new frame for a tick
   */
  startFrame(tick: number): void {
    if (!this.isRecording) return;
    if (this.frames.length >= MAX_FRAMES_PER_REPLAY) {
      console.warn('Replay recorder: Max frames reached, stopping recording');
      this.isRecording = false;
      return;
    }

    // Finalize previous frame
    this.finalizeCurrentFrame();

    this.currentTick = tick;
    this.currentFrame = {
      tick,
      timestamp: Date.now() - this.startedAt,
      inputs: [],
      events: [],
    };
  }

  /**
   * Finalize the current frame and add to frames array
   */
  private finalizeCurrentFrame(): void {
    if (this.currentFrame) {
      // Only save frames with content
      if (this.currentFrame.inputs.length > 0 || this.currentFrame.events.length > 0) {
        this.frames.push(this.currentFrame);
      }
      this.currentFrame = null;
    }
  }

  // ============================================================================
  // INPUT RECORDING
  // ============================================================================

  /**
   * Record a player input
   */
  recordInput(input: PlayerInput & { playerId: string }): void {
    if (!this.isRecording || !this.currentFrame) return;

    this.currentFrame.inputs.push({
      playerId: input.playerId,
      seq: input.seq,
      type: input.type,
      direction: input.direction,
    });
  }

  // ============================================================================
  // EVENT RECORDING
  // ============================================================================

  /**
   * Record a bomb placement
   */
  recordBombPlaced(
    bombId: string,
    playerId: string,
    position: Position,
    radius: number
  ): void {
    this.recordEvent('bomb_placed', {
      bombId,
      playerId,
      x: position.x,
      y: position.y,
      radius,
    });
  }

  /**
   * Record a bomb explosion
   */
  recordBombExploded(
    bombId: string,
    position: Position,
    cells: Position[]
  ): void {
    this.recordEvent('bomb_exploded', {
      bombId,
      x: position.x,
      y: position.y,
      cells: cells.map(c => ({ x: c.x, y: c.y })),
    });
  }

  /**
   * Record a player death
   */
  recordPlayerKilled(
    playerId: string,
    killerId: string | null,
    position: Position
  ): void {
    this.recordEvent('player_killed', {
      playerId,
      killerId,
      x: position.x,
      y: position.y,
    });
  }

  /**
   * Record a player respawn
   */
  recordPlayerRespawned(playerId: string, position: Position): void {
    this.recordEvent('player_respawned', {
      playerId,
      x: position.x,
      y: position.y,
    });
  }

  /**
   * Record a block destruction
   */
  recordBlockDestroyed(position: Position): void {
    this.recordEvent('block_destroyed', {
      x: position.x,
      y: position.y,
    });
  }

  /**
   * Record a powerup spawn
   */
  recordPowerupSpawned(
    powerupId: string,
    type: PowerupType,
    position: Position
  ): void {
    this.recordEvent('powerup_spawned', {
      powerupId,
      type,
      x: position.x,
      y: position.y,
    });
  }

  /**
   * Record a powerup collection
   */
  recordPowerupCollected(
    powerupId: string,
    playerId: string,
    type: PowerupType
  ): void {
    this.recordEvent('powerup_collected', {
      powerupId,
      playerId,
      type,
    });
  }

  /**
   * Record round start
   */
  recordRoundStart(roundNumber: number): void {
    this.roundsPlayed = roundNumber;
    this.recordEvent('round_start', {
      roundNumber,
    });
  }

  /**
   * Record round end
   */
  recordRoundEnd(roundNumber: number, winnerId: string | null): void {
    this.recordEvent('round_end', {
      roundNumber,
      winnerId,
    });
  }

  /**
   * Record sudden death activation
   */
  recordSuddenDeath(level: number): void {
    this.recordEvent('sudden_death', {
      level,
    });
  }

  /**
   * Record player movement
   */
  recordPlayerMoved(
    playerId: string,
    from: Position,
    to: Position,
    direction: Direction
  ): void {
    this.recordEvent('player_moved', {
      playerId,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      direction,
    });
  }

  /**
   * Generic event recording
   */
  private recordEvent(type: ReplayEventType, data: Record<string, unknown>): void {
    if (!this.isRecording || !this.currentFrame) return;

    this.currentFrame.events.push({
      type,
      data,
    });
  }

  // ============================================================================
  // REPLAY DATA GENERATION
  // ============================================================================

  /**
   * Get the complete replay data
   */
  getReplayData(): ReplayData {
    // Finalize any pending frame
    this.finalizeCurrentFrame();

    return {
      metadata: this.getMetadata(),
      initialMap: this.initialMap ?? { tiles: [], spawnPoints: [] },
      frames: this.frames,
    };
  }

  /**
   * Get replay metadata
   */
  getMetadata(): ReplayMetadata {
    const endedAt = this.endedAt || Date.now();
    return {
      id: this.id,
      roomId: this.roomId,
      startedAt: this.startedAt,
      endedAt,
      durationMs: endedAt - this.startedAt,
      mapName: this.mapName,
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      mapSeed: this.mapSeed,
      players: Array.from(this.players.values()),
      winnerId: this.winnerId,
      gameMode: this.gameMode,
      roundsPlayed: this.roundsPlayed,
      tickRate: this.tickRate,
      version: REPLAY_VERSION,
    };
  }

  /**
   * Get compressed replay
   */
  async getCompressedReplay(): Promise<CompressedReplay> {
    const replayData = this.getReplayData();
    const dataStr = JSON.stringify({
      initialMap: replayData.initialMap,
      frames: replayData.frames,
    });

    const uncompressedSize = Buffer.byteLength(dataStr, 'utf-8');
    const compressedData = await gzipAsync(Buffer.from(dataStr, 'utf-8'));

    return {
      id: this.id,
      metadata: replayData.metadata,
      compressedData,
      uncompressedSize,
      compressedSize: compressedData.length,
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get recording statistics
   */
  getStats(): {
    frameCount: number;
    totalInputs: number;
    totalEvents: number;
    durationMs: number;
    estimatedSize: number;
  } {
    let totalInputs = 0;
    let totalEvents = 0;

    for (const frame of this.frames) {
      totalInputs += frame.inputs.length;
      totalEvents += frame.events.length;
    }

    // Rough size estimate
    const estimatedSize = JSON.stringify({
      metadata: this.getMetadata(),
      initialMap: this.initialMap,
      frames: this.frames,
    }).length;

    return {
      frameCount: this.frames.length,
      totalInputs,
      totalEvents,
      durationMs: (this.endedAt || Date.now()) - this.startedAt,
      estimatedSize,
    };
  }
}

// ============================================================================
// REPLAY PLAYER CLASS
// ============================================================================

export class ReplayPlayer {
  /** Replay data */
  private replayData: ReplayData;

  /** Current frame index */
  private currentFrameIndex: number = 0;

  /** Playback speed multiplier */
  private speed: number = 1.0;

  /** Is playing */
  private isPlaying: boolean = false;

  /** Playback start time */
  private playbackStartTime: number = 0;

  /** Last frame timestamp */
  private lastFrameTimestamp: number = 0;

  constructor(replayData: ReplayData) {
    this.replayData = replayData;
  }

  /**
   * Start playback
   */
  play(): void {
    this.isPlaying = true;
    this.playbackStartTime = Date.now();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Stop and reset playback
   */
  stop(): void {
    this.isPlaying = false;
    this.currentFrameIndex = 0;
    this.lastFrameTimestamp = 0;
  }

  /**
   * Seek to a specific tick
   */
  seekToTick(tick: number): void {
    for (let i = 0; i < this.replayData.frames.length; i++) {
      if (this.replayData.frames[i].tick >= tick) {
        this.currentFrameIndex = i;
        this.lastFrameTimestamp = this.replayData.frames[i].timestamp;
        return;
      }
    }
    // If tick is beyond end, go to last frame
    this.currentFrameIndex = this.replayData.frames.length - 1;
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4.0, speed));
  }

  /**
   * Get next frames to process based on elapsed time
   */
  getFramesForUpdate(deltaMs: number): ReplayFrame[] {
    if (!this.isPlaying || this.currentFrameIndex >= this.replayData.frames.length) {
      return [];
    }

    const frames: ReplayFrame[] = [];
    const adjustedDelta = deltaMs * this.speed;
    const targetTimestamp = this.lastFrameTimestamp + adjustedDelta;

    while (this.currentFrameIndex < this.replayData.frames.length) {
      const frame = this.replayData.frames[this.currentFrameIndex];
      if (frame.timestamp <= targetTimestamp) {
        frames.push(frame);
        this.lastFrameTimestamp = frame.timestamp;
        this.currentFrameIndex++;
      } else {
        break;
      }
    }

    return frames;
  }

  /**
   * Check if playback is finished
   */
  isFinished(): boolean {
    return this.currentFrameIndex >= this.replayData.frames.length;
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    if (this.replayData.frames.length === 0) return 0;
    return this.currentFrameIndex / this.replayData.frames.length;
  }

  /**
   * Get metadata
   */
  getMetadata(): ReplayMetadata {
    return this.replayData.metadata;
  }

  /**
   * Get initial map state
   */
  getInitialMap(): { tiles: TileType[][]; spawnPoints: Position[] } {
    return this.replayData.initialMap;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Decompress a compressed replay
 */
export async function decompressReplay(
  compressed: CompressedReplay
): Promise<ReplayData> {
  const decompressedBuffer = await gunzipAsync(compressed.compressedData);
  const dataStr = decompressedBuffer.toString('utf-8');
  const { initialMap, frames } = JSON.parse(dataStr);

  return {
    metadata: compressed.metadata,
    initialMap,
    frames,
  };
}

/**
 * Create a replay player from compressed data
 */
export async function createReplayPlayer(
  compressed: CompressedReplay
): Promise<ReplayPlayer> {
  const replayData = await decompressReplay(compressed);
  return new ReplayPlayer(replayData);
}

/**
 * Validate replay data integrity
 */
export function validateReplay(replayData: ReplayData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check metadata
  if (!replayData.metadata.id) {
    errors.push('Missing replay ID');
  }
  if (!replayData.metadata.roomId) {
    errors.push('Missing room ID');
  }
  if (replayData.metadata.version !== REPLAY_VERSION) {
    errors.push(`Version mismatch: expected ${REPLAY_VERSION}, got ${replayData.metadata.version}`);
  }

  // Check initial map
  if (!replayData.initialMap.tiles || replayData.initialMap.tiles.length === 0) {
    errors.push('Missing or empty initial map tiles');
  }

  // Check frames are in order
  let lastTick = -1;
  for (let i = 0; i < replayData.frames.length; i++) {
    const frame = replayData.frames[i];
    if (frame.tick < lastTick) {
      errors.push(`Frame ${i} has tick ${frame.tick} but previous tick was ${lastTick}`);
    }
    lastTick = frame.tick;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ReplayRecorder;
