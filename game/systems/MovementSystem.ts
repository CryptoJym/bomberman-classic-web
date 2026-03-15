/**
 * Movement System for Bomberman Game
 * Handles grid-based movement with tile alignment and smooth interpolation
 */

import type { Player, Position, Direction, GameMap } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface MovementConfig {
  /** Tile alignment threshold (0-1) */
  alignmentThreshold: number;
  /** Movement smoothing factor */
  smoothing: number;
  /** Enable diagonal correction */
  diagonalCorrection: boolean;
}

export interface MovementResult {
  /** New position after movement */
  newPosition: Position;
  /** Whether movement was successful */
  moved: boolean;
  /** Direction of movement */
  direction: Direction;
  /** Whether player crossed a tile boundary */
  crossedTileBoundary: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MovementConfig = {
  alignmentThreshold: 0.3,
  smoothing: 0.15,
  diagonalCorrection: true,
};

// ============================================================================
// MOVEMENT SYSTEM CLASS
// ============================================================================

/**
 * Movement system for grid-based player movement
 */
export class MovementSystem {
  private config: MovementConfig;

  constructor(config: Partial<MovementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MOVEMENT LOGIC
  // ==========================================================================

  /**
   * Calculate new position for player movement
   */
  movePlayer(
    player: Player,
    direction: Direction,
    deltaMs: number,
    _map: GameMap
  ): MovementResult {
    const currentPos = player.position;
    const speed = this.calculateSpeed(player, deltaMs);

    // Calculate target position
    const targetPos = this.calculateTargetPosition(currentPos, direction, speed);

    // Apply tile alignment
    const alignedPos = this.applyTileAlignment(currentPos, targetPos, direction);

    // Check if crossed tile boundary
    const crossedBoundary = this.checkTileBoundaryCrossing(currentPos, alignedPos);

    return {
      newPosition: alignedPos,
      moved: this.positionChanged(currentPos, alignedPos),
      direction,
      crossedTileBoundary: crossedBoundary,
    };
  }

  /**
   * Smooth interpolation between positions
   */
  interpolatePosition(
    current: Position,
    target: Position,
    alpha: number
  ): Position {
    return {
      x: current.x + (target.x - current.x) * alpha,
      y: current.y + (target.y - current.y) * alpha,
    };
  }

  /**
   * Snap position to tile grid
   */
  snapToGrid(position: Position): Position {
    return {
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
  }

  /**
   * Calculate distance to nearest tile center
   */
  distanceToTileCenter(position: Position): number {
    const tileX = Math.round(position.x);
    const tileY = Math.round(position.y);

    const dx = position.x - tileX;
    const dy = position.y - tileY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if position is aligned with tile grid
   */
  isAlignedWithGrid(position: Position, threshold: number = 0.1): boolean {
    const distance = this.distanceToTileCenter(position);
    return distance <= threshold;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate movement speed based on player stats
   */
  private calculateSpeed(player: Player, deltaMs: number): number {
    const baseSpeed = GAME_CONSTANTS.BASE_PLAYER_SPEED; // tiles per second
    const speedMultiplier = player.speed;

    // Apply skull effect if present
    let finalSpeed = baseSpeed * speedMultiplier;
    if (player.skullEffect === 'slow') {
      finalSpeed *= 0.5;
    }

    // Convert to tiles per frame
    return (finalSpeed * deltaMs) / 1000;
  }

  /**
   * Calculate target position based on direction and speed
   */
  private calculateTargetPosition(
    current: Position,
    direction: Direction,
    speed: number
  ): Position {
    const newPos = { ...current };

    switch (direction) {
      case 'up':
        newPos.y -= speed;
        break;
      case 'down':
        newPos.y += speed;
        break;
      case 'left':
        newPos.x -= speed;
        break;
      case 'right':
        newPos.x += speed;
        break;
    }

    return newPos;
  }

  /**
   * Apply tile alignment to movement
   * Helps players navigate tight corridors by auto-aligning
   */
  private applyTileAlignment(
    current: Position,
    target: Position,
    direction: Direction
  ): Position {
    if (!this.config.diagonalCorrection) {
      return target;
    }

    const aligned = { ...target };
    const threshold = this.config.alignmentThreshold;

    // For horizontal movement, align Y axis
    if (direction === 'left' || direction === 'right') {
      const tileY = Math.round(current.y);
      const distY = Math.abs(current.y - tileY);

      if (distY < threshold) {
        // Gradually align to tile center
        aligned.y = current.y + (tileY - current.y) * this.config.smoothing;
      }
    }

    // For vertical movement, align X axis
    if (direction === 'up' || direction === 'down') {
      const tileX = Math.round(current.x);
      const distX = Math.abs(current.x - tileX);

      if (distX < threshold) {
        // Gradually align to tile center
        aligned.x = current.x + (tileX - current.x) * this.config.smoothing;
      }
    }

    return aligned;
  }

  /**
   * Check if movement crossed a tile boundary
   */
  private checkTileBoundaryCrossing(from: Position, to: Position): boolean {
    const fromTileX = Math.floor(from.x);
    const fromTileY = Math.floor(from.y);
    const toTileX = Math.floor(to.x);
    const toTileY = Math.floor(to.y);

    return fromTileX !== toTileX || fromTileY !== toTileY;
  }

  /**
   * Check if position changed
   */
  private positionChanged(from: Position, to: Position): boolean {
    const epsilon = 0.001;
    return Math.abs(from.x - to.x) > epsilon || Math.abs(from.y - to.y) > epsilon;
  }

  /**
   * Get tile coordinates from position
   */
  getTileCoordinates(position: Position): Position {
    return {
      x: Math.floor(position.x),
      y: Math.floor(position.y),
    };
  }

  /**
   * Get fractional tile offset
   */
  getTileOffset(position: Position): Position {
    return {
      x: position.x - Math.floor(position.x),
      y: position.y - Math.floor(position.y),
    };
  }

  /**
   * Calculate direction from one position to another
   */
  getDirectionBetween(from: Position, to: Position): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Prioritize the axis with larger difference
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0) {
      return dy > 0 ? 'down' : 'up';
    }

    return null;
  }

  /**
   * Calculate Manhattan distance between positions
   */
  manhattanDistance(from: Position, to: Position): number {
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  }

  /**
   * Calculate Euclidean distance between positions
   */
  euclideanDistance(from: Position, to: Position): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two positions are adjacent (cardinal directions only)
   */
  areAdjacent(pos1: Position, pos2: Position): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  /**
   * Get opposite direction
   */
  getOppositeDirection(direction: Direction): Direction {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    return opposites[direction];
  }

  /**
   * Get perpendicular directions
   */
  getPerpendicularDirections(direction: Direction): [Direction, Direction] {
    if (direction === 'up' || direction === 'down') {
      return ['left', 'right'];
    } else {
      return ['up', 'down'];
    }
  }
}
