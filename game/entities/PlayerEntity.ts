/**
 * Player Entity for Bomberman Online
 * Handles player rendering, animation, and state management
 */

import type { Texture, Graphics, Sprite } from 'pixi.js';
import { Entity, type EntityConfig } from './Entity';
import type {
  Player,
  Direction,
  PlayerAnimationState,
  PlayerColor,
  PowerupType,
  SkullEffect,
  Position,
} from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface PlayerEntityConfig extends EntityConfig {
  player: Player;
  textures?: Record<string, Texture[]>;
}

interface AnimationSet {
  idle: Texture[];
  walk: Texture[];
  death: Texture[];
  victory: Texture[];
}

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_FRAME_RATE = 12;
const DEATH_ANIMATION_FRAME_RATE = 10;
const PLAYER_COLORS: number[] = [
  0xffffff, // White
  0xff0000, // Red
  0x00ff00, // Green
  0x0000ff, // Blue
  0xffff00, // Yellow
  0xff00ff, // Magenta
  0x00ffff, // Cyan
  0xff8800, // Orange
];

// ============================================================================
// Player Entity Class
// ============================================================================

/**
 * Player entity with animation, movement interpolation, and effects
 */
export class PlayerEntity extends Entity {
  // Player state
  private _direction: Direction = 'down';
  private _isAlive: boolean = true;
  private _animationState: PlayerAnimationState = 'idle';
  private _animationFrame: number = 0;
  private _color: PlayerColor = 0;
  private _username: string = '';

  // Movement
  private _speed: number = 1.0;
  private _isMoving: boolean = false;
  // private _velocity: Position = { x: 0, y: 0 }; // Stored for potential interpolation

  // Powerups and effects
  private _hasShield: boolean = false;
  private _canKick: boolean = false;
  private _canPunch: boolean = false;
  private _skullEffect: SkullEffect | null = null;
  private _maxBombs: number = 1;
  private _explosionRadius: number = 1;
  private _activeBombs: number = 0;

  // Animation
  private animationSets: Map<Direction, AnimationSet> = new Map();
  private animationTimer: number = 0;
  private deathTextures: Texture[] = [];
  private victoryTextures: Texture[] = [];

  // Rendering
  private shieldGraphics: Graphics | null = null;
  private usernameText: import('pixi.js').Text | null = null;
  private skullIndicator: Sprite | null = null;
  private invincibilityFlash: boolean = false;
  private invincibilityTimer: number = 0;

  // Effects
  private _isInvincible: boolean = false;
  private dustTimer: number = 0;
  private lastDustPosition: Position = { x: 0, y: 0 };

  // PixiJS module reference (stored for potential future use)
  // private PIXI: typeof import('pixi.js') | null = null;

  constructor(config: PlayerEntityConfig) {
    super(config);

    const { player, textures } = config;

    this._direction = player.direction;
    this._isAlive = player.isAlive;
    this._animationState = player.animationState;
    this._animationFrame = player.animationFrame;
    this._color = player.color;
    this._username = player.username;
    this._speed = player.speed;
    this._hasShield = player.hasShield;
    this._canKick = player.canKick;
    this._canPunch = player.canPunch;
    this._skullEffect = player.skullEffect ?? null;
    this._maxBombs = player.maxBombs;
    this._explosionRadius = player.explosionRadius;
    this._activeBombs = player.activeBombs;

    // Store textures if provided
    if (textures) {
      this.setupAnimations(textures);
    }
  }

  // ==========================================================================
  // Getters and Setters
  // ==========================================================================

  get direction(): Direction {
    return this._direction;
  }

  set direction(value: Direction) {
    if (this._direction !== value) {
      this._direction = value;
      this.updateAnimationTextures();
    }
  }

  get isAlive(): boolean {
    return this._isAlive;
  }

  set isAlive(value: boolean) {
    if (this._isAlive !== value) {
      this._isAlive = value;
      if (!value) {
        this.playDeathAnimation();
      }
    }
  }

  get animationState(): PlayerAnimationState {
    return this._animationState;
  }

  set animationState(value: PlayerAnimationState) {
    if (this._animationState !== value) {
      this._animationState = value;
      this._animationFrame = 0;
      this.animationTimer = 0;
      this.updateAnimationTextures();
    }
  }

  get username(): string {
    return this._username;
  }

  get color(): PlayerColor {
    return this._color;
  }

  get speed(): number {
    return this._speed;
  }

  get hasShield(): boolean {
    return this._hasShield;
  }

  get canKick(): boolean {
    return this._canKick;
  }

  get canPunch(): boolean {
    return this._canPunch;
  }

  get skullEffect(): SkullEffect | null {
    return this._skullEffect;
  }

  get maxBombs(): number {
    return this._maxBombs;
  }

  get explosionRadius(): number {
    return this._explosionRadius;
  }

  get activeBombs(): number {
    return this._activeBombs;
  }

  get isInvincible(): boolean {
    return this._isInvincible;
  }

  set isInvincible(value: boolean) {
    this._isInvincible = value;
    this.invincibilityTimer = value ? GAME_CONSTANTS.RESPAWN_INVINCIBILITY : 0;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize entity sprites and graphics
   */
  initialize(PIXI: typeof import('pixi.js')): void {
    // this.PIXI = PIXI; // Stored for potential future use

    // Create container for player and effects
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Create main sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 0.85); // Bottom-center anchor for proper positioning
    this.sprite.zIndex = 10;
    this.container.addChild(this.sprite);

    // Create shield effect
    this.createShieldEffect(PIXI);

    // Create username text
    this.createUsernameText(PIXI);

    // Create skull indicator
    this.createSkullIndicator(PIXI);

    // Set initial position
    this.updateSpritePosition();

    // Apply tint
    this.sprite.tint = PLAYER_COLORS[this._color] ?? 0xffffff;
  }

  /**
   * Create shield graphics
   */
  private createShieldEffect(PIXI: typeof import('pixi.js')): void {
    this.shieldGraphics = new PIXI.Graphics();
    this.shieldGraphics.visible = this._hasShield;
    this.shieldGraphics.zIndex = 5;

    // Draw shield bubble
    this.shieldGraphics.circle(0, -GAME_CONSTANTS.TILE_SIZE / 2, GAME_CONSTANTS.TILE_SIZE * 0.6);
    this.shieldGraphics.stroke({ color: 0x00ffff, width: 2, alpha: 0.7 });
    this.shieldGraphics.fill({ color: 0x00ffff, alpha: 0.2 });

    this.container?.addChild(this.shieldGraphics);
  }

  /**
   * Create username text above player
   */
  private createUsernameText(PIXI: typeof import('pixi.js')): void {
    this.usernameText = new PIXI.Text({
      text: this._username,
      style: {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: 8,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
        align: 'center',
      },
    });

    this.usernameText.anchor.set(0.5, 1);
    this.usernameText.y = -GAME_CONSTANTS.TILE_SIZE - 4;
    this.usernameText.zIndex = 20;

    this.container?.addChild(this.usernameText);
  }

  /**
   * Create skull curse indicator
   */
  private createSkullIndicator(PIXI: typeof import('pixi.js')): void {
    this.skullIndicator = new PIXI.Sprite();
    this.skullIndicator.anchor.set(0.5);
    this.skullIndicator.scale.set(0.5);
    this.skullIndicator.y = -GAME_CONSTANTS.TILE_SIZE * 1.2;
    this.skullIndicator.visible = false;
    this.skullIndicator.zIndex = 15;
    this.skullIndicator.tint = 0x00ff00; // Green skull

    this.container?.addChild(this.skullIndicator);
  }

  /**
   * Setup animation texture sets
   */
  setupAnimations(textures: Record<string, Texture[]>): void {
    const directions: Direction[] = ['down', 'up', 'left', 'right'];

    for (const dir of directions) {
      this.animationSets.set(dir, {
        idle: textures[`player_idle_${dir}`] ?? [],
        walk: textures[`player_walk_${dir}`] ?? [],
        death: [],
        victory: [],
      });
    }

    this.deathTextures = textures['player_death'] ?? [];
    this.victoryTextures = textures['player_victory'] ?? [];

    this.updateAnimationTextures();
  }

  /**
   * Update sprite textures based on current animation
   */
  private updateAnimationTextures(): void {
    if (!this.sprite) return;

    let textures: Texture[] = [];

    switch (this._animationState) {
      case 'death':
        textures = this.deathTextures;
        break;
      case 'victory':
        textures = this.victoryTextures;
        break;
      default: {
        const animSet = this.animationSets.get(this._direction);
        if (animSet) {
          textures = this._isMoving ? animSet.walk : animSet.idle;
        }
        break;
      }
    }

    const texture = textures[this._animationFrame];
    if (textures.length > 0 && texture) {
      this.sprite.texture = texture;
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

    // Update invincibility
    this.updateInvincibility(deltaTime);

    // Update effects
    this.updateEffects(deltaTime);

    // Update sprite position
    this.updateSpritePosition();
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaTime: number): void {
    this.animationTimer += deltaTime;

    const frameRate =
      this._animationState === 'death' ? DEATH_ANIMATION_FRAME_RATE : ANIMATION_FRAME_RATE;
    const frameDuration = 1000 / frameRate;

    if (this.animationTimer >= frameDuration) {
      this.animationTimer -= frameDuration;

      let textures: Texture[] = [];

      switch (this._animationState) {
        case 'death':
          textures = this.deathTextures;
          if (this._animationFrame < textures.length - 1) {
            this._animationFrame++;
          }
          break;
        case 'victory':
          textures = this.victoryTextures;
          this._animationFrame = (this._animationFrame + 1) % textures.length;
          break;
        default: {
          const animSet = this.animationSets.get(this._direction);
          if (animSet) {
            textures = this._isMoving ? animSet.walk : animSet.idle;
          }
          this._animationFrame = (this._animationFrame + 1) % (textures.length || 1);
          break;
        }
      }

      this.updateAnimationTextures();
    }
  }

  /**
   * Update invincibility flashing effect
   */
  private updateInvincibility(deltaTime: number): void {
    if (!this._isInvincible) return;

    this.invincibilityTimer -= deltaTime;

    if (this.invincibilityTimer <= 0) {
      this._isInvincible = false;
      if (this.sprite) {
        this.sprite.alpha = 1;
      }
      return;
    }

    // Flash effect
    const flashRate = 100; // ms
    this.invincibilityFlash = Math.floor(this.invincibilityTimer / flashRate) % 2 === 0;

    if (this.sprite) {
      this.sprite.alpha = this.invincibilityFlash ? 1 : 0.3;
    }
  }

  /**
   * Update visual effects (shield, skull)
   */
  private updateEffects(deltaTime: number): void {
    // Update shield visibility
    if (this.shieldGraphics) {
      this.shieldGraphics.visible = this._hasShield;

      // Pulsating shield effect
      if (this._hasShield) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.9;
        this.shieldGraphics.scale.set(pulse);
        this.shieldGraphics.alpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
      }
    }

    // Update skull indicator
    if (this.skullIndicator) {
      this.skullIndicator.visible = this._skullEffect !== null;

      if (this._skullEffect) {
        // Bobbing effect
        this.skullIndicator.y = -GAME_CONSTANTS.TILE_SIZE * 1.2 + Math.sin(Date.now() * 0.005) * 2;
      }
    }

    // Update dust particles when moving
    this.dustTimer += deltaTime;
    if (this._isMoving && this.dustTimer >= 150) {
      const currentTile = this.getTilePosition();
      if (
        currentTile.x !== this.lastDustPosition.x ||
        currentTile.y !== this.lastDustPosition.y
      ) {
        this.lastDustPosition = currentTile;
        this.dustTimer = 0;
        // Dust particle would be created via callback
      }
    }
  }

  // ==========================================================================
  // Movement
  // ==========================================================================

  /**
   * Set movement state
   */
  setMoving(moving: boolean, direction?: Direction): void {
    this._isMoving = moving;
    if (direction) {
      this.direction = direction;
    }

    if (!moving) {
      // this._velocity = { x: 0, y: 0 }; // For future interpolation
    }

    // Update animation state
    if (this._isAlive && this._animationState !== 'death') {
      this.animationState = moving ? 'walk' : 'idle';
    }
  }

  /**
   * Set velocity for prediction
   */
  setVelocity(_vx: number, _vy: number): void {
    // this._velocity = { x: vx, y: vy }; // For future interpolation
  }

  /**
   * Move by delta (for client-side prediction)
   */
  move(dx: number, dy: number): void {
    this._previousPosition = { ...this._position };
    this._position.x += dx;
    this._position.y += dy;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Play death animation
   */
  playDeathAnimation(): void {
    this._animationState = 'death';
    this._animationFrame = 0;
    this.animationTimer = 0;
    this._isMoving = false;
    this.updateAnimationTextures();
  }

  /**
   * Play victory animation
   */
  playVictoryAnimation(): void {
    if (!this._isAlive) return;
    this._animationState = 'victory';
    this._animationFrame = 0;
    this.animationTimer = 0;
    this._isMoving = false;
    this.updateAnimationTextures();
  }

  /**
   * Apply powerup effect
   */
  applyPowerup(type: PowerupType): void {
    switch (type) {
      case 'bomb_up':
        this._maxBombs = Math.min(this._maxBombs + 1, GAME_CONSTANTS.MAX_BOMBS);
        break;
      case 'fire_up':
        this._explosionRadius = Math.min(
          this._explosionRadius + 1,
          GAME_CONSTANTS.MAX_EXPLOSION_RADIUS
        );
        break;
      case 'speed_up':
        this._speed = Math.min(
          this._speed + GAME_CONSTANTS.SPEED_INCREMENT,
          GAME_CONSTANTS.MAX_PLAYER_SPEED
        );
        break;
      case 'kick':
        this._canKick = true;
        break;
      case 'punch':
        this._canPunch = true;
        break;
      case 'shield':
        this._hasShield = true;
        break;
      case 'skull':
        // Skull effect handled separately
        break;
    }
  }

  /**
   * Apply skull curse
   */
  applySkullEffect(effect: SkullEffect): void {
    this._skullEffect = effect;
  }

  /**
   * Remove skull curse
   */
  removeSkullEffect(): void {
    this._skullEffect = null;
  }

  /**
   * Use shield (when hit)
   */
  useShield(): void {
    this._hasShield = false;
    if (this.shieldGraphics) {
      this.shieldGraphics.visible = false;
    }
  }

  /**
   * Increment active bomb count
   */
  incrementActiveBombs(): void {
    this._activeBombs++;
  }

  /**
   * Decrement active bomb count
   */
  decrementActiveBombs(): void {
    this._activeBombs = Math.max(0, this._activeBombs - 1);
  }

  /**
   * Check if player can place a bomb
   */
  canPlaceBomb(): boolean {
    return this._isAlive && this._activeBombs < this._maxBombs && this._skullEffect !== 'constipation';
  }

  // ==========================================================================
  // Server State
  // ==========================================================================

  /**
   * Apply server state to entity
   */
  applyServerState(state: Partial<Player>): void {
    if (state.position) {
      this.setTargetPosition(state.position);
    }

    if (state.direction !== undefined) {
      this.direction = state.direction;
    }

    if (state.isAlive !== undefined) {
      this.isAlive = state.isAlive;
    }

    if (state.animationState !== undefined) {
      this.animationState = state.animationState;
    }

    if (state.speed !== undefined) {
      this._speed = state.speed;
    }

    if (state.hasShield !== undefined) {
      this._hasShield = state.hasShield;
    }

    if (state.canKick !== undefined) {
      this._canKick = state.canKick;
    }

    if (state.canPunch !== undefined) {
      this._canPunch = state.canPunch;
    }

    if (state.skullEffect !== undefined) {
      this._skullEffect = state.skullEffect ?? null;
    }

    if (state.maxBombs !== undefined) {
      this._maxBombs = state.maxBombs;
    }

    if (state.explosionRadius !== undefined) {
      this._explosionRadius = state.explosionRadius;
    }

    if (state.activeBombs !== undefined) {
      this._activeBombs = state.activeBombs;
    }
  }

  /**
   * Get full player state
   */
  getPlayerState(): Partial<Player> {
    return {
      id: this.id,
      position: this.position,
      direction: this._direction,
      isAlive: this._isAlive,
      animationState: this._animationState,
      animationFrame: this._animationFrame,
      speed: this._speed,
      hasShield: this._hasShield,
      canKick: this._canKick,
      canPunch: this._canPunch,
      skullEffect: this._skullEffect ?? undefined,
      maxBombs: this._maxBombs,
      explosionRadius: this._explosionRadius,
      activeBombs: this._activeBombs,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy entity and cleanup
   */
  destroy(): void {
    this.shieldGraphics?.destroy();
    this.usernameText?.destroy();
    this.skullIndicator?.destroy();

    this.shieldGraphics = null;
    this.usernameText = null;
    this.skullIndicator = null;
    // this.PIXI = null;

    this.animationSets.clear();
    this.deathTextures = [];
    this.victoryTextures = [];

    super.destroy();
  }
}
