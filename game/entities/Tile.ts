/**
 * Tile Entity for Bomberman Game
 * Manages tile rendering and destruction animation
 */

import { Container, Sprite, Graphics } from 'pixi.js';
import type { Tile as TileData, Position, TileType } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

const DESTRUCTION_ANIMATION_FRAMES = 6;
const DESTRUCTION_FRAME_DURATION = 50; // ms per frame

// ============================================================================
// TILE ENTITY CLASS
// ============================================================================

/**
 * Tile entity with destruction animation
 */
export class TileEntity {
  // Container and sprites
  public container: Container;
  private sprite: Sprite;
  private destructionOverlay: Graphics | null = null;

  // Tile data
  private data: TileData;
  private position: Position;

  // Destruction animation
  private isDestroying = false;
  private destructionFrame = 0;
  private destructionTimer = 0;

  constructor(tileData: TileData, position: Position) {
    this.data = { ...tileData };
    this.position = position;

    // Create container
    this.container = new Container();

    // Create tile sprite
    this.sprite = new Sprite();
    this.sprite.anchor.set(0);
    this.container.addChild(this.sprite);

    // Position container
    this.updatePosition();

    // Update sprite texture based on tile type
    this.updateSpriteTexture();
  }

  // ==========================================================================
  // UPDATE METHODS
  // ==========================================================================

  /**
   * Update tile entity
   */
  update(deltaMs: number): void {
    if (this.isDestroying) {
      this.updateDestructionAnimation(deltaMs);
    }
  }

  /**
   * Update from server data
   */
  updateFromServer(tileData: Partial<TileData>): void {
    // Merge with existing data
    this.data = { ...this.data, ...tileData };

    // Start destruction animation if needed
    if (tileData.isDestroying && !this.isDestroying) {
      this.startDestructionAnimation();
    }

    // Update sprite texture
    this.updateSpriteTexture();
  }

  /**
   * Update destruction animation
   */
  private updateDestructionAnimation(deltaMs: number): void {
    this.destructionTimer += deltaMs;

    if (this.destructionTimer >= DESTRUCTION_FRAME_DURATION) {
      this.destructionTimer = 0;
      this.destructionFrame++;

      if (this.destructionFrame >= DESTRUCTION_ANIMATION_FRAMES) {
        // Animation complete - tile should be removed
        this.isDestroying = false;
        this.data.type = 'empty';
        this.updateSpriteTexture();
      } else {
        // Draw destruction frame
        this.drawDestructionFrame(this.destructionFrame);
      }
    }
  }

  // ==========================================================================
  // POSITION METHODS
  // ==========================================================================

  /**
   * Update container position
   */
  private updatePosition(): void {
    const pixelX = this.position.x * GAME_CONSTANTS.TILE_SIZE;
    const pixelY = this.position.y * GAME_CONSTANTS.TILE_SIZE;

    this.container.x = pixelX;
    this.container.y = pixelY;
  }

  // ==========================================================================
  // VISUAL METHODS
  // ==========================================================================

  /**
   * Update sprite texture based on tile type
   */
  private updateSpriteTexture(): void {
    // TODO: Load actual tile textures from AssetLoader
    // For now, use colored rectangles as placeholders
    const size = GAME_CONSTANTS.TILE_SIZE;

    // Clear sprite and redraw based on type
    if (!this.sprite.texture || this.sprite.texture === null) {
      // Create temporary graphics for placeholder
      const graphics = new Graphics();

      switch (this.data.type) {
        case 'empty':
          // Empty tile - floor pattern
          graphics.beginFill(0x2a2a2a);
          graphics.drawRect(0, 0, size, size);
          graphics.endFill();
          break;

        case 'wall':
          // Solid wall - dark gray
          graphics.beginFill(0x1a1a1a);
          graphics.drawRect(0, 0, size, size);
          graphics.lineStyle(2, 0x333333);
          graphics.drawRect(2, 2, size - 4, size - 4);
          graphics.endFill();
          break;

        case 'block':
          // Destructible block - brown/wooden
          graphics.beginFill(0x8b4513);
          graphics.drawRect(0, 0, size, size);
          graphics.lineStyle(2, 0x654321);
          graphics.drawRect(2, 2, size - 4, size - 4);
          graphics.endFill();
          break;

        case 'spawn':
          // Spawn point - green tint
          graphics.beginFill(0x2a3a2a);
          graphics.drawRect(0, 0, size, size);
          graphics.endFill();
          break;
      }

      // Convert graphics to texture (placeholder until real assets loaded)
      // this.sprite.texture = graphics.generateCanvasTexture();
    }
  }

  /**
   * Start destruction animation
   */
  startDestructionAnimation(): void {
    this.isDestroying = true;
    this.destructionFrame = 0;
    this.destructionTimer = 0;

    // Create destruction overlay
    if (!this.destructionOverlay) {
      this.destructionOverlay = new Graphics();
      this.container.addChild(this.destructionOverlay);
    }
  }

  /**
   * Draw destruction animation frame
   */
  private drawDestructionFrame(frame: number): void {
    if (!this.destructionOverlay) return;

    const size = GAME_CONSTANTS.TILE_SIZE;
    const progress = frame / DESTRUCTION_ANIMATION_FRAMES;

    this.destructionOverlay.clear();

    // Draw cracks getting bigger
    this.destructionOverlay.lineStyle(2, 0x000000, progress);
    for (let i = 0; i < frame * 2; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 10 + progress * 10;
      const angle = Math.random() * Math.PI * 2;

      this.destructionOverlay.moveTo(x, y);
      this.destructionOverlay.lineTo(
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );
    }

    // Fade out
    this.sprite.alpha = 1 - progress;
  }

  /**
   * Check if tile is walkable
   */
  isWalkable(): boolean {
    return this.data.type === 'empty' || this.data.type === 'spawn';
  }

  /**
   * Check if tile is destructible
   */
  isDestructible(): boolean {
    return this.data.type === 'block';
  }

  /**
   * Check if tile blocks movement
   */
  blocksMovement(): boolean {
    return this.data.type === 'wall' || this.data.type === 'block';
  }

  /**
   * Check if tile blocks explosions
   */
  blocksExplosions(): boolean {
    return this.data.type === 'wall';
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get tileType(): TileType {
    return this.data.type;
  }

  get tilePosition(): Position {
    return this.position;
  }

  get tileData(): TileData {
    return { ...this.data };
  }

  get destroying(): boolean {
    return this.isDestroying;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy tile entity and cleanup
   */
  destroy(): void {
    // Destroy overlay if exists
    if (this.destructionOverlay) {
      this.destructionOverlay.destroy();
      this.destructionOverlay = null;
    }

    // Destroy sprite
    this.sprite.destroy();

    // Destroy container
    this.container.destroy({ children: true });
  }
}
