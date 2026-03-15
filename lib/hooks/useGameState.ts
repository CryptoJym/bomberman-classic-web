'use client';

import { create } from 'zustand';
import type { GamePhase, Player, Bomb, Powerup } from '@/types/game';

interface GameStore {
  // State
  connected: boolean;
  phase: GamePhase;
  tick: number;
  players: Map<string, Player>;
  bombs: Map<string, Bomb>;
  powerups: Map<string, Powerup>;
  localPlayerId: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  updateFromServer: (data: {
    tick?: number;
    phase?: GamePhase;
    players?: Record<string, Player>;
    bombs?: Record<string, Bomb>;
    powerups?: Record<string, Powerup>;
  }) => void;
  setLocalPlayer: (id: string) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  phase: 'waiting' as GamePhase,
  tick: 0,
  players: new Map<string, Player>(),
  bombs: new Map<string, Bomb>(),
  powerups: new Map<string, Powerup>(),
  localPlayerId: null,
};

/**
 * Global game state store using Zustand
 */
export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),

  setPhase: (phase) => set({ phase }),

  updateFromServer: (data) =>
    set((current) => {
      const updates: Partial<GameStore> = {};

      if (data.tick !== undefined) {
        updates.tick = data.tick;
      }
      if (data.phase !== undefined) {
        updates.phase = data.phase;
      }
      if (data.players) {
        updates.players = new Map(Object.entries(data.players));
      }
      if (data.bombs) {
        updates.bombs = new Map(Object.entries(data.bombs));
      }
      if (data.powerups) {
        updates.powerups = new Map(Object.entries(data.powerups));
      }

      return { ...current, ...updates };
    }),

  setLocalPlayer: (id) => set({ localPlayerId: id }),

  reset: () => set(initialState),
}));

/**
 * Hook for accessing local player data
 */
export function useLocalPlayer(): Player | null {
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const players = useGameStore((state) => state.players);

  if (!localPlayerId) {
    return null;
  }

  return players.get(localPlayerId) ?? null;
}

/**
 * Hook for accessing game connection status
 */
export function useGameConnection() {
  const connected = useGameStore((state) => state.connected);
  const phase = useGameStore((state) => state.phase);

  return { connected, phase };
}
