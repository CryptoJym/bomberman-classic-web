import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLobbyStore } from '@/lib/stores/lobbyStore';
import { useRoom } from './useRoom';
import type {
  ServerMessage,
  ClientMessage,
  RoomJoinedMessage,
  RoomCreatedMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PlayerReadyMessage,
  SettingsUpdatedMessage,
  ColorChangedMessage,
  MapSelectedMessage,
  ErrorMessage,
} from '@/types/websocket';
import type { RoomSettings, PlayerColor } from '@/types/game';

/**
 * WebSocket connection state
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Hook for WebSocket lobby connection and actions
 * Manages WebSocket connection to game server for lobby functionality
 */
export function useLobby() {
  const { getToken, userId } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const { setCurrentRoom, setCurrentPlayerId, addPlayer, removePlayer, updatePlayer } = useRoom();
  const updateRoomSettings = useLobbyStore((state) => state.updateRoomSettings);
  const currentRoom = useLobbyStore((state) => state.currentRoom);

  // Get WebSocket URL from environment
  const wsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'ws://localhost:8080';

  /**
   * Send a message through WebSocket
   */
  const sendMessage = useCallback((message: ClientMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;

        switch (message.type) {
          case 'connected':
            setConnectionState('connected');
            setError(null);
            reconnectAttempts.current = 0;
            break;

          case 'room_joined': {
            const msg = message as RoomJoinedMessage;
            setCurrentRoom(msg.roomState);
            setCurrentPlayerId(msg.playerId);
            break;
          }

          case 'room_created': {
            const msg = message as RoomCreatedMessage;
            setCurrentRoom(msg.roomState);
            break;
          }

          case 'player_joined': {
            const msg = message as PlayerJoinedMessage;
            addPlayer(msg.player);
            break;
          }

          case 'player_left': {
            const msg = message as PlayerLeftMessage;
            removePlayer(msg.playerId);
            // Handle host change
            if (msg.newHostId) {
              updatePlayer(msg.newHostId, { isHost: true });
            }
            break;
          }

          case 'player_ready': {
            const msg = message as PlayerReadyMessage;
            updatePlayer(msg.playerId, { isReady: msg.isReady });
            break;
          }

          case 'settings_updated': {
            const msg = message as SettingsUpdatedMessage;
            updateRoomSettings(msg.settings);
            break;
          }

          case 'color_changed': {
            const msg = message as ColorChangedMessage;
            updatePlayer(msg.playerId, { color: msg.color });
            break;
          }

          case 'map_selected': {
            const msg = message as MapSelectedMessage;
            if (currentRoom) {
              setCurrentRoom({
                ...currentRoom,
                map: msg.map,
              });
            }
            break;
          }

          case 'error': {
            const msg = message as ErrorMessage;
            setError(msg.message);
            console.error('Server error:', msg.message, msg.code);
            break;
          }

          case 'kicked':
            setError('You have been kicked from the room');
            disconnect();
            break;

          default:
            // Handle other message types (game state, etc.) if needed
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    },
    [
      setCurrentRoom,
      setCurrentPlayerId,
      addPlayer,
      removePlayer,
      updatePlayer,
      updateRoomSettings,
      currentRoom,
    ]
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const token = await getToken();
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = handleMessage;

      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionState('error');
        setError('Connection error');
      };

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current++;

          reconnectTimeout.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.current = socket;
    } catch (err) {
      console.error('Failed to connect:', err);
      setConnectionState('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [wsUrl, getToken, userId, handleMessage]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }

    setConnectionState('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  /**
   * Join a room
   */
  const joinRoom = useCallback(
    async (roomCode: string, password?: string) => {
      const token = await getToken();
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      sendMessage({
        type: 'join_room',
        roomCode,
        auth: { token, clerkId: userId },
        password,
      });
    },
    [getToken, userId, sendMessage]
  );

  /**
   * Create a new room
   */
  const createRoom = useCallback(
    async (settings?: Partial<RoomSettings>) => {
      const token = await getToken();
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      sendMessage({
        type: 'create_room',
        auth: { token, clerkId: userId },
        settings: settings || {},
      });
    },
    [getToken, userId, sendMessage]
  );

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    sendMessage({ type: 'leave_room' });
    setCurrentRoom(null);
    setCurrentPlayerId(null);
  }, [sendMessage, setCurrentRoom, setCurrentPlayerId]);

  /**
   * Toggle ready state
   */
  const toggleReady = useCallback(
    (isReady: boolean) => {
      sendMessage({ type: 'ready', isReady });
    },
    [sendMessage]
  );

  /**
   * Change player color
   */
  const changeColor = useCallback(
    (color: PlayerColor) => {
      sendMessage({ type: 'change_color', color });
    },
    [sendMessage]
  );

  /**
   * Update room settings (host only)
   */
  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) => {
      sendMessage({ type: 'update_settings', settings });
    },
    [sendMessage]
  );

  /**
   * Select a map (host only)
   */
  const selectMap = useCallback(
    (mapId: string) => {
      sendMessage({ type: 'select_map', mapId });
    },
    [sendMessage]
  );

  /**
   * Start the game (host only)
   */
  const startGame = useCallback(() => {
    sendMessage({ type: 'start_game' });
  }, [sendMessage]);

  /**
   * Kick a player (host only)
   */
  const kickPlayer = useCallback(
    (playerId: string) => {
      sendMessage({ type: 'kick_player', playerId });
    },
    [sendMessage]
  );

  /**
   * Transfer host to another player (host only)
   */
  const transferHost = useCallback(
    (newHostId: string) => {
      sendMessage({ type: 'transfer_host', newHostId });
    },
    [sendMessage]
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // State
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    error,

    // Connection actions
    connect,
    disconnect,

    // Room actions
    joinRoom,
    createRoom,
    leaveRoom,

    // Player actions
    toggleReady,
    changeColor,

    // Host actions
    updateSettings,
    selectMap,
    startGame,
    kickPlayer,
    transferHost,
  };
}
