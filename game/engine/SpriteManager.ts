/**
 * Sprite Manager for Bomberman Online
 * Handles sprite creation, pooling, and frame extraction from sprite sheets
 */

import type { Container, Sprite, Texture } from 'pixi.js';
import type { LoadedTextures } from './AssetLoader';
import type { PlayerColor, Direction, PowerupType } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface SpriteFrame {
  texture: Texture;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PooledSprite {
  sprite: Sprite;
  inUse: boolean;
  type: string;
}

// Frame configuration from manifest
const FRAME_CONFIG = {
  characters: { width: 32, height: 32, columns: 16, rows: 8 },
  bombs: { width: 32, height: 32, columns: 8, rows: 4 },
  tiles: { width: 32, height: 32, columns: 8, rows: 4 },
  powerups: { width: 24, height: 24, columns: 8, rows: 2 },
  effects: { width: 32, height: 32, columns: 8, rows: 4 },
};

// Character color offsets (row offsets in sprite sheet)
const CHARACTER_OFFSETS: Record<number, number> = {
  0: 0,   // white
  1: 2,   // black
  2: 4,   // red
  3: 6,   // blue
  4: 8,   // green
  5: 10,  // yellow
  6: 12,  // pink
  7: 14,  // cyan
};

// Animation frame mappings
const CHARACTER_ANIMATIONS: Record<string, { row: number; frames: number[] }> = {
  idle_down: { row: 0, frames: [0, 1, 2, 3] },
  idle_up: { row: 0, frames: [4, 5, 6, 7] },
  idle_left: { row: 0, frames: [8, 9, 10, 11] },
  idle_right: { row: 0, frames: [12, 13, 14, 15] },
  walk_down: { row: 1, frames: [0, 1, 2, 3] },
  walk_up: { row: 1, frames: [4, 5, 6, 7] },
  walk_left: { row: 1, frames: [8, 9, 10, 11] },
  walk_right: { row: 1, frames: [12, 13, 14, 15] },
  death: { row: 1, frames: [0, 1, 2, 3, 4, 5] },
  victory: { row: 1, frames: [8, 9, 10, 11] },
};

const TILE_INDICES: Record<string, number> = {
  ground_1: 0, ground_2: 1, ground_3: 2, ground_4: 3,
  wall_1: 8, wall_2: 9, wall_3: 10, wall_4: 11,
  block_1: 16, block_2: 17, block_3: 18, block_4: 19,
};

const POWERUP_INDICES: Record<PowerupType, number> = {
  bomb_up: 0,
  fire_up: 1,
  speed_up: 2,
  kick: 3,
  punch: 4,
  shield: 5,
  skull: 6,
};

// ============================================================================
// Sprite Manager Class
// ============================================================================

/**
 * Manages sprite creation and object pooling for performance
 */
export class SpriteManager {
  // PixiJS container reference - commented out as not currently used
  // private _stage: Container;

  // Loaded textures
  private textures: LoadedTextures | null = null;

  // Extracted frame textures
  private frameCache: Map<string, Texture> = new Map();

  // Object pools for sprite reuse
  private pools: Map<string, PooledSprite[]> = new Map();

  // PixiJS module
  private PIXI: typeof import('pixi.js') | null = null;

  // Pool configuration
  private readonly poolSizes: Record<string, number> = {
    player: 8,
    bomb: 32,
    explosion: 64,
    powerup: 16,
    tile: 200,
    particle: 100,
  };

  constructor(_stage: Container) {
    // Stage stored for potential future use
    // this._stage = stage;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Set loaded textures and initialize frame cache
   */
  async setTextures(textures: LoadedTextures): Promise<void> {
    this.textures = textures;
    this.PIXI = await import('pixi.js');
    await this.initializeFrameCache();
    this.initializePools();
  }

  /**
   * Initialize frame cache by extracting individual frames from sprite sheets
   */
  private async initializeFrameCache(): Promise<void> {
    if (!this.textures || !this.PIXI) return;

    // Extract character frames
    if (this.textures.characters) {
      this.extractFrames('characters', this.textures.characters, FRAME_CONFIG.characters);
    }

    // Extract bomb frames
    if (this.textures.bombs) {
      this.extractFrames('bombs', this.textures.bombs, FRAME_CONFIG.bombs);
    }

    // Extract tile frames
    if (this.textures.tiles) {
      this.extractFrames('tiles', this.textures.tiles, FRAME_CONFIG.tiles);
    }

    // Extract powerup frames
    if (this.textures.powerups) {
      this.extractFrames('powerups', this.textures.powerups, FRAME_CONFIG.powerups);
    }

    // Extract effect frames
    if (this.textures.effects) {
      this.extractFrames('effects', this.textures.effects, FRAME_CONFIG.effects);
    }
  }

  /**
   * Extract individual frames from a sprite sheet
   */
  private extractFrames(
    sheetName: string,
    texture: Texture,
    config: { width: number; height: number; columns: number; rows: number }
  ): void {
    if (!this.PIXI) return;

    const { width, height, columns, rows } = config;
    const baseTexture = texture.source;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const frameIndex = row * columns + col;
        const key = `${sheetName}_${frameIndex}`;

        const frame = new this.PIXI.Rectangle(
          col * width,
          row * height,
          width,
          height
        );

        const frameTexture = new this.PIXI.Texture({
          source: baseTexture,
          frame,
        });

        this.frameCache.set(key, frameTexture);
      }
    }
  }

  /**
   * Initialize object pools
   */
  private initializePools(): void {
    if (!this.PIXI) return;

    for (const [type, size] of Object.entries(this.poolSizes)) {
      const pool: PooledSprite[] = [];

      for (let i = 0; i < size; i++) {
        const sprite = new this.PIXI.Sprite();
        sprite.visible = false;
        sprite.anchor.set(0.5);

        pool.push({
          sprite,
          inUse: false,
          type,
        });
      }

      this.pools.set(type, pool);
    }
  }

  // ==========================================================================
  // Sprite Creation API
  // ==========================================================================

  /**
   * Get a sprite from the pool or create a new one
   */
  getSprite(type: string): Sprite | null {
    if (!this.PIXI) return null;

    const pool = this.pools.get(type);

    if (pool) {
      // Find available sprite in pool
      const available = pool.find((p) => !p.inUse);

      if (available) {
        available.inUse = true;
        available.sprite.visible = true;
        return available.sprite;
      }

      // Pool exhausted, create new sprite
      const newSprite = new this.PIXI.Sprite();
      newSprite.anchor.set(0.5);
      pool.push({ sprite: newSprite, inUse: true, type });
      return newSprite;
    }

    // No pool for this type, create new sprite
    const sprite = new this.PIXI.Sprite();
    sprite.anchor.set(0.5);
    return sprite;
  }

  /**
   * Return a sprite to its pool
   */
  releaseSprite(sprite: Sprite, type: string): void {
    const pool = this.pools.get(type);

    if (pool) {
      const pooled = pool.find((p) => p.sprite === sprite);
      if (pooled) {
        pooled.inUse = false;
        pooled.sprite.visible = false;
        pooled.sprite.parent?.removeChild(pooled.sprite);
      }
    }
  }

  /**
   * Get a frame texture by key
   */
  getFrame(key: string): Texture | null {
    return this.frameCache.get(key) || null;
  }

  // ==========================================================================
  // Character Sprites
  // ==========================================================================

  /**
   * Create a player sprite with the specified color
   */
  createPlayerSprite(color: PlayerColor): Sprite | null {
    const sprite = this.getSprite('player');
    if (!sprite) return null;

    // Set initial frame (idle down)
    const colorOffset = CHARACTER_OFFSETS[color] ?? 0;
    const frameIndex = colorOffset * 16; // First row for this color
    const texture = this.getFrame(`characters_${frameIndex}`);

    if (texture) {
      sprite.texture = texture;
    }

    return sprite;
  }

  /**
   * Update player sprite animation frame
   */
  updatePlayerFrame(
    sprite: Sprite,
    color: PlayerColor,
    animation: string,
    frameIndex: number
  ): void {
    const animConfig = CHARACTER_ANIMATIONS[animation];
    if (!animConfig) return;

    const colorOffset = CHARACTER_OFFSETS[color] || 0;
    const row = colorOffset + animConfig.row;
    const frame = animConfig.frames[frameIndex % animConfig.frames.length] ?? 0;
    const globalIndex = row * 16 + frame;

    const texture = this.getFrame(`characters_${globalIndex}`);
    if (texture) {
      sprite.texture = texture;
    }
  }

  /**
   * Get animation name based on direction and movement state
   */
  getAnimationName(direction: Direction, isMoving: boolean): string {
    const prefix = isMoving ? 'walk' : 'idle';
    return `${prefix}_${direction}`;
  }

  // ==========================================================================
  // Bomb Sprites
  // ==========================================================================

  /**
   * Create a bomb sprite
   */
  createBombSprite(): Sprite | null {
    const sprite = this.getSprite('bomb');
    if (!sprite) return null;

    // Set initial frame (first bomb frame)
    const texture = this.getFrame('bombs_0');
    if (texture) {
      sprite.texture = texture;
    }

    return sprite;
  }

  /**
   * Update bomb sprite animation frame
   */
  updateBombFrame(sprite: Sprite, frameIndex: number): void {
    // Bomb idle animation: frames 0-2
    const frame = frameIndex % 3;
    const texture = this.getFrame(`bombs_${frame}`);
    if (texture) {
      sprite.texture = texture;
    }
  }

  // ==========================================================================
  // Explosion Sprites
  // ==========================================================================

  /**
   * Create an explosion sprite
   */
  createExplosionSprite(
    type: 'center' | 'horizontal' | 'vertical' | 'end_up' | 'end_down' | 'end_left' | 'end_right'
  ): Sprite | null {
    const sprite = this.getSprite('explosion');
    if (!sprite) return null;

    // Map explosion type to frame row
    const typeOffsets: Record<string, number> = {
      center: 16,
      horizontal: 20,
      vertical: 24,
      end_up: 28,
      end_down: 0, // Using center for now
      end_left: 0,
      end_right: 0,
    };

    const baseFrame = typeOffsets[type] || 16;
    const texture = this.getFrame(`bombs_${baseFrame}`);

    if (texture) {
      sprite.texture = texture;
    }

    return sprite;
  }

  /**
   * Update explosion sprite animation frame
   */
  updateExplosionFrame(sprite: Sprite, type: string, frameIndex: number): void {
    const typeOffsets: Record<string, number> = {
      center: 16,
      horizontal: 20,
      vertical: 24,
    };

    const baseFrame = typeOffsets[type] || 16;
    const frame = baseFrame + (frameIndex % 4);
    const texture = this.getFrame(`bombs_${frame}`);

    if (texture) {
      sprite.texture = texture;
    }
  }

  // ==========================================================================
  // Tile Sprites
  // ==========================================================================

  /**
   * Create a tile sprite
   */
  createTileSprite(type: 'empty' | 'wall' | 'block', variant: number = 0): Sprite | null {
    const sprite = this.getSprite('tile');
    if (!sprite) return null;

    // Map tile type to frame index
    let baseName = 'ground';
    if (type === 'wall') baseName = 'wall';
    else if (type === 'block') baseName = 'block';

    const tileKey = `${baseName}_${(variant % 4) + 1}`;
    const frameIndex = TILE_INDICES[tileKey] ?? 0;
    const texture = this.getFrame(`tiles_${frameIndex}`);

    if (texture) {
      sprite.texture = texture;
    }

    // Reset anchor for tiles (top-left)
    sprite.anchor.set(0, 0);

    return sprite;
  }

  // ==========================================================================
  // Powerup Sprites
  // ==========================================================================

  /**
   * Create a powerup sprite
   */
  createPowerupSprite(type: PowerupType): Sprite | null {
    const sprite = this.getSprite('powerup');
    if (!sprite) return null;

    const frameIndex = POWERUP_INDICES[type] ?? 0;
    const texture = this.getFrame(`powerups_${frameIndex}`);

    if (texture) {
      sprite.texture = texture;
    }

    return sprite;
  }

  /**
   * Update powerup sprite glow animation
   */
  updatePowerupFrame(sprite: Sprite, type: PowerupType, isGlowing: boolean): void {
    const baseIndex = POWERUP_INDICES[type] ?? 0;
    const frameIndex = isGlowing ? baseIndex + 8 : baseIndex; // Glow frames in second row
    const texture = this.getFrame(`powerups_${frameIndex}`);

    if (texture) {
      sprite.texture = texture;
    }
  }

  // ==========================================================================
  // Particle Sprites
  // ==========================================================================

  /**
   * Create a particle sprite
   */
  createParticleSprite(color: number = 0xffffff): Sprite | null {
    if (!this.PIXI) return null;

    const sprite = this.getSprite('particle');
    if (!sprite) return null;

    // Create a simple colored square texture for particles
    const graphics = new this.PIXI.Graphics();
    graphics.rect(0, 0, 4, 4);
    graphics.fill(color);

    const texture = this.PIXI.RenderTexture.create({ width: 4, height: 4 });

    sprite.texture = texture;
    sprite.anchor.set(0.5);

    return sprite;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get pool statistics
   */
  getPoolStats(): Record<string, { total: number; inUse: number }> {
    const stats: Record<string, { total: number; inUse: number }> = {};

    for (const [type, pool] of this.pools) {
      stats[type] = {
        total: pool.length,
        inUse: pool.filter((p) => p.inUse).length,
      };
    }

    return stats;
  }

  /**
   * Release all sprites in a pool
   */
  releaseAllSprites(type: string): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    for (const pooled of pool) {
      pooled.inUse = false;
      pooled.sprite.visible = false;
      pooled.sprite.parent?.removeChild(pooled.sprite);
    }
  }

  /**
   * Clean up and destroy all resources
   */
  destroy(): void {
    // Clear frame cache
    for (const texture of this.frameCache.values()) {
      texture.destroy();
    }
    this.frameCache.clear();

    // Destroy all pooled sprites
    for (const pool of this.pools.values()) {
      for (const pooled of pool) {
        pooled.sprite.destroy();
      }
    }
    this.pools.clear();

    this.textures = null;
    this.PIXI = null;
  }
}
