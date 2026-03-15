/**
 * Base Entity Class for Bomberman Online
 * Abstract base class that all game entities extend
 */

import type { Sprite, Container, Texture } from 'pixi.js';
import type { Position, PixelPosition } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface EntityConfig {
  id: string;
  position: Position;
  zIndex?: number;
}

export interface EntityState {
  id: string;
  position: Position;
  isActive: boolean;
}

// ============================================================================
// Base Entity Class
// ============================================================================

/**
 * Abstract base class for all game entities
 * Provides common functionality for position, rendering, and lifecycle
 */
export abstract class Entity {
  /** Unique entity identifier */
  readonly id: string;

  /** Position in tile coordinates */
  protected _position: Position;

  /** Previous position for interpolation */
  protected _previousPosition: Position;

  /** Target position for interpolation */
  protected _targetPosition: Position;

  /** Whether entity is active and should be updated */
  protected _isActive: boolean = true;

  /** Whether entity has been destroyed */
  protected _isDestroyed: boolean = false;

  /** PixiJS sprite for rendering */
  protected sprite: Sprite | null = null;

  /** Container for composite entities */
  protected container: Container | null = null;

  /** Z-index for rendering order */
  protected zIndex: number = 0;

  /** Interpolation progress (0-1) */
  protected interpolationProgress: number = 0;

  constructor(config: EntityConfig) {
    this.id = config.id;
    this._position = { ...config.position };
    this._previousPosition = { ...config.position };
    this._targetPosition = { ...config.position };
    this.zIndex = config.zIndex ?? 0;
  }

  // ==========================================================================
  // Position Management
  // ==========================================================================

  /**
   * Get current position (tile coordinates)
   */
  get position(): Position {
    return { ...this._position };
  }

  /**
   * Set position (tile coordinates)
   */
  set position(pos: Position) {
    this._previousPosition = { ...this._position };
    this._position = { ...pos };
    this._targetPosition = { ...pos };
    this.interpolationProgress = 0;
  }

  /**
   * Get pixel position for rendering
   */
  getPixelPosition(): PixelPosition {
    return {
      x: this._position.x * GAME_CONSTANTS.TILE_SIZE,
      y: this._position.y * GAME_CONSTANTS.TILE_SIZE,
    };
  }

  /**
   * Get interpolated pixel position for smooth rendering
   */
  getInterpolatedPixelPosition(alpha: number = 1): PixelPosition {
    const x = this._previousPosition.x + (this._targetPosition.x - this._previousPosition.x) * alpha;
    const y = this._previousPosition.y + (this._targetPosition.y - this._previousPosition.y) * alpha;

    return {
      x: x * GAME_CONSTANTS.TILE_SIZE,
      y: y * GAME_CONSTANTS.TILE_SIZE,
    };
  }

  /**
   * Set target position for interpolation
   */
  setTargetPosition(pos: Position): void {
    this._previousPosition = { ...this._position };
    this._targetPosition = { ...pos };
    this.interpolationProgress = 0;
  }

  /**
   * Get tile coordinates (integer position)
   */
  getTilePosition(): Position {
    return {
      x: Math.floor(this._position.x),
      y: Math.floor(this._position.y),
    };
  }

  /**
   * Check if entity is at a specific tile
   */
  isAtTile(x: number, y: number): boolean {
    const tile = this.getTilePosition();
    return tile.x === x && tile.y === y;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get whether entity is active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Set active state
   */
  set isActive(value: boolean) {
    this._isActive = value;
    if (this.sprite) {
      this.sprite.visible = value;
    }
    if (this.container) {
      this.container.visible = value;
    }
  }

  /**
   * Get whether entity has been destroyed
   */
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Get basic entity state
   */
  getState(): EntityState {
    return {
      id: this.id,
      position: this.position,
      isActive: this._isActive,
    };
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  /**
   * Get the sprite for rendering
   */
  getSprite(): Sprite | null {
    return this.sprite;
  }

  /**
   * Get the container for rendering
   */
  getContainer(): Container | null {
    return this.container;
  }

  /**
   * Get the renderable display object
   */
  getDisplayObject(): Sprite | Container | null {
    return this.container ?? this.sprite;
  }

  /**
   * Set sprite texture
   */
  setTexture(texture: Texture): void {
    if (this.sprite) {
      this.sprite.texture = texture;
    }
  }

  /**
   * Update sprite position from entity position
   */
  updateSpritePosition(alpha: number = 1): void {
    const displayObject = this.getDisplayObject();
    if (!displayObject) return;

    const pixelPos = this.getInterpolatedPixelPosition(alpha);
    displayObject.x = Math.round(pixelPos.x);
    displayObject.y = Math.round(pixelPos.y);
  }

  /**
   * Set sprite visibility
   */
  setVisible(visible: boolean): void {
    const displayObject = this.getDisplayObject();
    if (displayObject) {
      displayObject.visible = visible;
    }
  }

  /**
   * Set sprite alpha
   */
  setAlpha(alpha: number): void {
    const displayObject = this.getDisplayObject();
    if (displayObject) {
      displayObject.alpha = alpha;
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Initialize the entity (create sprites, etc.)
   * Override in subclasses
   */
  abstract initialize(PIXI: typeof import('pixi.js')): void;

  /**
   * Update entity state
   * Override in subclasses for custom behavior
   */
  abstract update(deltaTime: number): void;

  /**
   * Apply server state to entity
   * Override in subclasses
   */
  abstract applyServerState(state: unknown): void;

  /**
   * Destroy the entity and cleanup resources
   */
  destroy(): void {
    this._isDestroyed = true;
    this._isActive = false;

    if (this.sprite) {
      if (this.sprite.parent) {
        this.sprite.parent.removeChild(this.sprite);
      }
      this.sprite.destroy();
      this.sprite = null;
    }

    if (this.container) {
      if (this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      this.container.destroy({ children: true });
      this.container = null;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Calculate distance to another entity
   */
  distanceTo(other: Entity): number {
    const dx = this._position.x - other._position.x;
    const dy = this._position.y - other._position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate manhattan distance to a position
   */
  manhattanDistanceTo(pos: Position): number {
    return Math.abs(this._position.x - pos.x) + Math.abs(this._position.y - pos.y);
  }

  /**
   * Check collision with another entity (bounding box)
   */
  collidesWith(other: Entity, padding: number = 0): boolean {
    const thisTile = this.getTilePosition();
    const otherTile = other.getTilePosition();

    return (
      Math.abs(thisTile.x - otherTile.x) <= padding &&
      Math.abs(thisTile.y - otherTile.y) <= padding
    );
  }
}
