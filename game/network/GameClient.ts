/**
 * WebSocket game client for Bomberman Online
 * Handles connection to game server and message passing
 */

import type { ClientMessage, ServerMessage } from '@/types/websocket';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GameClientOptions {
  url: string;
  token?: string;
  onMessage?: (message: ServerMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * WebSocket client for game server communication
 */
export class GameClient {
  private ws: WebSocket | null = null;
  private options: GameClientOptions;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(options: GameClientOptions) {
    this.options = options;
  }

  /**
   * Connect to the game server
   */
  connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.setState('connected');
        this.reconnectAttempts = 0;

        // Authentication is handled via join_room message
        // Connection is ready for room operations
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.options.onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse server message:', error);
        }
      };

      this.ws.onclose = () => {
        this.setState('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setState('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setState('error');
    }
  }

  /**
   * Disconnect from the game server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  /**
   * Send a message to the server
   */
  send(message: ClientMessage): void {
    if (this.ws && this.state === 'connected') {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Join a game room
   */
  joinRoom(roomCode: string, clerkId: string): void {
    this.send({
      type: 'join_room',
      roomCode,
      auth: {
        token: this.options.token || '',
        clerkId,
      },
    });
  }

  /**
   * Send player input
   */
  sendInput(input: {
    direction: 'up' | 'down' | 'left' | 'right' | null;
    bomb: boolean;
    seq: number;
  }): void {
    const timestamp = Date.now();
    if (input.direction) {
      this.send({ type: 'move', direction: input.direction, seq: input.seq, timestamp });
    }
    if (input.bomb) {
      this.send({ type: 'bomb', seq: input.seq, timestamp });
    }
  }

  /**
   * Send stop movement
   */
  sendStop(seq: number): void {
    this.send({ type: 'stop', seq, timestamp: Date.now() });
  }

  /**
   * Send special action (kick/punch)
   */
  sendSpecialAction(action: 'kick' | 'punch', direction: 'up' | 'down' | 'left' | 'right', seq: number): void {
    this.send({ type: 'special', action, direction, seq, timestamp: Date.now() });
  }

  /**
   * Send ready status
   */
  sendReady(isReady: boolean): void {
    this.send({ type: 'ready', isReady });
  }

  /**
   * Send chat message
   */
  sendChat(content: string, messageType: 'text' | 'emoji' | 'quick_chat' = 'text'): void {
    this.send({ type: 'chat', content, messageType });
  }

  /**
   * Change player color
   */
  changeColor(color: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7): void {
    this.send({ type: 'change_color', color });
  }

  /**
   * Request full state sync
   */
  requestSync(): void {
    this.send({ type: 'request_sync' });
  }

  /**
   * Send a ping to measure latency
   */
  ping(): void {
    this.send({ type: 'ping', timestamp: Date.now() });
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.state === 'disconnected') {
        this.connect();
      }
    }, delay);
  }
}
