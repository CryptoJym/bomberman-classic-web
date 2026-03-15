import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './GameRoom';
import { MessageHandler } from './MessageHandler';
import type { ClientMessage } from './types';

const PORT = parseInt(process.env.GAME_SERVER_PORT || '8080', 10);

interface Client {
  ws: WebSocket;
  playerId: string | null;
  roomCode: string | null;
}

class GameServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client>;
  private rooms: Map<string, GameRoom>;
  private messageHandler: MessageHandler;

  constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.clients = new Map();
    this.rooms = new Map();
    this.messageHandler = new MessageHandler(this);

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`🎮 Game Server running on ws://localhost:${PORT}`);
  }

  private handleConnection(ws: WebSocket): void {
    const client: Client = {
      ws,
      playerId: null,
      roomCode: null,
    };

    this.clients.set(ws, client);
    console.log(`✅ Client connected. Total: ${this.clients.size}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.messageHandler.handle(client, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleDisconnect(client: Client): void {
    if (client.roomCode) {
      const room = this.rooms.get(client.roomCode);
      if (room) {
        room.removePlayer(client.playerId!);
        if (room.isEmpty()) {
          this.rooms.delete(client.roomCode);
          console.log(`🗑️  Room ${client.roomCode} deleted (empty)`);
        }
      }
    }

    this.clients.delete(client.ws);
    console.log(`❌ Client disconnected. Total: ${this.clients.size}`);
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  public createRoom(roomCode: string): GameRoom {
    const room = new GameRoom(roomCode);
    this.rooms.set(roomCode, room);
    console.log(`🆕 Room created: ${roomCode}`);
    return room;
  }

  public getRoomOrCreate(roomCode: string): GameRoom {
    return this.getRoom(roomCode) || this.createRoom(roomCode);
  }

  public broadcast(roomCode: string, message: unknown): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    const payload = JSON.stringify(message);
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public sendToPlayer(playerId: string, message: unknown): void {
    const payload = JSON.stringify(message);
    for (const [ws, client] of this.clients.entries()) {
      if (client.playerId === playerId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

// Start server
new GameServer();
