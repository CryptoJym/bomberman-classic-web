/**
 * Room Manager for Bomberman Game Server
 * Handles game rooms, player management, and game lifecycle
 */

import crypto from 'crypto';
import type WebSocket from 'ws';
import { ServerPlayer, createServerPlayer } from './Player';
import { ServerGameState } from './GameState';
import { ReplayRecorder } from './ReplayRecorder';
import { generateMap, getOfficialMap, resetMapForNewRound } from './MapGenerator';
import type {
  Position,
  GameMap,
  RoomSettings,
  RoomState,
  ClientMessage,
  ServerMessage,
  ErrorCode,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface RoomConfig {
  /** Room ID */
  id: string;
  /** Room name */
  name: string;
  /** Room code for joining */
  code: string;
  /** Host player ID */
  hostId: string;
  /** Is private room */
  isPrivate: boolean;
  /** Room settings */
  settings: RoomSettings;
  /** Maximum players */
  maxPlayers: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  code: string;
  hostId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  state: RoomState;
  isPrivate: boolean;
  gameMode: string;
  mapName: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TICK_RATE = 20; // 20 ticks per second
const TICK_INTERVAL_MS = 1000 / TICK_RATE; // 50ms

const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS_PER_ROOM = 16;

const LOBBY_TIMEOUT_MS = 600000; // 10 minutes
const RECONNECT_WINDOW_MS = 30000; // 30 seconds

const AFK_WARNING_MS = 60000; // 1 minute
const AFK_KICK_MS = 120000; // 2 minutes

// ============================================================================
// ROOM CLASS
// ============================================================================

export class Room {
  /** Unique room ID */
  readonly id: string;

  /** Room name */
  name: string;

  /** Room code (for joining) */
  readonly code: string;

  /** Host player ID */
  hostId: string;

  /** Is private room */
  isPrivate: boolean;

  /** Room settings */
  settings: RoomSettings;

  /** Maximum players */
  maxPlayers: number;

  /** Current room state */
  state: RoomState;

  /** Players in the room */
  players: Map<string, ServerPlayer>;

  /** Spectators in the room */
  spectators: Map<string, ServerPlayer>;

  /** Disconnected players (for reconnection) */
  disconnectedPlayers: Map<string, { player: ServerPlayer; disconnectedAt: number }>;

  /** Current game state */
  gameState: ServerGameState | null;

  /** Current game map */
  map: GameMap | null;

  /** Replay recorder */
  replayRecorder: ReplayRecorder | null;

  /** Game tick interval */
  private tickInterval: NodeJS.Timeout | null = null;

  /** Last tick timestamp */
  private lastTickTime: number = 0;

  /** Room creation timestamp */
  readonly createdAt: number;

  /** Last activity timestamp */
  lastActivityAt: number;

  /** Callback for room events */
  private onRoomEvent: ((event: RoomEvent) => void) | null = null;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(config: RoomConfig) {
    this.id = config.id;
    this.name = config.name;
    this.code = config.code;
    this.hostId = config.hostId;
    this.isPrivate = config.isPrivate;
    this.settings = { ...config.settings };
    this.maxPlayers = Math.min(config.maxPlayers, MAX_PLAYERS_PER_ROOM);

    this.state = 'waiting';
    this.players = new Map();
    this.spectators = new Map();
    this.disconnectedPlayers = new Map();
    this.gameState = null;
    this.map = null;
    this.replayRecorder = null;

    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
  }

  // ============================================================================
  // ROOM LIFECYCLE
  // ============================================================================

  /**
   * Set room event callback
   */
  setEventCallback(callback: (event: RoomEvent) => void): void {
    this.onRoomEvent = callback;
  }

  /**
   * Emit a room event
   */
  private emitEvent(event: RoomEvent): void {
    if (this.onRoomEvent) {
      this.onRoomEvent(event);
    }
  }

  /**
   * Close the room and clean up
   */
  close(): void {
    this.stopGame();

    // Notify all players
    const closeMessage: ServerMessage = {
      type: 'error',
      code: 2003 as ErrorCode,
      message: 'Room closed',
    };

    this.broadcast(closeMessage);

    // Clear all players
    for (const player of this.players.values()) {
      player.roomId = null;
    }
    this.players.clear();
    this.spectators.clear();
    this.disconnectedPlayers.clear();

    this.emitEvent({ type: 'room_closed', roomId: this.id });
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  /**
   * Add a player to the room
   */
  addPlayer(player: ServerPlayer): {
    success: boolean;
    error?: { code: ErrorCode; message: string };
  } {
    // Check if room is full
    if (this.players.size >= this.maxPlayers) {
      return {
        success: false,
        error: { code: 2001 as ErrorCode, message: 'Room is full' },
      };
    }

    // Check if game is in progress
    if (this.state === 'playing' || this.state === 'countdown') {
      return {
        success: false,
        error: { code: 2002 as ErrorCode, message: 'Game in progress' },
      };
    }

    // Check if player is already in room
    if (this.players.has(player.id)) {
      return {
        success: false,
        error: { code: 2000 as ErrorCode, message: 'Already in room' },
      };
    }

    // Assign color and spawn index
    const colorIndex = this.players.size;
    player.color = this.getAvailableColor(colorIndex);
    player.spawnIndex = this.getAvailableSpawnIndex();
    player.roomId = this.id;
    player.isReady = false;

    // Make first player the host if no host
    if (!this.hostId || !this.players.has(this.hostId)) {
      this.hostId = player.id;
      player.isHost = true;
    }

    this.players.set(player.id, player);
    this.lastActivityAt = Date.now();

    // Send join confirmation to the player
    player.send({
      type: 'joined',
      roomId: this.id,
      roomCode: this.code,
      playerId: player.id,
      settings: this.settings,
      players: this.getPlayersForLobby(),
    } as ServerMessage);

    // Notify other players
    this.broadcastExcept(player.id, {
      type: 'player_joined',
      player: player.serializeForLobby(),
    } as ServerMessage);

    this.emitEvent({
      type: 'player_joined',
      roomId: this.id,
      playerId: player.id,
    });

    return { success: true };
  }

  /**
   * Remove a player from the room
   */
  removePlayer(playerId: string, reason: 'left' | 'kicked' | 'disconnected' = 'left'): void {
    const player = this.players.get(playerId);
    if (!player) return;

    if (reason === 'disconnected' && this.state === 'playing') {
      // Store for reconnection
      this.disconnectedPlayers.set(playerId, {
        player,
        disconnectedAt: Date.now(),
      });
    }

    player.roomId = null;
    player.isHost = false;
    player.isReady = false;
    this.players.delete(playerId);

    // If game is playing, mark player as dead
    if (this.gameState && this.state === 'playing') {
      this.gameState.removePlayer(playerId);
    }

    // Notify remaining players
    this.broadcast({
      type: 'player_left',
      playerId,
      reason,
    } as ServerMessage);

    // Transfer host if needed
    if (playerId === this.hostId && this.players.size > 0) {
      this.transferHost();
    }

    // Check if room should be closed
    if (this.players.size === 0) {
      this.emitEvent({ type: 'room_empty', roomId: this.id });
    }

    this.emitEvent({
      type: 'player_left',
      roomId: this.id,
      playerId,
      reason,
    });
  }

  /**
   * Reconnect a disconnected player
   */
  reconnectPlayer(
    clerkId: string,
    socket: WebSocket
  ): { success: boolean; player?: ServerPlayer; error?: string } {
    // Find disconnected player by clerk ID
    for (const [playerId, { player, disconnectedAt }] of this.disconnectedPlayers.entries()) {
      if (player.clerkId === clerkId) {
        // Check if within reconnection window
        if (Date.now() - disconnectedAt > RECONNECT_WINDOW_MS) {
          this.disconnectedPlayers.delete(playerId);
          return { success: false, error: 'Reconnection window expired' };
        }

        // Reconnect the player
        player.reconnect(socket);
        player.roomId = this.id;
        this.players.set(playerId, player);
        this.disconnectedPlayers.delete(playerId);

        // Send current game state
        if (this.gameState) {
          player.send({
            type: 'reconnected',
            roomId: this.id,
            gameState: this.gameState.serialize(),
          } as ServerMessage);
        }

        // Notify others
        this.broadcastExcept(playerId, {
          type: 'player_reconnected',
          playerId,
        } as ServerMessage);

        return { success: true, player };
      }
    }

    return { success: false, error: 'Player not found in disconnected list' };
  }

  /**
   * Transfer host to another player
   */
  private transferHost(): void {
    const newHost = this.players.values().next().value;
    if (newHost) {
      this.hostId = newHost.id;
      newHost.isHost = true;

      this.broadcast({
        type: 'host_changed',
        newHostId: newHost.id,
      } as ServerMessage);
    }
  }

  /**
   * Kick a player from the room
   */
  kickPlayer(kickerId: string, targetId: string): boolean {
    if (kickerId !== this.hostId) {
      return false;
    }

    const target = this.players.get(targetId);
    if (!target || targetId === this.hostId) {
      return false;
    }

    target.sendError(2005 as ErrorCode, 'You have been kicked from the room');
    this.removePlayer(targetId, 'kicked');
    return true;
  }

  /**
   * Set player ready state
   */
  setPlayerReady(playerId: string, isReady: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;

    player.isReady = isReady;

    this.broadcast({
      type: 'player_ready',
      playerId,
      isReady,
    } as ServerMessage);

    // Check if all players are ready
    if (this.checkAllReady()) {
      this.emitEvent({ type: 'all_ready', roomId: this.id });
    }
  }

  /**
   * Check if all players are ready
   */
  private checkAllReady(): boolean {
    if (this.players.size < MIN_PLAYERS_TO_START) {
      return false;
    }

    for (const player of this.players.values()) {
      if (!player.isReady && player.id !== this.hostId) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // GAME LIFECYCLE
  // ============================================================================

  /**
   * Start the game
   */
  startGame(): { success: boolean; error?: string } {
    if (this.state !== 'waiting') {
      return { success: false, error: 'Game already in progress' };
    }

    if (this.players.size < MIN_PLAYERS_TO_START) {
      return { success: false, error: `Need at least ${MIN_PLAYERS_TO_START} players` };
    }

    // Generate or load map
    this.map = this.loadMap();
    if (!this.map) {
      return { success: false, error: 'Failed to load map' };
    }

    // Initialize game state
    this.gameState = new ServerGameState(
      this.id,
      this.map,
      this.settings,
      TICK_RATE
    );

    // Add players to game state
    for (const player of this.players.values()) {
      const spawnPoint = this.map.spawnPoints[player.spawnIndex % this.map.spawnPoints.length];
      this.gameState.addPlayer(player, spawnPoint);
    }

    // Initialize replay recorder
    this.replayRecorder = new ReplayRecorder(this.id);
    this.replayRecorder.startRecording(
      this.map,
      Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        spawnIndex: p.spawnIndex,
      })),
      {
        gameMode: this.settings.gameMode,
        tickRate: TICK_RATE,
        mapSeed: this.map.id ? parseInt(this.map.id.slice(-8), 16) : 0,
      }
    );

    // Start countdown
    this.state = 'countdown';
    this.gameState.startCountdown();

    // Notify players
    this.broadcast({
      type: 'game_start',
      map: {
        id: this.map.id,
        name: this.map.name,
        width: this.map.width,
        height: this.map.height,
        tiles: this.map.tiles,
        spawnPoints: this.map.spawnPoints,
      },
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.position.x,
        y: p.position.y,
        spawnIndex: p.spawnIndex,
      })),
      settings: this.settings,
      countdown: this.settings.countdownSeconds ?? 3,
    } as ServerMessage);

    // Start game tick loop
    this.startTickLoop();

    this.emitEvent({ type: 'game_started', roomId: this.id });

    return { success: true };
  }

  /**
   * Stop the game
   */
  stopGame(): void {
    this.stopTickLoop();

    if (this.gameState) {
      // Stop replay recording
      if (this.replayRecorder?.isActive()) {
        const playerStats = new Map<string, { kills: number; deaths: number; wins: number }>();
        for (const player of this.players.values()) {
          playerStats.set(player.id, {
            kills: player.stats.kills,
            deaths: player.stats.deaths,
            wins: player.stats.wins,
          });
        }
        this.replayRecorder.stopRecording(this.gameState.getWinnerId(), playerStats);
      }

      this.gameState = null;
    }

    this.state = 'waiting';

    // Reset players
    for (const player of this.players.values()) {
      player.isReady = false;
    }

    // Clear disconnected players
    this.disconnectedPlayers.clear();
  }

  /**
   * Load the game map
   */
  private loadMap(): GameMap | null {
    const mapName = this.settings.mapName ?? 'classic';

    // Try to load official map
    const officialMap = getOfficialMap(mapName);
    if (officialMap) {
      return resetMapForNewRound(officialMap);
    }

    // Generate random map
    return generateMap({
      width: 15,
      height: 13,
      playerCount: this.players.size,
      name: mapName,
    });
  }

  // ============================================================================
  // TICK LOOP
  // ============================================================================

  /**
   * Start the game tick loop
   */
  private startTickLoop(): void {
    this.lastTickTime = Date.now();

    this.tickInterval = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  /**
   * Stop the game tick loop
   */
  private stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Process a game tick
   */
  private tick(): void {
    if (!this.gameState) return;

    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    this.lastTickTime = now;

    // Start replay frame
    if (this.replayRecorder?.isActive()) {
      this.replayRecorder.startFrame(this.gameState.tick);
    }

    // Process game state tick
    const events = this.gameState.processTick();

    // Record events to replay
    this.recordEventsToReplay(events);

    // Check for phase transitions
    this.handlePhaseTransitions();

    // Broadcast state to all players
    this.broadcastGameState();

    // Update activity timestamp
    this.lastActivityAt = now;
  }

  /**
   * Record game events to replay
   */
  private recordEventsToReplay(events: GameEvent[]): void {
    if (!this.replayRecorder?.isActive()) return;

    for (const event of events) {
      switch (event.type) {
        case 'bomb_placed':
          this.replayRecorder.recordBombPlaced(
            event.bombId,
            event.playerId,
            event.position,
            event.radius
          );
          break;
        case 'bomb_exploded':
          this.replayRecorder.recordBombExploded(
            event.bombId,
            event.position,
            event.cells
          );
          break;
        case 'player_killed':
          this.replayRecorder.recordPlayerKilled(
            event.playerId,
            event.killerId,
            event.position
          );
          break;
        case 'block_destroyed':
          this.replayRecorder.recordBlockDestroyed(event.position);
          break;
        case 'powerup_spawned':
          this.replayRecorder.recordPowerupSpawned(
            event.powerupId,
            event.powerupType,
            event.position
          );
          break;
        case 'powerup_collected':
          this.replayRecorder.recordPowerupCollected(
            event.powerupId,
            event.playerId,
            event.powerupType
          );
          break;
      }
    }
  }

  /**
   * Handle game phase transitions
   */
  private handlePhaseTransitions(): void {
    if (!this.gameState) return;

    const phase = this.gameState.phase;

    if (phase === 'playing' && this.state === 'countdown') {
      this.state = 'playing';
      this.replayRecorder?.recordRoundStart(this.gameState.currentRound);
    }

    if (phase === 'intermission' && this.state === 'playing') {
      // Round ended
      this.replayRecorder?.recordRoundEnd(
        this.gameState.currentRound - 1,
        this.gameState.getLastRoundWinner()
      );
    }

    if (phase === 'finished') {
      this.handleGameEnd();
    }
  }

  /**
   * Handle game end
   */
  private handleGameEnd(): void {
    if (!this.gameState) return;

    const winnerId = this.gameState.getWinnerId();
    const standings = this.gameState.getStandings();

    // Update player stats
    for (const player of this.players.values()) {
      player.recordGamePlayed();
      if (player.id === winnerId) {
        player.recordWin();
      }
    }

    // Broadcast game end
    this.broadcast({
      type: 'game_end',
      winnerId,
      standings,
      stats: Object.fromEntries(
        Array.from(this.players.values()).map(p => [
          p.id,
          {
            kills: p.stats.kills,
            deaths: p.stats.deaths,
            bombsPlaced: p.stats.bombsPlaced,
            powerupsCollected: p.stats.powerupsCollected,
          },
        ])
      ),
    } as ServerMessage);

    // Stop the game
    this.stopGame();

    this.emitEvent({
      type: 'game_ended',
      roomId: this.id,
      winnerId,
    });
  }

  /**
   * Broadcast game state to all players
   */
  private broadcastGameState(): void {
    if (!this.gameState) return;

    const state = this.gameState.serialize();
    this.broadcast(state as ServerMessage);
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Handle a message from a player
   */
  handleMessage(playerId: string, message: ClientMessage): void {
    const player = this.players.get(playerId);
    if (!player) return;

    this.lastActivityAt = Date.now();

    switch (message.type) {
      case 'input':
        this.handleInput(player, message);
        break;

      case 'move':
        this.handleMove(player, message);
        break;

      case 'stop':
        this.handleStop(player);
        break;

      case 'bomb':
        this.handleBomb(player);
        break;

      case 'ready':
        this.setPlayerReady(playerId, message.isReady ?? true);
        break;

      case 'settings':
        this.handleSettingsChange(playerId, message.settings);
        break;

      case 'kick':
        if (message.targetId) {
          this.kickPlayer(playerId, message.targetId);
        }
        break;

      case 'chat':
        this.handleChat(player, message.message ?? '');
        break;

      case 'leave':
        this.removePlayer(playerId, 'left');
        break;
    }
  }

  /**
   * Handle batched input message
   */
  private handleInput(player: ServerPlayer, message: any): void {
    if (!this.gameState || this.state !== 'playing') return;

    // Record to replay
    if (this.replayRecorder?.isActive()) {
      this.replayRecorder.recordInput({
        playerId: player.id,
        seq: message.seq ?? 0,
        type: message.inputType ?? 'move',
        direction: message.direction,
      });
    }

    // Process input
    player.processInput({
      seq: message.seq ?? 0,
      type: message.inputType ?? 'move',
      direction: message.direction,
      timestamp: message.timestamp ?? Date.now(),
    });
  }

  /**
   * Handle move message
   */
  private handleMove(player: ServerPlayer, message: any): void {
    if (!this.gameState || this.state !== 'playing') return;

    player.processInput({
      seq: message.seq ?? 0,
      type: 'move',
      direction: message.direction,
      timestamp: message.timestamp ?? Date.now(),
    });
  }

  /**
   * Handle stop message
   */
  private handleStop(player: ServerPlayer): void {
    if (!this.gameState || this.state !== 'playing') return;

    player.processInput({
      seq: 0,
      type: 'stop',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle bomb message
   */
  private handleBomb(player: ServerPlayer): void {
    if (!this.gameState || this.state !== 'playing') return;

    player.processInput({
      seq: 0,
      type: 'bomb',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle settings change (host only)
   */
  private handleSettingsChange(playerId: string, settings: Partial<RoomSettings> | undefined): void {
    if (playerId !== this.hostId || !settings) return;
    if (this.state !== 'waiting') return;

    // Update allowed settings
    if (settings.maxRounds !== undefined) {
      this.settings.maxRounds = Math.max(1, Math.min(10, settings.maxRounds));
    }
    if (settings.roundTimeLimit !== undefined) {
      this.settings.roundTimeLimit = Math.max(60, Math.min(300, settings.roundTimeLimit));
    }
    if (settings.mapName !== undefined) {
      this.settings.mapName = settings.mapName;
    }
    if (settings.powerupsEnabled !== undefined) {
      this.settings.powerupsEnabled = settings.powerupsEnabled;
    }

    // Broadcast new settings
    this.broadcast({
      type: 'settings_changed',
      settings: this.settings,
    } as ServerMessage);
  }

  /**
   * Handle chat message
   */
  private handleChat(player: ServerPlayer, message: string): void {
    // Sanitize message
    const sanitized = message.trim().slice(0, 200);
    if (!sanitized) return;

    this.broadcast({
      type: 'chat',
      playerId: player.id,
      playerName: player.name,
      message: sanitized,
      timestamp: Date.now(),
    } as ServerMessage);
  }

  // ============================================================================
  // BROADCASTING
  // ============================================================================

  /**
   * Broadcast a message to all players in the room
   */
  broadcast(message: ServerMessage): void {
    for (const player of this.players.values()) {
      player.send(message);
    }
    for (const spectator of this.spectators.values()) {
      spectator.send(message);
    }
  }

  /**
   * Broadcast to all except one player
   */
  broadcastExcept(excludeId: string, message: ServerMessage): void {
    for (const player of this.players.values()) {
      if (player.id !== excludeId) {
        player.send(message);
      }
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get an available player color
   */
  private getAvailableColor(index: number): string {
    const colors = [
      '#e6194b', '#3cb44b', '#ffe119', '#0082c8',
      '#f58231', '#911eb4', '#46f0f0', '#f032e6',
      '#d2f53c', '#fabebe', '#008080', '#e6beff',
      '#aa6e28', '#fffac8', '#800000', '#aaffc3',
    ];
    return colors[index % colors.length];
  }

  /**
   * Get an available spawn index
   */
  private getAvailableSpawnIndex(): number {
    const usedIndices = new Set(
      Array.from(this.players.values()).map(p => p.spawnIndex)
    );
    for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Get players formatted for lobby display
   */
  getPlayersForLobby(): Array<Record<string, unknown>> {
    return Array.from(this.players.values()).map(p => p.serializeForLobby());
  }

  /**
   * Get room info for listing
   */
  getInfo(): RoomInfo {
    const host = this.players.get(this.hostId);
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      hostId: this.hostId,
      hostName: host?.name ?? 'Unknown',
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      state: this.state,
      isPrivate: this.isPrivate,
      gameMode: this.settings.gameMode ?? 'classic',
      mapName: this.settings.mapName ?? 'classic',
    };
  }

  /**
   * Get replay data (after game ends)
   */
  async getReplayData(): Promise<{ id: string; data: Buffer } | null> {
    if (!this.replayRecorder) return null;

    try {
      const compressed = await this.replayRecorder.getCompressedReplay();
      return {
        id: compressed.id,
        data: compressed.compressedData,
      };
    } catch (error) {
      console.error('Failed to get replay data:', error);
      return null;
    }
  }
}

// ============================================================================
// ROOM EVENT TYPES
// ============================================================================

export type RoomEvent =
  | { type: 'room_closed'; roomId: string }
  | { type: 'room_empty'; roomId: string }
  | { type: 'player_joined'; roomId: string; playerId: string }
  | { type: 'player_left'; roomId: string; playerId: string; reason: string }
  | { type: 'all_ready'; roomId: string }
  | { type: 'game_started'; roomId: string }
  | { type: 'game_ended'; roomId: string; winnerId: string | null };

// ============================================================================
// GAME EVENT TYPES
// ============================================================================

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// ROOM MANAGER CLASS
// ============================================================================

export class RoomManager {
  /** All active rooms */
  private rooms: Map<string, Room> = new Map();

  /** Room code to room ID mapping */
  private roomCodes: Map<string, string> = new Map();

  /** Room event callback */
  private onRoomEvent: ((event: RoomEvent) => void) | null = null;

  /**
   * Set room event callback
   */
  setEventCallback(callback: (event: RoomEvent) => void): void {
    this.onRoomEvent = callback;
  }

  /**
   * Create a new room
   */
  createRoom(
    hostPlayer: ServerPlayer,
    options: {
      name?: string;
      isPrivate?: boolean;
      settings?: Partial<RoomSettings>;
      maxPlayers?: number;
    } = {}
  ): Room {
    const roomId = crypto.randomUUID();
    const code = this.generateRoomCode();

    const room = new Room({
      id: roomId,
      name: options.name ?? `${hostPlayer.name}'s Room`,
      code,
      hostId: hostPlayer.id,
      isPrivate: options.isPrivate ?? false,
      settings: {
        gameMode: 'classic',
        maxRounds: 3,
        roundTimeLimit: 180,
        suddenDeathEnabled: true,
        suddenDeathDelay: 120,
        powerupsEnabled: true,
        respawnEnabled: false,
        ...options.settings,
      },
      maxPlayers: options.maxPlayers ?? 8,
    });

    room.setEventCallback((event) => {
      this.handleRoomEvent(event);
    });

    this.rooms.set(roomId, room);
    this.roomCodes.set(code, roomId);

    // Add the host to the room
    room.addPlayer(hostPlayer);

    return room;
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get a room by code
   */
  getRoomByCode(code: string): Room | undefined {
    const roomId = this.roomCodes.get(code.toUpperCase());
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Remove a room
   */
  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.roomCodes.delete(room.code);
      this.rooms.delete(roomId);
    }
  }

  /**
   * Get all public rooms
   */
  getPublicRooms(): RoomInfo[] {
    const publicRooms: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.state === 'waiting') {
        publicRooms.push(room.getInfo());
      }
    }
    return publicRooms;
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Generate a unique room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.roomCodes.has(code));
    return code;
  }

  /**
   * Handle room events
   */
  private handleRoomEvent(event: RoomEvent): void {
    if (event.type === 'room_empty' || event.type === 'room_closed') {
      this.removeRoom(event.roomId);
    }

    if (this.onRoomEvent) {
      this.onRoomEvent(event);
    }
  }

  /**
   * Clean up stale rooms
   */
  cleanupStaleRooms(maxAgeMs: number = 600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.state === 'waiting' && now - room.lastActivityAt > maxAgeMs) {
        room.close();
        this.removeRoom(roomId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRooms: number;
    playingRooms: number;
    waitingRooms: number;
    totalPlayers: number;
  } {
    let playingRooms = 0;
    let waitingRooms = 0;
    let totalPlayers = 0;

    for (const room of this.rooms.values()) {
      if (room.state === 'playing' || room.state === 'countdown') {
        playingRooms++;
      } else {
        waitingRooms++;
      }
      totalPlayers += room.players.size;
    }

    return {
      totalRooms: this.rooms.size,
      playingRooms,
      waitingRooms,
      totalPlayers,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Room;
