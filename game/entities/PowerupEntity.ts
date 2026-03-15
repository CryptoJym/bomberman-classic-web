/**
 * Powerup Entity for Bomberman Online
 * Handles powerup rendering, animation, and collection effects
 */

import type { Texture, Graphics } from 'pixi.js';
import { Entity, type EntityConfig } from './Entity';
import type { Powerup, PowerupType } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface PowerupEntityConfig extends EntityConfig {
  powerup: Powerup;
  texture?: Texture;
}

// ============================================================================
// Constants
// ============================================================================

const BOB_SPEED = 0.004;
const BOB_AMOUNT = 3;
const GLOW_PULSE_SPEED = 0.006;
const COLLECT_ANIMATION_DURATION = 200;
const SPAWN_ANIMATION_DURATION = 300;

const POWERUP_COLORS: Record<PowerupType, number> = {
  bomb_up: 0xff6600, // Orange
  fire_up: 0xff0000, // Red
  speed_up: 0x00ff00, // Green
  kick: 0xffff00, // Yellow
  punch: 0xff00ff, // Magenta
  shield: 0x00ffff, // Cyan
  skull: 0x00ff00, // Bright green (poison)
};

const POWERUP_DESCRIPTIONS: Record<PowerupType, string> = {
  bomb_up: '+1 Bomb',
  fire_up: '+1 Range',
  speed_up: '+Speed',
  kick: 'Kick',
  punch: 'Punch',
  shield: 'Shield',
  skull: 'Curse!',
};

// ============================================================================
// Powerup Entity Class
// ============================================================================

/**
 * Powerup entity with bobbing animation, glow effect, and collection handling
 */
export class PowerupEntity extends Entity {
  // Powerup state
  private _type: PowerupType;
  private _spawnedAt: number;

  // Animation
  private bobOffset: number = 0;
  private bobPhase: number = 0;
  private glowPhase: number = 0;
  private spawnProgress: number = 0;
  private collectProgress: number = 0;
  private isCollecting: boolean = false;

  // Visual effects
  private glowGraphics: Graphics | null = null;
  private shadowGraphics: Graphics | null = null;

  // Callbacks
  private onCollectComplete?: () => void;

  // PixiJS module reference
  private PIXI: typeof import('pixi.js') | null = null;

  constructor(config: PowerupEntityConfig) {
    super(config);

    const { powerup, texture: _texture } = config;

    this._type = powerup.type;
    this._spawnedAt = powerup.spawnedAt;

    // Random bob phase for variety
    this.bobPhase = Math.random() * Math.PI * 2;
    this.glowPhase = Math.random() * Math.PI * 2;
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  get type(): PowerupType {
    return this._type;
  }

  get spawnedAt(): number {
    return this._spawnedAt;
  }

  get color(): number {
    return POWERUP_COLORS[this._type] ?? 0xffffff;
  }

  get description(): string {
    return POWERUP_DESCRIPTIONS[this._type] ?? this._type;
  }

  /**
   * Check if powerup is negative (skull)
   */
  get isNegative(): boolean {
    return this._type === 'skull';
  }

  /**
   * Get age of powerup in ms
   */
  get age(): number {
    return Date.now() - this._spawnedAt;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize entity sprites and graphics
   */
  initialize(PIXI: typeof import('pixi.js')): void {
    this.PIXI = PIXI;

    // Create container
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Create glow effect
    this.createGlow(PIXI);

    // Create shadow
    this.createShadow(PIXI);

    // Create main sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.zIndex = 5;
    this.container.addChild(this.sprite);

    // Apply color tint if no texture
    this.sprite.tint = this.color;

    // Set initial position
    this.updateSpritePosition();

    // Start spawn animation
    this.spawnProgress = 0;
  }

  /**
   * Create glow effect
   */
  private createGlow(PIXI: typeof import('pixi.js')): void {
    this.glowGraphics = new PIXI.Graphics();
    this.glowGraphics.zIndex = 1;
    this.container?.addChild(this.glowGraphics);
  }

  /**
   * Create shadow
   */
  private createShadow(PIXI: typeof import('pixi.js')): void {
    this.shadowGraphics = new PIXI.Graphics();
    this.shadowGraphics.ellipse(0, GAME_CONSTANTS.TILE_SIZE * 0.35, 8, 3);
    this.shadowGraphics.fill({ color: 0x000000, alpha: 0.2 });
    this.shadowGraphics.zIndex = 0;

    this.container?.addChild(this.shadowGraphics);
  }

  /**
   * Set powerup texture
   */
  setTexture(texture: Texture): void {
    if (this.sprite) {
      this.sprite.texture = texture;
      // Reset tint when using texture
      this.sprite.tint = 0xffffff;
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

    // Update spawn animation
    if (this.spawnProgress < 1) {
      this.updateSpawnAnimation(deltaTime);
    }

    // Update collect animation
    if (this.isCollecting) {
      this.updateCollectAnimation(deltaTime);
      return;
    }

    // Update bob animation
    this.updateBobAnimation(deltaTime);

    // Update glow effect
    this.updateGlowEffect(deltaTime);

    // Update sprite position
    this.updateSpritePosition();
  }

  /**
   * Update spawn animation
   */
  private updateSpawnAnimation(deltaTime: number): void {
    this.spawnProgress = Math.min(1, this.spawnProgress + deltaTime / SPAWN_ANIMATION_DURATION);

    if (!this.sprite || !this.container) return;

    // Scale bounce effect
    const t = this.spawnProgress;
    const bounce = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.sprite.scale.set(bounce);
    this.container.alpha = this.spawnProgress;
  }

  /**
   * Update collect animation
   */
  private updateCollectAnimation(deltaTime: number): void {
    this.collectProgress = Math.min(1, this.collectProgress + deltaTime / COLLECT_ANIMATION_DURATION);

    if (!this.sprite || !this.container) return;

    // Scale up and fade out
    const scale = 1 + this.collectProgress * 0.5;
    this.sprite.scale.set(scale);
    this.container.alpha = 1 - this.collectProgress;

    // Float up
    this.sprite.y -= deltaTime * 0.1;

    // Complete
    if (this.collectProgress >= 1) {
      this.isActive = false;
      this.onCollectComplete?.();
    }
  }

  /**
   * Update bobbing animation
   */
  private updateBobAnimation(deltaTime: number): void {
    if (!this.sprite) return;

    this.bobPhase += deltaTime * BOB_SPEED;
    this.bobOffset = Math.sin(this.bobPhase) * BOB_AMOUNT;

    // Apply bob to sprite Y position
    this.sprite.y = -this.bobOffset;

    // Update shadow based on bob height
    if (this.shadowGraphics) {
      const shadowScale = 1 - (this.bobOffset / BOB_AMOUNT) * 0.2;
      this.shadowGraphics.scale.set(shadowScale);
      this.shadowGraphics.alpha = 0.2 + (this.bobOffset / BOB_AMOUNT) * 0.1;
    }
  }

  /**
   * Update glow effect
   */
  private updateGlowEffect(deltaTime: number): void {
    if (!this.glowGraphics || !this.PIXI) return;

    this.glowPhase += deltaTime * GLOW_PULSE_SPEED;
    const glowIntensity = 0.2 + Math.sin(this.glowPhase) * 0.15;
    const glowSize = 16 + Math.sin(this.glowPhase) * 4;

    this.glowGraphics.clear();

    // Create radial glow
    this.glowGraphics.circle(0, -this.bobOffset, glowSize);
    this.glowGraphics.fill({ color: this.color, alpha: glowIntensity });

    // Inner glow
    this.glowGraphics.circle(0, -this.bobOffset, glowSize * 0.6);
    this.glowGraphics.fill({ color: this.color, alpha: glowIntensity * 1.5 });
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Play collection animation
   */
  collect(onComplete?: () => void): void {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.collectProgress = 0;
    this.onCollectComplete = onComplete;
  }

  /**
   * Check if currently being collected
   */
  isBeingCollected(): boolean {
    return this.isCollecting;
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  /**
   * Get powerup info for UI display
   */
  getInfo(): { type: PowerupType; description: string; color: number; isNegative: boolean } {
    return {
      type: this._type,
      description: this.description,
      color: this.color,
      isNegative: this.isNegative,
    };
  }

  // ==========================================================================
  // Server State
  // ==========================================================================

  /**
   * Apply server state to entity
   */
  applyServerState(state: Partial<Powerup>): void {
    if (state.position) {
      this.setTargetPosition(state.position);
    }

    if (state.animationFrame !== undefined && this.sprite) {
      // Update animation frame if needed
    }
  }

  /**
   * Get powerup state
   */
  getPowerupState(): Powerup {
    return {
      id: this.id,
      type: this._type,
      position: this.position,
      spawnedAt: this._spawnedAt,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy entity and cleanup
   */
  destroy(): void {
    this.glowGraphics?.destroy();
    this.shadowGraphics?.destroy();

    this.glowGraphics = null;
    this.shadowGraphics = null;
    this.PIXI = null;
    this.onCollectComplete = undefined;

    super.destroy();
  }
}
