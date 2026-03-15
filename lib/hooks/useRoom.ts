import { useCallback } from 'react';
import { useLobbyStore, useCurrentPlayer, useAllPlayersReady } from '@/lib/stores/lobbyStore';
import type { RoomSettings, PlayerColor } from '@/types/game';

/**
 * Hook for room state and actions
 * Provides easy access to current room state and actions
 */
export function useRoom() {
  const currentRoom = useLobbyStore((state) => state.currentRoom);
  const isInRoom = useLobbyStore((state) => state.isInRoom);
  const isHost = useLobbyStore((state) => state.isHost);
  const currentPlayerId = useLobbyStore((state) => state.currentPlayerId);

  const setCurrentRoom = useLobbyStore((state) => state.setCurrentRoom);
  const setCurrentPlayerId = useLobbyStore((state) => state.setCurrentPlayerId);
  const updateRoomSettings = useLobbyStore((state) => state.updateRoomSettings);
  const addPlayer = useLobbyStore((state) => state.addPlayer);
  const removePlayer = useLobbyStore((state) => state.removePlayer);
  const updatePlayer = useLobbyStore((state) => state.updatePlayer);

  const currentPlayer = useCurrentPlayer();
  const allPlayersReady = useAllPlayersReady();

  // Toggle ready state for current player
  const toggleReady = useCallback(() => {
    if (!currentPlayerId || !currentPlayer) {
      return;
    }

    updatePlayer(currentPlayerId, {
      isReady: !currentPlayer.isReady,
    });
  }, [currentPlayerId, currentPlayer, updatePlayer]);

  // Change player color
  const changeColor = useCallback(
    (color: PlayerColor) => {
      if (!currentPlayerId) {
        return;
      }

      updatePlayer(currentPlayerId, { color });
    },
    [currentPlayerId, updatePlayer]
  );

  // Update room settings (host only)
  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) => {
      if (!isHost) {
        console.warn('Only the host can update room settings');
        return;
      }

      updateRoomSettings(settings);
    },
    [isHost, updateRoomSettings]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    setCurrentRoom(null);
    setCurrentPlayerId(null);
  }, [setCurrentRoom, setCurrentPlayerId]);

  // Check if a color is available
  const isColorAvailable = useCallback(
    (color: PlayerColor) => {
      if (!currentRoom) {
        return true;
      }
      return !currentRoom.players.some((p) => p.color === color && p.id !== currentPlayerId);
    },
    [currentRoom, currentPlayerId]
  );

  // Get player count
  const playerCount = currentRoom?.players.length || 0;
  const maxPlayers = currentRoom?.settings.maxPlayers || 0;
  const isFull = playerCount >= maxPlayers;

  // Check if can start game
  const canStartGame =
    isHost &&
    playerCount >= 2 &&
    allPlayersReady &&
    currentRoom?.phase === 'waiting';

  return {
    // State
    currentRoom,
    isInRoom,
    isHost,
    currentPlayerId,
    currentPlayer,
    players: currentRoom?.players || [],
    settings: currentRoom?.settings,
    playerCount,
    maxPlayers,
    isFull,
    allPlayersReady,
    canStartGame,

    // Actions
    toggleReady,
    changeColor,
    updateSettings,
    leaveRoom,
    isColorAvailable,
    setCurrentRoom,
    setCurrentPlayerId,
    addPlayer,
    removePlayer,
    updatePlayer,
  };
}

/**
 * Hook to check if user can join a room
 */
export function useCanJoinRoom(roomCode?: string) {
  const isInRoom = useLobbyStore((state) => state.isInRoom);
  const currentRoom = useLobbyStore((state) => state.currentRoom);

  // Already in a different room
  if (isInRoom && currentRoom?.roomCode !== roomCode) {
    return {
      canJoin: false,
      reason: 'You are already in another room',
    };
  }

  // Already in this room
  if (isInRoom && currentRoom?.roomCode === roomCode) {
    return {
      canJoin: true,
      reason: 'Already in this room',
      alreadyInRoom: true,
    };
  }

  return {
    canJoin: true,
    reason: null,
    alreadyInRoom: false,
  };
}
