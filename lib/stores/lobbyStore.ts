import { create } from 'zustand';
import type { RoomState, RoomListItem, PlayerSummary } from '@/types/game';

/**
 * Lobby filter options
 */
export interface LobbyFilters {
  /** Search by room code or host name */
  search: string;
  /** Filter by player count */
  playerRange: { min: number; max: number };
  /** Show only non-full rooms */
  hideFullRooms: boolean;
  /** Show only rooms in lobby phase */
  hideInProgress: boolean;
  /** Show only public rooms */
  hidePrivate: boolean;
}

/**
 * Lobby sort options
 */
export type LobbySortOption = 'created' | 'players' | 'map';

/**
 * Lobby store state
 */
interface LobbyStoreState {
  // Room list
  rooms: RoomListItem[];
  isLoadingRooms: boolean;
  roomsError: string | null;

  // Current room state
  currentRoom: RoomState | null;
  isInRoom: boolean;
  isHost: boolean;
  currentPlayerId: string | null;

  // Filters and sorting
  filters: LobbyFilters;
  sortBy: LobbySortOption;
  sortDirection: 'asc' | 'desc';

  // Actions
  setRooms: (rooms: RoomListItem[]) => void;
  setLoadingRooms: (loading: boolean) => void;
  setRoomsError: (error: string | null) => void;
  addRoom: (room: RoomListItem) => void;
  updateRoom: (roomId: string, updates: Partial<RoomListItem>) => void;
  removeRoom: (roomId: string) => void;

  setCurrentRoom: (room: RoomState | null) => void;
  setIsInRoom: (inRoom: boolean) => void;
  setIsHost: (isHost: boolean) => void;
  setCurrentPlayerId: (playerId: string | null) => void;

  updateRoomSettings: (updates: Partial<RoomState['settings']>) => void;
  addPlayer: (player: PlayerSummary) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<PlayerSummary>) => void;

  setFilters: (filters: Partial<LobbyFilters>) => void;
  setSortBy: (sortBy: LobbySortOption) => void;
  toggleSortDirection: () => void;

  reset: () => void;
}

/**
 * Default filter values
 */
const DEFAULT_FILTERS: LobbyFilters = {
  search: '',
  playerRange: { min: 0, max: 16 },
  hideFullRooms: false,
  hideInProgress: true,
  hidePrivate: false,
};

/**
 * Zustand store for lobby state management
 */
export const useLobbyStore = create<LobbyStoreState>((set, get) => ({
  // Initial state
  rooms: [],
  isLoadingRooms: false,
  roomsError: null,

  currentRoom: null,
  isInRoom: false,
  isHost: false,
  currentPlayerId: null,

  filters: DEFAULT_FILTERS,
  sortBy: 'created',
  sortDirection: 'desc',

  // Room list actions
  setRooms: (rooms) => set({ rooms, roomsError: null }),

  setLoadingRooms: (loading) => set({ isLoadingRooms: loading }),

  setRoomsError: (error) => set({ roomsError: error, isLoadingRooms: false }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [room, ...state.rooms],
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((room) => room.id !== roomId),
    })),

  // Current room actions
  setCurrentRoom: (room) => {
    const state = get();
    set({
      currentRoom: room,
      isInRoom: room !== null,
      isHost: room ? room.hostId === state.currentPlayerId : false,
    });
  },

  setIsInRoom: (inRoom) => set({ isInRoom: inRoom }),

  setIsHost: (isHost) => set({ isHost }),

  setCurrentPlayerId: (playerId) => {
    const state = get();
    set({
      currentPlayerId: playerId,
      isHost: state.currentRoom ? state.currentRoom.hostId === playerId : false,
    });
  },

  updateRoomSettings: (updates) =>
    set((state) => {
      if (!state.currentRoom) {
        return state;
      }
      return {
        currentRoom: {
          ...state.currentRoom,
          settings: {
            ...state.currentRoom.settings,
            ...updates,
          },
        },
      };
    }),

  addPlayer: (player) =>
    set((state) => {
      if (!state.currentRoom) {
        return state;
      }
      return {
        currentRoom: {
          ...state.currentRoom,
          players: [...state.currentRoom.players, player],
        },
      };
    }),

  removePlayer: (playerId) =>
    set((state) => {
      if (!state.currentRoom) {
        return state;
      }
      return {
        currentRoom: {
          ...state.currentRoom,
          players: state.currentRoom.players.filter((p) => p.id !== playerId),
        },
      };
    }),

  updatePlayer: (playerId, updates) =>
    set((state) => {
      if (!state.currentRoom) {
        return state;
      }
      return {
        currentRoom: {
          ...state.currentRoom,
          players: state.currentRoom.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p
          ),
        },
      };
    }),

  // Filter and sort actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setSortBy: (sortBy) => set({ sortBy }),

  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
    })),

  // Reset store
  reset: () =>
    set({
      rooms: [],
      isLoadingRooms: false,
      roomsError: null,
      currentRoom: null,
      isInRoom: false,
      isHost: false,
      currentPlayerId: null,
      filters: DEFAULT_FILTERS,
      sortBy: 'created',
      sortDirection: 'desc',
    }),
}));

/**
 * Selector: Get filtered and sorted rooms
 */
export function useFilteredRooms() {
  const rooms = useLobbyStore((state) => state.rooms);
  const filters = useLobbyStore((state) => state.filters);
  const sortBy = useLobbyStore((state) => state.sortBy);
  const sortDirection = useLobbyStore((state) => state.sortDirection);

  // Apply filters
  const filtered = rooms.filter((room) => {
    // Search filter
    if (
      filters.search &&
      !room.roomCode.toLowerCase().includes(filters.search.toLowerCase()) &&
      !room.hostUsername.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    // Player range filter
    if (
      room.playerCount < filters.playerRange.min ||
      room.playerCount > filters.playerRange.max
    ) {
      return false;
    }

    // Hide full rooms
    if (filters.hideFullRooms && room.playerCount >= room.maxPlayers) {
      return false;
    }

    // Hide in-progress games
    if (filters.hideInProgress && room.phase !== 'waiting') {
      return false;
    }

    // Hide private rooms
    if (filters.hidePrivate && room.isPrivate) {
      return false;
    }

    return true;
  });

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'players':
        comparison = a.playerCount - b.playerCount;
        break;
      case 'map':
        comparison = a.mapName.localeCompare(b.mapName);
        break;
      case 'created':
      default:
        // Default to ID order (most recent first)
        comparison = b.id.localeCompare(a.id);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

/**
 * Selector: Get current player in room
 */
export function useCurrentPlayer() {
  const currentRoom = useLobbyStore((state) => state.currentRoom);
  const currentPlayerId = useLobbyStore((state) => state.currentPlayerId);

  if (!currentRoom || !currentPlayerId) {
    return null;
  }

  return currentRoom.players.find((p) => p.id === currentPlayerId) || null;
}

/**
 * Selector: Check if all players are ready
 */
export function useAllPlayersReady() {
  const currentRoom = useLobbyStore((state) => state.currentRoom);

  if (!currentRoom || currentRoom.players.length < 2) {
    return false;
  }

  return currentRoom.players.every((p) => p.isReady);
}
