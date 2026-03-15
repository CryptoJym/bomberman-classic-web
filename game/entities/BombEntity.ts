/**
 * Bomb Entity for Bomberman Online
 * Handles bomb rendering, animation, fuse countdown, and movement
 */

import type { Texture, Graphics } from 'pixi.js';
import { Entity, type EntityConfig } from './Entity';
import type { Bomb, BombState, Direction } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface BombEntityConfig extends EntityConfig {
  bomb: Bomb;
  textures?: Texture[];
}

// ============================================================================
// Constants
// ============================================================================

const BOMB_ANIMATION_FRAME_RATE = 4;
const WOBBLE_SPEED = 0.008;
const WOBBLE_AMOUNT = 0.05;
const FUSE_WARNING_TIME = 1000; // ms before explosion
const KICK_SPEED = 8; // tiles per second

// ============================================================================
// Bomb Entity Class
// ============================================================================

/**
 * Bomb entity with wobble animation, fuse countdown, and kick movement
 */
export class BombEntity extends Entity {
  // Bomb state
  private _ownerId: string;
  private _radius: number;
  private _fuseTime: number;
  private _plantedAt: number;
  private _state: BombState = 'planted';
  private _moveDirection: Direction | null = null;

  // Animation
  private textures: Texture[] = [];
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private wobbleOffset: number = 0;

  // Visual effects
  private fuseGraphics: Graphics | null = null;
  private shadowGraphics: Graphics | null = null;
  private isWarning: boolean = false;
  private warningFlashTimer: number = 0;

  // PixiJS module reference
  private PIXI: typeof import('pixi.js') | null = null;

  constructor(config: BombEntityConfig) {
    super(config);

    const { bomb, textures } = config;

    this._ownerId = bomb.ownerId;
    this._radius = bomb.radius;
    this._fuseTime = bomb.fuseTime;
    this._plantedAt = bomb.plantedAt;
    this._state = bomb.state;
    this._moveDirection = bomb.moveDirection ?? null;

    if (textures) {
      this.textures = textures;
    }

    // Random wobble offset for variety
    this.wobbleOffset = Math.random() * Math.PI * 2;
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  get ownerId(): string {
    return this._ownerId;
  }

  get radius(): number {
    return this._radius;
  }

  get fuseTime(): number {
    return this._fuseTime;
  }

  get plantedAt(): number {
    return this._plantedAt;
  }

  get state(): BombState {
    return this._state;
  }

  get moveDirection(): Direction | null {
    return this._moveDirection;
  }

  /**
   * Get time remaining until explosion
   */
  get timeRemaining(): number {
    const elapsed = Date.now() - this._plantedAt;
    return Math.max(0, this._fuseTime - elapsed);
  }

  /**
   * Check if bomb should explode
   */
  get shouldExplode(): boolean {
    return this.timeRemaining <= 0;
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

    // Create shadow
    this.createShadow(PIXI);

    // Create main sprite
    this.sprite = new PIXI.Sprite(this.textures[0]);
    this.sprite.anchor.set(0.5, 0.75); // Bottom-center for wobble effect
    this.sprite.zIndex = 5;
    this.container.addChild(this.sprite);

    // Create fuse indicator
    this.createFuseIndicator(PIXI);

    // Set initial position
    this.updateSpritePosition();
  }

  /**
   * Create shadow graphics
   */
  private createShadow(PIXI: typeof import('pixi.js')): void {
    this.shadowGraphics = new PIXI.Graphics();
    this.shadowGraphics.ellipse(0, GAME_CONSTANTS.TILE_SIZE * 0.3, 10, 4);
    this.shadowGraphics.fill({ color: 0x000000, alpha: 0.3 });
    this.shadowGraphics.zIndex = 1;

    this.container?.addChild(this.shadowGraphics);
  }

  /**
   * Create fuse indicator (countdown ring)
   */
  private createFuseIndicator(PIXI: typeof import('pixi.js')): void {
    this.fuseGraphics = new PIXI.Graphics();
    this.fuseGraphics.zIndex = 10;
    this.container?.addChild(this.fuseGraphics);
  }

  /**
   * Set bomb textures
   */
  setTextures(textures: Texture[]): void {
    this.textures = textures;
    const firstTexture = textures[0];
    if (this.sprite && firstTexture) {
      this.sprite.texture = firstTexture;
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

    // Update animation
    this.updateAnimation(deltaTime);

    // Update wobble effect
    this.updateWobble(deltaTime);

    // Update warning state
    this.updateWarning(deltaTime);

    // Update fuse indicator
    this.updateFuseIndicator();

    // Update movement (if kicked)
    if (this._state === 'moving' && this._moveDirection) {
      this.updateMovement(deltaTime);
    }

    // Update sprite position
    this.updateSpritePosition();
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaTime: number): void {
    if (this.textures.length <= 1) return;

    this.animationTimer += deltaTime;

    // Faster animation when about to explode
    const frameRate = this.isWarning
      ? BOMB_ANIMATION_FRAME_RATE * 3
      : BOMB_ANIMATION_FRAME_RATE;
    const frameDuration = 1000 / frameRate;

    if (this.animationTimer >= frameDuration) {
      this.animationTimer -= frameDuration;
      this.animationFrame = (this.animationFrame + 1) % this.textures.length;

      const texture = this.textures[this.animationFrame];
      if (this.sprite && texture) {
        this.sprite.texture = texture;
      }
    }
  }

  /**
   * Update wobble effect
   */
  private updateWobble(_deltaTime: number): void {
    if (!this.sprite) return;

    // Calculate wobble based on time
    const wobble = Math.sin(Date.now() * WOBBLE_SPEED + this.wobbleOffset) * WOBBLE_AMOUNT;

    // More intense wobble when warning
    const intensity = this.isWarning ? 2 : 1;

    this.sprite.scale.x = 1 + wobble * intensity;
    this.sprite.scale.y = 1 - wobble * intensity * 0.5;
  }

  /**
   * Update warning state
   */
  private updateWarning(deltaTime: number): void {
    const wasWarning = this.isWarning;
    this.isWarning = this.timeRemaining <= FUSE_WARNING_TIME;

    // Flash effect when warning
    if (this.isWarning && this.sprite) {
      this.warningFlashTimer += deltaTime;

      const flashRate = Math.max(50, this.timeRemaining / 10); // Faster as countdown progresses
      const flash = Math.floor(this.warningFlashTimer / flashRate) % 2 === 0;

      this.sprite.tint = flash ? 0xffffff : 0xff6666;
    } else if (wasWarning && !this.isWarning && this.sprite) {
      this.sprite.tint = 0xffffff;
    }
  }

  /**
   * Update fuse indicator ring
   */
  private updateFuseIndicator(): void {
    if (!this.fuseGraphics || !this.PIXI) return;

    this.fuseGraphics.clear();

    // Calculate progress (1 = full, 0 = empty)
    const progress = this.timeRemaining / this._fuseTime;

    // Draw fuse ring
    const radius = 14;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    // Background ring
    this.fuseGraphics.circle(0, -GAME_CONSTANTS.TILE_SIZE * 0.3, radius);
    this.fuseGraphics.stroke({ color: 0x333333, width: 2, alpha: 0.5 });

    // Progress ring
    if (progress > 0) {
      this.fuseGraphics.arc(0, -GAME_CONSTANTS.TILE_SIZE * 0.3, radius, startAngle, endAngle);

      // Color based on time remaining
      const color = this.isWarning ? 0xff0000 : 0xffaa00;
      this.fuseGraphics.stroke({ color, width: 3, alpha: 0.9 });
    }
  }

  /**
   * Update movement when kicked
   */
  private updateMovement(deltaTime: number): void {
    if (!this._moveDirection) return;

    const speed = KICK_SPEED * (deltaTime / 1000);
    let dx = 0;
    let dy = 0;

    switch (this._moveDirection) {
      case 'up':
        dy = -speed;
        break;
      case 'down':
        dy = speed;
        break;
      case 'left':
        dx = -speed;
        break;
      case 'right':
        dx = speed;
        break;
    }

    this._previousPosition = { ...this._position };
    this._position.x += dx;
    this._position.y += dy;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Start bomb movement (when kicked)
   */
  kick(direction: Direction): void {
    this._state = 'moving';
    this._moveDirection = direction;
  }

  /**
   * Stop bomb movement
   */
  stopMovement(): void {
    this._state = 'planted';
    this._moveDirection = null;

    // Snap to grid
    this._position = {
      x: Math.round(this._position.x),
      y: Math.round(this._position.y),
    };
  }

  /**
   * Trigger explosion state
   */
  explode(): void {
    this._state = 'exploding';
    this.isActive = false;
  }

  /**
   * Remote detonate the bomb
   */
  remoteDetonate(): void {
    this._fuseTime = 0;
    this._plantedAt = Date.now();
  }

  // ==========================================================================
  // Server State
  // ==========================================================================

  /**
   * Apply server state to entity
   */
  applyServerState(state: Partial<Bomb>): void {
    if (state.position) {
      this.setTargetPosition(state.position);
    }

    if (state.state !== undefined) {
      this._state = state.state;
    }

    if (state.moveDirection !== undefined) {
      this._moveDirection = state.moveDirection ?? null;
    }

    if (state.fuseTime !== undefined) {
      this._fuseTime = state.fuseTime;
    }

    if (state.plantedAt !== undefined) {
      this._plantedAt = state.plantedAt;
    }

    if (state.radius !== undefined) {
      this._radius = state.radius;
    }
  }

  /**
   * Get bomb state
   */
  getBombState(): Bomb {
    return {
      id: this.id,
      ownerId: this._ownerId,
      position: this.position,
      radius: this._radius,
      fuseTime: this._fuseTime,
      plantedAt: this._plantedAt,
      state: this._state,
      moveDirection: this._moveDirection ?? undefined,
      animationFrame: this.animationFrame,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy entity and cleanup
   */
  destroy(): void {
    this.fuseGraphics?.destroy();
    this.shadowGraphics?.destroy();

    this.fuseGraphics = null;
    this.shadowGraphics = null;
    this.PIXI = null;
    this.textures = [];

    super.destroy();
  }
}
