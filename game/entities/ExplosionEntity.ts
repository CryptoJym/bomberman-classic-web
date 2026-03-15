/**
 * Explosion Entity for Bomberman Online
 * Handles explosion rendering, animation, and segment management
 */

import type { Sprite, Texture, Graphics } from 'pixi.js';
import { Entity, type EntityConfig } from './Entity';
import type {
  Explosion,
  ExplosionSegment,
  ExplosionSegmentType,
  Position,
} from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface ExplosionEntityConfig extends EntityConfig {
  explosion: Explosion;
  textures?: Record<ExplosionSegmentType, Texture[]>;
}

interface SegmentSprite {
  sprite: Sprite;
  segment: ExplosionSegment;
  delay: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXPLOSION_FRAME_RATE = 15;
const EXPLOSION_FRAMES = 4;
const SEGMENT_DELAY = 30; // ms delay between segments expanding out
const FLASH_DURATION = 50;

const SEGMENT_COLORS: Record<ExplosionSegmentType, number> = {
  center: 0xff6600,
  horizontal: 0xff4400,
  vertical: 0xff4400,
  end_up: 0xff2200,
  end_down: 0xff2200,
  end_left: 0xff2200,
  end_right: 0xff2200,
};

// ============================================================================
// Explosion Entity Class
// ============================================================================

/**
 * Explosion entity with animated segments and cascading effect
 */
export class ExplosionEntity extends Entity {
  // Explosion state
  private _ownerId: string;
  private _segments: ExplosionSegment[] = [];
  private _startedAt: number;
  private _duration: number;
  private _animationFrame: number = 0;

  // Textures
  private textures: Record<ExplosionSegmentType, Texture[]> = {
    center: [],
    horizontal: [],
    vertical: [],
    end_up: [],
    end_down: [],
    end_left: [],
    end_right: [],
  };

  // Segment sprites
  private segmentSprites: SegmentSprite[] = [];

  // Animation
  private animationTimer: number = 0;
  private flashTimer: number = 0;
  private isFlashing: boolean = true;

  // Flash overlay
  private flashOverlay: Graphics | null = null;

  // PixiJS module reference (stored for potential future use)
  // private PIXI: typeof import('pixi.js') | null = null;

  constructor(config: ExplosionEntityConfig) {
    super(config);

    const { explosion, textures } = config;

    this._ownerId = explosion.ownerId;
    this._segments = explosion.segments;
    this._startedAt = explosion.startedAt;
    this._duration = explosion.duration;
    this._animationFrame = explosion.animationFrame;

    if (textures) {
      this.textures = textures;
    }
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  get ownerId(): string {
    return this._ownerId;
  }

  get segments(): ExplosionSegment[] {
    return this._segments;
  }

  get startedAt(): number {
    return this._startedAt;
  }

  get duration(): number {
    return this._duration;
  }

  get animationFrame(): number {
    return this._animationFrame;
  }

  /**
   * Get elapsed time since explosion started
   */
  get elapsed(): number {
    return Date.now() - this._startedAt;
  }

  /**
   * Get remaining time
   */
  get timeRemaining(): number {
    return Math.max(0, this._duration - this.elapsed);
  }

  /**
   * Check if explosion is complete
   */
  get isComplete(): boolean {
    return this.elapsed >= this._duration;
  }

  /**
   * Get animation progress (0-1)
   */
  get progress(): number {
    return Math.min(1, this.elapsed / this._duration);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize entity sprites and graphics
   */
  initialize(PIXI: typeof import('pixi.js')): void {
    // this.PIXI = PIXI; // Stored for potential future use

    // Create container for all segments
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Create segment sprites
    this.createSegmentSprites(PIXI);

    // Create flash overlay
    this.createFlashOverlay(PIXI);

    // Set initial position (center)
    this.updateSpritePosition();
  }

  /**
   * Create sprites for each segment
   */
  private createSegmentSprites(PIXI: typeof import('pixi.js')): void {
    if (!this.container) return;

    // Sort segments by distance from center for cascade effect
    const center = this._position;
    const sortedSegments = [...this._segments].sort((a, b) => {
      const distA = Math.abs(a.position.x - center.x) + Math.abs(a.position.y - center.y);
      const distB = Math.abs(b.position.x - center.x) + Math.abs(b.position.y - center.y);
      return distA - distB;
    });

    for (let i = 0; i < sortedSegments.length; i++) {
      const segment = sortedSegments[i];
      if (!segment) continue;
      const delay = i * SEGMENT_DELAY;

      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);

      // Position relative to center
      const relX = (segment.position.x - center.x) * GAME_CONSTANTS.TILE_SIZE;
      const relY = (segment.position.y - center.y) * GAME_CONSTANTS.TILE_SIZE;
      sprite.x = relX + GAME_CONSTANTS.TILE_SIZE / 2;
      sprite.y = relY + GAME_CONSTANTS.TILE_SIZE / 2;

      // Set rotation based on segment type
      sprite.rotation = this.getSegmentRotation(segment.type);

      // Initial scale (for cascade animation)
      sprite.scale.set(0);
      sprite.alpha = 0;

      // Apply tint
      sprite.tint = SEGMENT_COLORS[segment.type] ?? 0xff6600;

      // Set z-index (center on top)
      sprite.zIndex = segment.type === 'center' ? 10 : 5;

      this.container.addChild(sprite);
      this.segmentSprites.push({ sprite, segment, delay });
    }
  }

  /**
   * Create flash overlay for initial explosion
   */
  private createFlashOverlay(PIXI: typeof import('pixi.js')): void {
    if (!this.container) return;

    this.flashOverlay = new PIXI.Graphics();

    // Calculate bounds of explosion
    const bounds = this.calculateBounds();

    // Draw flash rectangle
    this.flashOverlay.rect(
      bounds.minX - GAME_CONSTANTS.TILE_SIZE / 2,
      bounds.minY - GAME_CONSTANTS.TILE_SIZE / 2,
      bounds.width + GAME_CONSTANTS.TILE_SIZE,
      bounds.height + GAME_CONSTANTS.TILE_SIZE
    );
    this.flashOverlay.fill({ color: 0xffffff, alpha: 0.8 });
    this.flashOverlay.zIndex = 20;

    this.container.addChild(this.flashOverlay);
  }

  /**
   * Get rotation for segment type
   */
  private getSegmentRotation(type: ExplosionSegmentType): number {
    switch (type) {
      case 'vertical':
      case 'end_up':
      case 'end_down':
        return Math.PI / 2; // 90 degrees
      case 'horizontal':
      case 'end_left':
      case 'end_right':
      default:
        return 0;
    }
  }

  /**
   * Calculate bounding box of all segments
   */
  private calculateBounds(): { minX: number; minY: number; width: number; height: number } {
    if (this._segments.length === 0) {
      return { minX: 0, minY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const center = this._position;

    for (const segment of this._segments) {
      const relX = (segment.position.x - center.x) * GAME_CONSTANTS.TILE_SIZE;
      const relY = (segment.position.y - center.y) * GAME_CONSTANTS.TILE_SIZE;

      minX = Math.min(minX, relX);
      minY = Math.min(minY, relY);
      maxX = Math.max(maxX, relX + GAME_CONSTANTS.TILE_SIZE);
      maxY = Math.max(maxY, relY + GAME_CONSTANTS.TILE_SIZE);
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Set textures for segment types
   */
  setTextures(textures: Record<ExplosionSegmentType, Texture[]>): void {
    this.textures = textures;
    this.updateSegmentTextures();
  }

  /**
   * Update all segment textures
   */
  private updateSegmentTextures(): void {
    for (const { sprite, segment } of this.segmentSprites) {
      const typeTextures = this.textures[segment.type];
      if (typeTextures && typeTextures.length > 0) {
        const textureIndex = Math.min(this._animationFrame, typeTextures.length - 1);
        const texture = typeTextures[textureIndex];
        if (texture) {
          sprite.texture = texture;
        }
      }
    }
  }

  // ==========================================================================
  // Update
  // ==========================================================================

  /**
   * Update entity state each frame
   */
  update(deltaTime: number): void {
    if (this._isDestroyed || !this._isActive) return;

    const elapsed = this.elapsed;

    // Update flash
    this.updateFlash(deltaTime);

    // Update segment cascade animation
    this.updateSegmentAnimation(deltaTime, elapsed);

    // Update animation frame
    this.updateAnimation(deltaTime);

    // Update fade out at end
    if (this.progress > 0.7) {
      this.updateFadeOut();
    }

    // Check if complete
    if (this.isComplete) {
      this.isActive = false;
    }
  }

  /**
   * Update flash overlay
   */
  private updateFlash(deltaTime: number): void {
    if (!this.isFlashing || !this.flashOverlay) return;

    this.flashTimer += deltaTime;

    if (this.flashTimer >= FLASH_DURATION) {
      this.isFlashing = false;
      this.flashOverlay.visible = false;
    } else {
      // Fade out flash
      const progress = this.flashTimer / FLASH_DURATION;
      this.flashOverlay.alpha = 1 - progress;
    }
  }

  /**
   * Update segment cascade animation
   */
  private updateSegmentAnimation(_deltaTime: number, elapsed: number): void {
    for (const { sprite, segment: _segment, delay } of this.segmentSprites) {
      const segmentElapsed = elapsed - delay;

      if (segmentElapsed < 0) {
        // Not yet visible
        sprite.scale.set(0);
        sprite.alpha = 0;
      } else if (segmentElapsed < 100) {
        // Expanding
        const expandProgress = segmentElapsed / 100;
        const scale = this.easeOutBack(expandProgress);
        sprite.scale.set(scale);
        sprite.alpha = 1;
      } else {
        // Fully expanded
        sprite.scale.set(1);
        sprite.alpha = 1;
      }
    }
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaTime: number): void {
    this.animationTimer += deltaTime;

    const frameDuration = 1000 / EXPLOSION_FRAME_RATE;

    if (this.animationTimer >= frameDuration) {
      this.animationTimer -= frameDuration;
      this._animationFrame = Math.min(this._animationFrame + 1, EXPLOSION_FRAMES - 1);

      // Update all segment textures
      this.updateSegmentTextures();
    }
  }

  /**
   * Update fade out effect
   */
  private updateFadeOut(): void {
    const fadeProgress = (this.progress - 0.7) / 0.3;

    for (const { sprite } of this.segmentSprites) {
      sprite.alpha = 1 - fadeProgress;
      sprite.scale.set(1 - fadeProgress * 0.3);
    }
  }

  /**
   * Easing function for smooth expansion
   */
  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // ==========================================================================
  // Collision Detection
  // ==========================================================================

  /**
   * Check if a position is within the explosion
   */
  containsPosition(pos: Position): boolean {
    for (const segment of this._segments) {
      if (segment.position.x === pos.x && segment.position.y === pos.y) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a tile position overlaps with explosion
   */
  overlapsWithTile(tileX: number, tileY: number): boolean {
    for (const segment of this._segments) {
      if (
        Math.floor(segment.position.x) === tileX &&
        Math.floor(segment.position.y) === tileY
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all positions covered by the explosion
   */
  getCoveredPositions(): Position[] {
    return this._segments.map((s) => ({ ...s.position }));
  }

  // ==========================================================================
  // Server State
  // ==========================================================================

  /**
   * Apply server state to entity
   */
  applyServerState(state: Partial<Explosion>): void {
    if (state.segments !== undefined) {
      this._segments = state.segments;
      // Would need to recreate segment sprites if segments change
    }

    if (state.animationFrame !== undefined) {
      this._animationFrame = state.animationFrame;
      this.updateSegmentTextures();
    }
  }

  /**
   * Get explosion state
   */
  getExplosionState(): Explosion {
    return {
      id: this.id,
      position: this.position,
      ownerId: this._ownerId,
      segments: this._segments,
      startedAt: this._startedAt,
      duration: this._duration,
      animationFrame: this._animationFrame,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy entity and cleanup
   */
  destroy(): void {
    // Destroy segment sprites
    for (const { sprite } of this.segmentSprites) {
      sprite.destroy();
    }
    this.segmentSprites = [];

    // Destroy flash overlay
    this.flashOverlay?.destroy();
    this.flashOverlay = null;

    // this.PIXI = null;
    this.textures = {
      center: [],
      horizontal: [],
      vertical: [],
      end_up: [],
      end_down: [],
      end_left: [],
      end_right: [],
    };

    super.destroy();
  }
}
