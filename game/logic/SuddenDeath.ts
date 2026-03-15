/**
 * Sudden Death System for Bomberman
 * Handles map shrinking and wall generation
 */

import type { Position, GameMap } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface SuddenDeathConfig {
  /** Interval between shrinks in ms */
  shrinkInterval: number;
  /** Maximum shrink level */
  maxLevel: number;
  /** Warning time before shrink in ms */
  warningTime: number;
}

export interface ShrinkResult {
  destroyedPositions: Position[];
  newLevel: number;
  nextShrinkIn: number;
}

// ============================================================================
// SUDDEN DEATH CLASS
// ============================================================================

/**
 * Manages sudden death map shrinking
 */
export class SuddenDeath {
  private config: SuddenDeathConfig;
  private currentLevel = 0;
  private lastShrinkTime = 0;
  private isActive = false;

  constructor(config: Partial<SuddenDeathConfig> = {}) {
    this.config = {
      shrinkInterval: GAME_CONSTANTS.SUDDEN_DEATH_INTERVAL,
      maxLevel: 5,
      warningTime: 2000,
      ...config,
    };
  }

  // ==========================================================================
  // ACTIVATION
  // ==========================================================================

  /**
   * Start sudden death
   */
  start(): void {
    this.isActive = true;
    this.currentLevel = 0;
    this.lastShrinkTime = Date.now();
  }

  /**
   * Stop sudden death
   */
  stop(): void {
    this.isActive = false;
    this.currentLevel = 0;
  }

  /**
   * Reset sudden death
   */
  reset(): void {
    this.stop();
  }

  // ==========================================================================
  // SHRINKING
  // ==========================================================================

  /**
   * Check if it's time to shrink
   */
  shouldShrink(): boolean {
    if (!this.isActive) return false;
    if (this.currentLevel >= this.config.maxLevel) return false;

    const elapsed = Date.now() - this.lastShrinkTime;
    return elapsed >= this.config.shrinkInterval;
  }

  /**
   * Perform shrink
   */
  shrink(map: GameMap): ShrinkResult {
    this.currentLevel++;
    this.lastShrinkTime = Date.now();

    const destroyedPositions = this.getPositionsToDestroy(map, this.currentLevel);

    return {
      destroyedPositions,
      newLevel: this.currentLevel,
      nextShrinkIn: this.config.shrinkInterval,
    };
  }

  /**
   * Get positions that should be destroyed at given level
   */
  private getPositionsToDestroy(map: GameMap, level: number): Position[] {
    const positions: Position[] = [];

    // Calculate ring to destroy
    const minX = level;
    const maxX = map.width - 1 - level;
    const minY = level;
    const maxY = map.height - 1 - level;

    // Top and bottom edges
    for (let x = minX; x <= maxX; x++) {
      if (minY >= 0 && minY < map.height) {
        positions.push({ x, y: minY });
      }
      if (maxY >= 0 && maxY < map.height) {
        positions.push({ x, y: maxY });
      }
    }

    // Left and right edges (excluding corners already added)
    for (let y = minY + 1; y < maxY; y++) {
      if (minX >= 0 && minX < map.width) {
        positions.push({ x: minX, y });
      }
      if (maxX >= 0 && maxX < map.width) {
        positions.push({ x: maxX, y });
      }
    }

    return positions;
  }

  /**
   * Check if position is in safe zone
   */
  isInSafeZone(position: Position, map: GameMap): boolean {
    const minSafe = this.currentLevel;
    const maxSafeX = map.width - 1 - this.currentLevel;
    const maxSafeY = map.height - 1 - this.currentLevel;

    return (
      position.x > minSafe &&
      position.x < maxSafeX &&
      position.y > minSafe &&
      position.y < maxSafeY
    );
  }

  /**
   * Get time until next shrink
   */
  getTimeUntilNextShrink(): number {
    if (!this.isActive) return Infinity;
    if (this.currentLevel >= this.config.maxLevel) return Infinity;

    const elapsed = Date.now() - this.lastShrinkTime;
    return Math.max(0, this.config.shrinkInterval - elapsed);
  }

  /**
   * Get shrink warning status
   */
  isWarningActive(): boolean {
    const timeUntilShrink = this.getTimeUntilNextShrink();
    return timeUntilShrink <= this.config.warningTime && timeUntilShrink > 0;
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  /**
   * Get current shrink level
   */
  getLevel(): number {
    return this.currentLevel;
  }

  /**
   * Check if sudden death is active
   */
  isActivated(): boolean {
    return this.isActive;
  }

  /**
   * Get safe zone bounds
   */
  getSafeZoneBounds(map: GameMap): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    return {
      minX: this.currentLevel,
      maxX: map.width - 1 - this.currentLevel,
      minY: this.currentLevel,
      maxY: map.height - 1 - this.currentLevel,
    };
  }
}
