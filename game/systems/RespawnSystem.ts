/**
 * Respawn System for Bomberman Game
 * Handles player death and respawn logic
 */

import type { Player, Position, GameMap } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface RespawnConfig {
  enabled: boolean;
  delay: number; // ms
  invincibilityDuration: number; // ms
  resetPowerups: boolean;
}

export interface DeathResult {
  playerId: string;
  killerId: string | null;
  position: Position;
  timestamp: number;
}

// ============================================================================
// RESPAWN SYSTEM CLASS
// ============================================================================

/**
 * System for death and respawn management
 */
export class RespawnSystem {
  private config: RespawnConfig;
  private pendingRespawns: Map<string, number> = new Map();

  constructor(config: Partial<RespawnConfig> = {}) {
    this.config = {
      enabled: false,
      delay: 3000,
      invincibilityDuration: GAME_CONSTANTS.RESPAWN_INVINCIBILITY,
      resetPowerups: true,
      ...config,
    };
  }

  /**
   * Register player death
   */
  registerDeath(playerId: string, killerId: string | null, position: Position): DeathResult {
    if (this.config.enabled) {
      // Schedule respawn
      const respawnTime = Date.now() + this.config.delay;
      this.pendingRespawns.set(playerId, respawnTime);
    }

    return {
      playerId,
      killerId,
      position,
      timestamp: Date.now(),
    };
  }

  /**
   * Check for pending respawns
   */
  checkRespawns(): string[] {
    const now = Date.now();
    const toRespawn: string[] = [];

    for (const [playerId, respawnTime] of this.pendingRespawns.entries()) {
      if (now >= respawnTime) {
        toRespawn.push(playerId);
        this.pendingRespawns.delete(playerId);
      }
    }

    return toRespawn;
  }

  /**
   * Respawn player
   */
  respawnPlayer(player: Player, spawnPosition: Position): Player {
    return {
      ...player,
      isAlive: true,
      position: spawnPosition,
      animationState: 'idle',
      animationFrame: 0,
      activeBombs: 0,
    };
  }

  /**
   * Get time until respawn
   */
  getTimeUntilRespawn(playerId: string): number {
    const respawnTime = this.pendingRespawns.get(playerId);
    if (!respawnTime) return 0;

    return Math.max(0, respawnTime - Date.now());
  }

  /**
   * Cancel respawn
   */
  cancelRespawn(playerId: string): void {
    this.pendingRespawns.delete(playerId);
  }

  /**
   * Find safe spawn position
   */
  findSafeSpawnPosition(map: GameMap, occupiedPositions: Position[]): Position | null {
    // Try spawn points first
    for (const spawn of map.spawnPoints) {
      if (!this.isPositionOccupied(spawn.position, occupiedPositions)) {
        return spawn.position;
      }
    }

    // Find any empty tile
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const row = map.tiles[y];
        const tile = row ? row[x] : undefined;
        if (tile?.type === 'empty' || tile?.type === 'spawn') {
          const pos = { x, y };
          if (!this.isPositionOccupied(pos, occupiedPositions)) {
            return pos;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if position is occupied
   */
  private isPositionOccupied(position: Position, occupiedPositions: Position[]): boolean {
    return occupiedPositions.some(
      (pos) => pos.x === position.x && pos.y === position.y
    );
  }

  /**
   * Clear all pending respawns
   */
  clearAll(): void {
    this.pendingRespawns.clear();
  }
}
