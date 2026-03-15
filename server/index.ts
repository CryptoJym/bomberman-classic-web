/**
 * Bomberman Game Server Entry Point
 * WebSocket server with Express HTTP for health checks
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

import { createServerPlayer, ServerPlayer } from './Player';
import { Room, RoomManager, RoomEvent } from './Room';
import { MatchmakingQueue, MatchResult, GameMode } from './Matchmaking';
import {
  authenticateConnection,
  getClientIP,
  checkConnectionRateLimit,
  recordConnectionClose,
  rateLimiter,
  generateReconnectToken,
  verifyReconnectToken,
} from './auth';
import type { ClientMessage, ServerMessage, ErrorCode } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const PING_INTERVAL_MS = 30000; // 30 seconds
const STALE_CONNECTION_TIMEOUT_MS = 60000; // 1 minute
const ROOM_CLEANUP_INTERVAL_MS = 60000; // 1 minute

// ============================================================================
// SERVER INSTANCE
// ============================================================================

class BombermanServer {
  /** Express application */
  private app: express.Application;

  /** HTTP server */
  private httpServer: ReturnType<typeof createServer>;

  /** WebSocket server */
  private wss: WebSocketServer;

  /** Room manager */
  private roomManager: RoomManager;

  /** Matchmaking queue */
  private matchmaking: MatchmakingQueue;

  /** Connected players by socket */
  private playersBySocket: Map<WebSocket, ServerPlayer> = new Map();

  /** Connected players by ID */
  private playersById: Map<string, ServerPlayer> = new Map();

  /** Ping interval */
  private pingInterval: NodeJS.Timeout | null = null;

  /** Room cleanup interval */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /** Server start time */
  private startTime: number = Date.now();

  constructor() {
    // Initialize Express
    this.app = express();
    this.app.use(express.json());
    this.setupHttpRoutes();

    // Create HTTP server
    this.httpServer = createServer(this.app);

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: '/ws',
      maxPayload: 64 * 1024, // 64KB max message size
    });

    // Initialize managers
    this.roomManager = new RoomManager();
    this.matchmaking = new MatchmakingQueue();

    // Setup event handlers
    this.setupWebSocketHandlers();
    this.setupRoomEvents();
  }

  // ============================================================================
  // HTTP ROUTES
  // ============================================================================

  private setupHttpRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: Date.now() - this.startTime,
        timestamp: Date.now(),
      });
    });

    // Server stats
    this.app.get('/stats', (req, res) => {
      const roomStats = this.roomManager.getStats();
      const matchmakingStats = this.matchmaking.getStats();

      res.json({
        server: {
          uptime: Date.now() - this.startTime,
          connectedPlayers: this.playersById.size,
          environment: NODE_ENV,
        },
        rooms: roomStats,
        matchmaking: matchmakingStats,
      });
    });

    // List public rooms
    this.app.get('/rooms', (req, res) => {
      const rooms = this.roomManager.getPublicRooms();
      res.json({ rooms });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  // ============================================================================
  // WEBSOCKET SETUP
  // ============================================================================

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', async (socket: WebSocket, request: IncomingMessage) => {
      await this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private setupRoomEvents(): void {
    this.roomManager.setEventCallback((event: RoomEvent) => {
      this.handleRoomEvent(event);
    });
  }

  // ============================================================================
  // CONNECTION HANDLING
  // ============================================================================

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const ip = getClientIP(request);

    // Check connection rate limit
    const rateLimitResult = checkConnectionRateLimit(ip);
    if (!rateLimitResult.allowed) {
      socket.close(1008, 'Too many connections');
      return;
    }

    // Authenticate connection
    const authResult = await authenticateConnection(request);
    if (!authResult.success) {
      this.sendError(socket, authResult.error!.code, authResult.error!.message);
      socket.close(1008, 'Authentication failed');
      return;
    }

    // Check for reconnection token
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const reconnectToken = url.searchParams.get('reconnect');

    if (reconnectToken) {
      const reconnectResult = this.handleReconnection(socket, reconnectToken, authResult.clerkId!);
      if (reconnectResult) {
        return; // Reconnection handled
      }
    }

    // Check if player already connected
    const existingPlayer = this.findPlayerByClerkId(authResult.clerkId!);
    if (existingPlayer) {
      // Close old connection
      existingPlayer.socket.close(1000, 'New connection established');
      this.removePlayer(existingPlayer);
    }

    // Create new player
    const player = createServerPlayer(
      authResult.clerkId!,
      authResult.username!,
      socket,
      this.playersById.size
    );

    this.playersBySocket.set(socket, player);
    this.playersById.set(player.id, player);

    console.log(`Player connected: ${player.name} (${player.id}) from ${ip}`);

    // Send welcome message
    player.send({
      type: 'connected',
      playerId: player.id,
      serverTime: Date.now(),
    } as ServerMessage);

    // Setup socket event handlers
    this.setupPlayerSocketHandlers(socket, player);
  }

  private handleReconnection(
    socket: WebSocket,
    token: string,
    clerkId: string
  ): boolean {
    const result = verifyReconnectToken(token);
    if (!result.valid) {
      return false;
    }

    const room = this.roomManager.getRoom(result.roomId!);
    if (!room) {
      return false;
    }

    const reconnectResult = room.reconnectPlayer(clerkId, socket);
    if (reconnectResult.success && reconnectResult.player) {
      this.playersBySocket.set(socket, reconnectResult.player);
      this.playersById.set(reconnectResult.player.id, reconnectResult.player);
      this.setupPlayerSocketHandlers(socket, reconnectResult.player);
      console.log(`Player reconnected: ${reconnectResult.player.name}`);
      return true;
    }

    return false;
  }

  private setupPlayerSocketHandlers(socket: WebSocket, player: ServerPlayer): void {
    socket.on('message', (data: Buffer | string) => {
      this.handleMessage(socket, player, data);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnect(socket, player, code, reason.toString());
    });

    socket.on('error', (error: Error) => {
      console.error(`Socket error for player ${player.id}:`, error.message);
    });

    socket.on('pong', () => {
      player.updateLatency(Date.now() - player.lastPingAt);
    });
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleMessage(socket: WebSocket, player: ServerPlayer, data: Buffer | string): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      // Rate limiting
      const rateResult = rateLimiter.check(player.id, message.type);
      if (!rateResult.allowed) {
        player.sendError(4001 as ErrorCode, 'Rate limit exceeded', {
          retryAfterMs: rateResult.retryAfterMs,
        });
        return;
      }

      // Update activity timestamp
      player.lastActivityAt = Date.now();

      // Handle message based on type
      switch (message.type) {
        case 'ping':
          this.handlePing(player, message);
          break;

        case 'join':
          this.handleJoin(player, message);
          break;

        case 'create':
          this.handleCreateRoom(player, message);
          break;

        case 'leave':
          this.handleLeave(player);
          break;

        case 'queue':
          this.handleQueueJoin(player, message);
          break;

        case 'dequeue':
          this.handleQueueLeave(player);
          break;

        case 'spectate':
          this.handleSpectate(player, message);
          break;

        default:
          // Forward game messages to room
          this.forwardToRoom(player, message);
          break;
      }
    } catch (error) {
      console.error(`Invalid message from player ${player.id}:`, error);
      player.sendError(4000 as ErrorCode, 'Invalid message format');
    }
  }

  private handlePing(player: ServerPlayer, message: any): void {
    player.send({
      type: 'pong',
      clientTime: message.timestamp,
      serverTime: Date.now(),
    } as ServerMessage);
  }

  private handleJoin(player: ServerPlayer, message: any): void {
    // Check if already in a room
    if (player.roomId) {
      player.sendError(2000 as ErrorCode, 'Already in a room');
      return;
    }

    let room: Room | undefined;

    // Join by room code
    if (message.roomCode) {
      room = this.roomManager.getRoomByCode(message.roomCode);
      if (!room) {
        player.sendError(2004 as ErrorCode, 'Room not found');
        return;
      }
    }
    // Join by room ID
    else if (message.roomId) {
      room = this.roomManager.getRoom(message.roomId);
      if (!room) {
        player.sendError(2004 as ErrorCode, 'Room not found');
        return;
      }
    }
    // Quick play - join any available room
    else {
      const publicRooms = this.roomManager.getPublicRooms();
      const availableRoom = publicRooms.find(
        r => r.state === 'waiting' && r.playerCount < r.maxPlayers
      );
      if (availableRoom) {
        room = this.roomManager.getRoom(availableRoom.id);
      }
    }

    if (!room) {
      player.sendError(2004 as ErrorCode, 'No rooms available');
      return;
    }

    const result = room.addPlayer(player);
    if (!result.success) {
      player.sendError(result.error!.code, result.error!.message);
    }
  }

  private handleCreateRoom(player: ServerPlayer, message: any): void {
    // Check if already in a room
    if (player.roomId) {
      player.sendError(2000 as ErrorCode, 'Already in a room');
      return;
    }

    const room = this.roomManager.createRoom(player, {
      name: message.roomName,
      isPrivate: message.isPrivate ?? false,
      settings: message.settings,
      maxPlayers: message.maxPlayers,
    });

    console.log(`Room created: ${room.code} by ${player.name}`);
  }

  private handleLeave(player: ServerPlayer): void {
    if (player.roomId) {
      const room = this.roomManager.getRoom(player.roomId);
      if (room) {
        room.removePlayer(player.id, 'left');
      }
    }

    // Also remove from matchmaking queue
    this.matchmaking.dequeue(player.id);
  }

  private handleQueueJoin(player: ServerPlayer, message: any): void {
    if (player.roomId) {
      player.sendError(2000 as ErrorCode, 'Leave room before joining queue');
      return;
    }

    const result = this.matchmaking.enqueue(
      player,
      (message.gameMode as GameMode) ?? 'classic',
      message.eloRating ?? 1000,
      message.region
    );

    if (result.success) {
      player.send({
        type: 'queue_joined',
        position: result.position,
        estimatedWaitMs: result.estimatedWaitMs,
      } as ServerMessage);
    } else {
      player.sendError(2000 as ErrorCode, 'Already in queue');
    }
  }

  private handleQueueLeave(player: ServerPlayer): void {
    if (this.matchmaking.dequeue(player.id)) {
      player.send({
        type: 'queue_left',
      } as ServerMessage);
    }
  }

  private handleSpectate(player: ServerPlayer, message: any): void {
    const room = this.roomManager.getRoom(message.roomId);
    if (!room) {
      player.sendError(2004 as ErrorCode, 'Room not found');
      return;
    }

    // TODO: Implement spectator mode
    player.sendError(4000 as ErrorCode, 'Spectator mode not yet implemented');
  }

  private forwardToRoom(player: ServerPlayer, message: ClientMessage): void {
    if (!player.roomId) {
      player.sendError(2000 as ErrorCode, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(player.roomId);
    if (!room) {
      player.roomId = null;
      player.sendError(2004 as ErrorCode, 'Room not found');
      return;
    }

    room.handleMessage(player.id, message);
  }

  // ============================================================================
  // DISCONNECT HANDLING
  // ============================================================================

  private handleDisconnect(
    socket: WebSocket,
    player: ServerPlayer,
    code: number,
    reason: string
  ): void {
    console.log(`Player disconnected: ${player.name} (${player.id}) - Code: ${code}`);

    // Remove from room
    if (player.roomId) {
      const room = this.roomManager.getRoom(player.roomId);
      if (room) {
        // Generate reconnection token if game is in progress
        if (room.state === 'playing') {
          const reconnectToken = generateReconnectToken(
            player.id,
            room.id,
            player.clerkId
          );
          // Store token for potential reconnection
          // In production, this would be sent via a side channel
          console.log(`Reconnection token for ${player.name}: ${reconnectToken.slice(0, 20)}...`);
        }
        room.removePlayer(player.id, 'disconnected');
      }
    }

    // Remove from matchmaking
    this.matchmaking.dequeue(player.id);

    // Clean up rate limiter
    rateLimiter.removeConnection(player.id);

    // Record connection close for IP tracking
    // Note: We'd need to track IP per player for this
    // recordConnectionClose(ip);

    // Remove from maps
    this.removePlayer(player);
  }

  private removePlayer(player: ServerPlayer): void {
    this.playersBySocket.delete(player.socket);
    this.playersById.delete(player.id);
    player.disconnect();
  }

  // ============================================================================
  // ROOM EVENTS
  // ============================================================================

  private handleRoomEvent(event: RoomEvent): void {
    switch (event.type) {
      case 'room_empty':
        console.log(`Room ${event.roomId} is empty, removing...`);
        break;

      case 'game_ended':
        console.log(`Game ended in room ${event.roomId}, winner: ${event.winnerId ?? 'none'}`);
        break;
    }
  }

  // ============================================================================
  // MATCHMAKING EVENTS
  // ============================================================================

  private handleMatchFound(match: MatchResult): void {
    console.log(`Match found: ${match.matchId} with ${match.players.length} players`);

    // Create a room for the matched players
    const host = match.players[0];
    const room = this.roomManager.createRoom(host, {
      name: `Ranked ${match.gameMode}`,
      isPrivate: true,
      settings: { gameMode: match.gameMode },
      maxPlayers: match.players.length,
    });

    // Add other players to the room
    for (let i = 1; i < match.players.length; i++) {
      room.addPlayer(match.players[i]);
    }

    // Notify players
    for (const player of match.players) {
      player.send({
        type: 'match_found',
        matchId: match.matchId,
        roomId: room.id,
        roomCode: room.code,
        players: match.players.map(p => ({
          id: p.id,
          name: p.name,
        })),
        averageElo: match.averageElo,
      } as ServerMessage);
    }

    // Auto-start the game after a short delay
    setTimeout(() => {
      if (room.state === 'waiting') {
        room.startGame();
      }
    }, 5000);
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();

      for (const [socket, player] of this.playersBySocket.entries()) {
        // Check for stale connections
        if (player.isConnectionStale(STALE_CONNECTION_TIMEOUT_MS)) {
          console.log(`Closing stale connection: ${player.name}`);
          socket.close(1000, 'Connection timeout');
          continue;
        }

        // Send ping
        if (socket.readyState === WebSocket.OPEN) {
          player.lastPingAt = now;
          socket.ping();
        }
      }
    }, PING_INTERVAL_MS);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.roomManager.cleanupStaleRooms();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} stale rooms`);
      }
    }, ROOM_CLEANUP_INTERVAL_MS);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private findPlayerByClerkId(clerkId: string): ServerPlayer | undefined {
    for (const player of this.playersById.values()) {
      if (player.clerkId === clerkId) {
        return player;
      }
    }
    return undefined;
  }

  private sendError(socket: WebSocket, code: ErrorCode, message: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'error',
        code,
        message,
      }));
    }
  }

  // ============================================================================
  // SERVER LIFECYCLE
  // ============================================================================

  /**
   * Start the server
   */
  start(): void {
    // Start matchmaking service
    this.matchmaking.start((match) => this.handleMatchFound(match));

    // Start maintenance intervals
    this.startPingInterval();
    this.startCleanupInterval();

    // Start HTTP server
    this.httpServer.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      console.log(`Bomberman Game Server`);
      console.log('='.repeat(50));
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`HTTP Server: http://${HOST}:${PORT}`);
      console.log(`WebSocket:   ws://${HOST}:${PORT}/ws`);
      console.log(`Health:      http://${HOST}:${PORT}/health`);
      console.log(`Stats:       http://${HOST}:${PORT}/stats`);
      console.log('='.repeat(50));
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down server...');

    // Stop intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop matchmaking
    this.matchmaking.stop();

    // Close all rooms
    for (const room of this.roomManager.getAllRooms()) {
      room.close();
    }

    // Close all WebSocket connections
    for (const socket of this.playersBySocket.keys()) {
      socket.close(1001, 'Server shutting down');
    }

    // Close WebSocket server
    this.wss.close();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });

    console.log('Server shutdown complete');
  }
}

// ============================================================================
// MAIN
// ============================================================================

const server = new BombermanServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

// Start server
server.start();

// Export for testing
export { BombermanServer };
export default server;
