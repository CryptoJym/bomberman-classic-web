/**
 * Explosion Entity for Bomberman Game
 * Manages explosion rendering with animated segments
 */

import { Container, Sprite, Graphics } from 'pixi.js';
import type {
  Explosion as ExplosionData,
  ExplosionSegment,
  ExplosionSegmentType,
  Position,
} from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANIMATION_FRAMES = 5;
const FRAME_DURATION = 100; // ms per frame

// ============================================================================
// EXPLOSION SEGMENT CLASS
// ============================================================================

/**
 * Individual explosion segment sprite
 */
class ExplosionSegmentSprite {
  public container: Container;
  private sprite: Sprite;
  private glowGraphics: Graphics;

  private position: Position;
  private segmentType: ExplosionSegmentType;
  private currentFrame = 0;

  constructor(segment: ExplosionSegment) {
    this.position = segment.position;
    this.segmentType = segment.type;

    // Create container
    this.container = new Container();

    // Create glow effect
    this.glowGraphics = new Graphics();
    this.container.addChild(this.glowGraphics);

    // Create segment sprite
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.container.addChild(this.sprite);

    // Position
    this.updatePosition();

    // Set rotation based on segment type
    this.updateRotation();
  }

  /**
   * Update position
   */
  private updatePosition(): void {
    const pixelX = this.position.x * GAME_CONSTANTS.TILE_SIZE;
    const pixelY = this.position.y * GAME_CONSTANTS.TILE_SIZE;

    this.container.x = pixelX;
    this.container.y = pixelY;
  }

  /**
   * Update rotation based on segment type
   */
  private updateRotation(): void {
    switch (this.segmentType) {
      case 'horizontal':
        this.sprite.rotation = 0;
        break;
      case 'vertical':
        this.sprite.rotation = Math.PI / 2;
        break;
      case 'end_up':
        this.sprite.rotation = -Math.PI / 2;
        break;
      case 'end_down':
        this.sprite.rotation = Math.PI / 2;
        break;
      case 'end_left':
        this.sprite.rotation = Math.PI;
        break;
      case 'end_right':
        this.sprite.rotation = 0;
        break;
      case 'center':
        this.sprite.rotation = 0;
        break;
    }
  }

  /**
   * Update animation frame
   */
  updateFrame(frame: number): void {
    this.currentFrame = frame;

    // Update sprite texture
    this.updateSpriteTexture();

    // Update glow
    this.updateGlow();
  }

  /**
   * Update sprite texture
   */
  private updateSpriteTexture(): void {
    // TODO: Load actual explosion textures from AssetLoader
    // For now, draw placeholder graphics
    // const size = GAME_CONSTANTS.TILE_SIZE;
    // const progress = this.currentFrame / ANIMATION_FRAMES;

    // Placeholder - should use actual sprite sheet
    // const textureName = `explosion_${this.segmentType}_${this.currentFrame}`;
    // this.sprite.texture = TextureCache[textureName];
  }

  /**
   * Update glow effect
   */
  private updateGlow(): void {
    const size = GAME_CONSTANTS.TILE_SIZE;
    const progress = this.currentFrame / ANIMATION_FRAMES;
    const intensity = 1 - progress;

    this.glowGraphics.clear();

    // Outer glow
    this.glowGraphics.beginFill(0xff8800, intensity * 0.4);
    this.glowGraphics.drawCircle(0, 0, size * 0.8);
    this.glowGraphics.endFill();

    // Inner glow
    this.glowGraphics.beginFill(0xffff00, intensity * 0.6);
    this.glowGraphics.drawCircle(0, 0, size * 0.5);
    this.glowGraphics.endFill();

    // Core
    this.glowGraphics.beginFill(0xffffff, intensity * 0.8);
    this.glowGraphics.drawCircle(0, 0, size * 0.3);
    this.glowGraphics.endFill();
  }

  /**
   * Destroy segment
   */
  destroy(): void {
    this.sprite.destroy();
    this.glowGraphics.destroy();
    this.container.destroy({ children: true });
  }
}

// ============================================================================
// EXPLOSION ENTITY CLASS
// ============================================================================

/**
 * Explosion entity with animated segments
 */
export class ExplosionEntity {
  // Container and segments
  public container: Container;
  private segments: ExplosionSegmentSprite[] = [];

  // Explosion data
  private data: ExplosionData;

  // Animation state
  private currentFrame = 0;
  private frameTimer = 0;
  private isComplete = false;

  constructor(explosionData: ExplosionData) {
    this.data = { ...explosionData };

    // Create container
    this.container = new Container();

    // Create all segments
    this.createSegments();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Create explosion segment sprites
   */
  private createSegments(): void {
    for (const segment of this.data.segments) {
      const segmentSprite = new ExplosionSegmentSprite(segment);
      this.segments.push(segmentSprite);
      this.container.addChild(segmentSprite.container);
    }
  }

  // ==========================================================================
  // UPDATE METHODS
  // ==========================================================================

  /**
   * Update explosion animation
   */
  update(deltaMs: number): void {
    if (this.isComplete) return;

    this.frameTimer += deltaMs;

    if (this.frameTimer >= FRAME_DURATION) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= ANIMATION_FRAMES) {
        this.isComplete = true;
        return;
      }

      // Update all segment frames
      for (const segment of this.segments) {
        segment.updateFrame(this.currentFrame);
      }
    }
  }

  /**
   * Check if explosion animation is complete
   */
  isAnimationComplete(): boolean {
    return this.isComplete;
  }

  /**
   * Check if position is in explosion
   */
  containsPosition(position: Position): boolean {
    for (const segment of this.data.segments) {
      if (segment.position.x === position.x && segment.position.y === position.y) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get id(): string {
    return this.data.id;
  }

  get ownerId(): string {
    return this.data.ownerId;
  }

  get position(): Position {
    return this.data.position;
  }

  get explosionData(): ExplosionData {
    return { ...this.data };
  }

  get complete(): boolean {
    return this.isComplete;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy explosion entity and cleanup
   */
  destroy(): void {
    // Destroy all segments
    for (const segment of this.segments) {
      segment.destroy();
    }
    this.segments = [];

    // Destroy container
    this.container.destroy({ children: true });
  }
}
