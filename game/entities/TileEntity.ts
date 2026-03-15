/**
 * Tile Entity for Bomberman Online
 * Handles tile rendering, destruction animations, and variants
 */

import type { Texture } from 'pixi.js';
import { Entity, type EntityConfig } from './Entity';
import type { Tile, TileType, TileVariant, PowerupType, Position } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface TileEntityConfig extends EntityConfig {
  tile: Tile;
  textures?: Record<TileType, Texture[]>;
}

// ============================================================================
// Constants
// ============================================================================

const DESTRUCTION_FRAME_RATE = 15;
const DESTRUCTION_FRAMES = 6;
const SHAKE_AMOUNT = 2;
const SHAKE_DURATION = 100;

const TILE_COLORS: Record<TileType, number> = {
  empty: 0x444444,
  wall: 0x666666,
  block: 0x8b4513,
  spawn: 0x333333,
};

// ============================================================================
// Tile Entity Class
// ============================================================================

/**
 * Tile entity with destruction animation and variant support
 */
export class TileEntity extends Entity {
  // Tile state
  private _type: TileType;
  private _variant: TileVariant = 0;
  private _hiddenPowerup: PowerupType | null = null;
  private _isDestroying: boolean = false;
  private _destructionFrame: number = 0;

  // Textures
  private textures: Record<TileType, Texture[]> = {
    empty: [],
    wall: [],
    block: [],
    spawn: [],
  };

  // Animation
  private destructionTimer: number = 0;
  private shakeTimer: number = 0;
  private shakeOffset: Position = { x: 0, y: 0 };

  // Callbacks
  private onDestructionComplete?: (powerup: PowerupType | null) => void;

  // PixiJS module reference (stored for potential future use)
  // private PIXI: typeof import('pixi.js') | null = null;

  constructor(config: TileEntityConfig) {
    super(config);

    const { tile, textures } = config;

    this._type = tile.type;
    this._variant = tile.variant ?? 0;
    this._hiddenPowerup = tile.hiddenPowerup ?? null;
    this._isDestroying = tile.isDestroying ?? false;
    this._destructionFrame = tile.destructionFrame ?? 0;

    if (textures) {
      this.textures = textures;
    }
  }

  // ==========================================================================
  // Getters and Setters
  // ==========================================================================

  get type(): TileType {
    return this._type;
  }

  set type(value: TileType) {
    if (this._type !== value) {
      this._type = value;
      this.updateTexture();
    }
  }

  get variant(): TileVariant {
    return this._variant;
  }

  set variant(value: TileVariant) {
    if (this._variant !== value) {
      this._variant = value;
      this.updateTexture();
    }
  }

  get hiddenPowerup(): PowerupType | null {
    return this._hiddenPowerup;
  }

  get isDestroying(): boolean {
    return this._isDestroying;
  }

  get destructionFrame(): number {
    return this._destructionFrame;
  }

  /**
   * Check if tile is solid (blocks movement)
   */
  get isSolid(): boolean {
    return this._type === 'wall' || this._type === 'block';
  }

  /**
   * Check if tile is destructible
   */
  get isDestructible(): boolean {
    return this._type === 'block';
  }

  /**
   * Check if tile blocks explosions
   */
  get blocksExplosion(): boolean {
    return this._type === 'wall';
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize entity sprites and graphics
   */
  initialize(PIXI: typeof import('pixi.js')): void {
    // this.PIXI = PIXI; // Stored for potential future use

    // Create main sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0);
    this.sprite.width = GAME_CONSTANTS.TILE_SIZE;
    this.sprite.height = GAME_CONSTANTS.TILE_SIZE;

    // Apply initial texture
    this.updateTexture();

    // Set initial position
    this.updateSpritePosition();
  }

  /**
   * Initialize with simple graphics (no textures)
   */
  initializeSimple(PIXI: typeof import('pixi.js')): void {
    // this.PIXI = PIXI; // Stored for potential future use

    // Create graphics-based tile
    const graphics = new PIXI.Graphics();

    switch (this._type) {
      case 'wall':
        // Solid wall pattern
        graphics.rect(0, 0, GAME_CONSTANTS.TILE_SIZE, GAME_CONSTANTS.TILE_SIZE);
        graphics.fill({ color: TILE_COLORS.wall });

        // Border
        graphics.rect(1, 1, GAME_CONSTANTS.TILE_SIZE - 2, GAME_CONSTANTS.TILE_SIZE - 2);
        graphics.stroke({ color: 0x888888, width: 1 });
        break;

      case 'block':
        // Destructible block
        graphics.rect(0, 0, GAME_CONSTANTS.TILE_SIZE, GAME_CONSTANTS.TILE_SIZE);
        graphics.fill({ color: TILE_COLORS.block });

        // Brick pattern
        graphics.rect(2, 2, 12, 12);
        graphics.stroke({ color: 0x654321, width: 1 });
        graphics.rect(18, 2, 12, 12);
        graphics.stroke({ color: 0x654321, width: 1 });
        graphics.rect(10, 18, 12, 12);
        graphics.stroke({ color: 0x654321, width: 1 });
        break;

      case 'empty':
      case 'spawn':
        // Empty floor
        graphics.rect(0, 0, GAME_CONSTANTS.TILE_SIZE, GAME_CONSTANTS.TILE_SIZE);
        graphics.fill({ color: TILE_COLORS.empty });
        break;
    }

    // Convert graphics to sprite for performance
    // const texture = PIXI.app.renderer.generateTexture(graphics); // Requires app reference
    // For now, just use the graphics object

    this.container = new PIXI.Container();
    this.container.addChild(graphics);

    this.updateSpritePosition();
  }

  /**
   * Set textures for all tile types
   */
  setTextures(textures: Record<TileType, Texture[]>): void {
    this.textures = textures;
    this.updateTexture();
  }

  /**
   * Update sprite texture based on type and variant
   */
  private updateTexture(): void {
    if (!this.sprite) return;

    const typeTextures = this.textures[this._type];
    if (typeTextures && typeTextures.length > 0) {
      const textureIndex = Math.min(this._variant, typeTextures.length - 1);
      const texture = typeTextures[textureIndex];
      if (texture) {
        this.sprite.texture = texture;
      }
    } else {
      // Apply color tint as fallback
      this.sprite.tint = TILE_COLORS[this._type] ?? 0xffffff;
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

    // Update destruction animation
    if (this._isDestroying) {
      this.updateDestructionAnimation(deltaTime);
    }

    // Update shake effect
    if (this.shakeTimer > 0) {
      this.updateShake(deltaTime);
    }

    // Update sprite position
    this.updateSpritePosition();
  }

  /**
   * Update destruction animation
   */
  private updateDestructionAnimation(deltaTime: number): void {
    this.destructionTimer += deltaTime;

    const frameDuration = 1000 / DESTRUCTION_FRAME_RATE;

    if (this.destructionTimer >= frameDuration) {
      this.destructionTimer -= frameDuration;
      this._destructionFrame++;

      // Update visual
      this.updateDestructionVisual();

      // Check if complete
      if (this._destructionFrame >= DESTRUCTION_FRAMES) {
        this.completeDestruction();
      }
    }
  }

  /**
   * Update visual during destruction
   */
  private updateDestructionVisual(): void {
    if (!this.sprite) return;

    // Scale down and fade out
    const progress = this._destructionFrame / DESTRUCTION_FRAMES;
    this.sprite.scale.set(1 - progress * 0.3);
    this.sprite.alpha = 1 - progress;

    // Random offset for crumble effect
    if (progress < 0.8) {
      this.shakeOffset = {
        x: (Math.random() - 0.5) * SHAKE_AMOUNT,
        y: (Math.random() - 0.5) * SHAKE_AMOUNT,
      };
    }
  }

  /**
   * Update shake effect
   */
  private updateShake(deltaTime: number): void {
    this.shakeTimer -= deltaTime;

    if (this.shakeTimer <= 0) {
      this.shakeOffset = { x: 0, y: 0 };
      this.shakeTimer = 0;
    } else {
      this.shakeOffset = {
        x: (Math.random() - 0.5) * SHAKE_AMOUNT,
        y: (Math.random() - 0.5) * SHAKE_AMOUNT,
      };
    }
  }

  /**
   * Override position update to include shake
   */
  updateSpritePosition(_alpha: number = 1): void {
    const displayObject = this.getDisplayObject();
    if (!displayObject) return;

    const pixelPos = this.getPixelPosition();
    displayObject.x = Math.round(pixelPos.x + this.shakeOffset.x);
    displayObject.y = Math.round(pixelPos.y + this.shakeOffset.y);
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Start destruction animation
   */
  startDestruction(onComplete?: (powerup: PowerupType | null) => void): void {
    if (!this.isDestructible || this._isDestroying) return;

    this._isDestroying = true;
    this._destructionFrame = 0;
    this.destructionTimer = 0;
    this.onDestructionComplete = onComplete;

    // Start shake effect
    this.shakeTimer = SHAKE_DURATION;
  }

  /**
   * Complete destruction
   */
  private completeDestruction(): void {
    this._isDestroying = false;
    this._type = 'empty';
    this._variant = 0;

    // Reset visual
    if (this.sprite) {
      this.sprite.scale.set(1);
      this.sprite.alpha = 1;
    }

    this.updateTexture();

    // Trigger callback with hidden powerup
    this.onDestructionComplete?.(this._hiddenPowerup);
    this._hiddenPowerup = null;
  }

  /**
   * Set hidden powerup
   */
  setHiddenPowerup(powerup: PowerupType | null): void {
    this._hiddenPowerup = powerup;
  }

  /**
   * Trigger shake effect (e.g., nearby explosion)
   */
  shake(duration: number = SHAKE_DURATION): void {
    this.shakeTimer = duration;
  }

  // ==========================================================================
  // Server State
  // ==========================================================================

  /**
   * Apply server state to entity
   */
  applyServerState(state: Partial<Tile>): void {
    if (state.type !== undefined) {
      this._type = state.type;
      this.updateTexture();
    }

    if (state.variant !== undefined) {
      this._variant = state.variant;
      this.updateTexture();
    }

    if (state.hiddenPowerup !== undefined) {
      this._hiddenPowerup = state.hiddenPowerup ?? null;
    }

    if (state.isDestroying !== undefined) {
      if (state.isDestroying && !this._isDestroying) {
        this.startDestruction();
      }
      this._isDestroying = state.isDestroying;
    }

    if (state.destructionFrame !== undefined) {
      this._destructionFrame = state.destructionFrame;
    }
  }

  /**
   * Get tile state
   */
  getTileState(): Tile {
    return {
      type: this._type,
      variant: this._variant,
      hiddenPowerup: this._hiddenPowerup ?? undefined,
      isDestroying: this._isDestroying,
      destructionFrame: this._destructionFrame,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy entity and cleanup
   */
  destroy(): void {
    // this.PIXI = null;
    this.textures = { empty: [], wall: [], block: [], spawn: [] };
    this.onDestructionComplete = undefined;

    super.destroy();
  }
}
