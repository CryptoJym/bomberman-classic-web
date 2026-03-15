/**
 * Player Entity for Bomberman Game
 * Manages player state, animations, and rendering with PixiJS
 */

import { Container, Sprite, Graphics, Text } from 'pixi.js';
import type {
  Player as PlayerData,
  Position,
  PlayerAnimationState,
} from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANIMATION_SPEED = 0.15; // Animation frames per update
const SHADOW_OFFSET_Y = 4;
const NAME_OFFSET_Y = -40;
const INVINCIBILITY_BLINK_SPEED = 100; // ms

// Animation frame counts per state
const ANIMATION_FRAMES: Record<PlayerAnimationState, number> = {
  idle: 4,
  walk: 8,
  place_bomb: 6,
  death: 10,
  victory: 8,
  stunned: 4,
};

// ============================================================================
// PLAYER ENTITY CLASS
// ============================================================================

/**
 * Player entity with sprite rendering and animation
 */
export class PlayerEntity {
  // Container and sprites
  public container: Container;
  private sprite: Sprite;
  private shadowGraphics: Graphics;
  private nameText: Text;
  private shieldIndicator: Graphics | null = null;
  private skullIndicator: Graphics | null = null;

  // Player data
  private data: PlayerData;

  // Animation state
  private animationFrame = 0;
  private animationTimer = 0;
  private lastAnimationState: PlayerAnimationState = 'idle';

  // Visual effects
  private invincibilityTimer = 0;
  private isVisible = true;

  constructor(playerData: PlayerData) {
    this.data = { ...playerData };

    // Create container
    this.container = new Container();
    this.container.sortableChildren = true;

    // Create shadow
    this.shadowGraphics = new Graphics();
    this.drawShadow();
    this.shadowGraphics.zIndex = 0;
    this.container.addChild(this.shadowGraphics);

    // Create player sprite
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.zIndex = 1;
    this.container.addChild(this.sprite);

    // Create name text
    this.nameText = new Text({
      text: this.data.username,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
        align: 'center',
      },
    });
    this.nameText.anchor.set(0.5);
    this.nameText.y = NAME_OFFSET_Y;
    this.nameText.zIndex = 2;
    this.container.addChild(this.nameText);

    // Position container
    this.updatePosition();
  }

  // ==========================================================================
  // UPDATE METHODS
  // ==========================================================================

  /**
   * Update player entity
   */
  update(deltaMs: number): void {
    if (!this.data.isAlive) return;

    // Update animation
    this.updateAnimation(deltaMs);

    // Update visual effects
    this.updateVisualEffects(deltaMs);

    // Update indicators
    this.updateIndicators();

    // Update position
    this.updatePosition();
  }

  /**
   * Update from server data
   */
  updateFromServer(playerData: Partial<PlayerData>): void {
    // Merge with existing data
    this.data = { ...this.data, ...playerData };

    // Update position
    if (playerData.position) {
      this.updatePosition();
    }

    // Update animation state
    if (playerData.animationState && playerData.animationState !== this.lastAnimationState) {
      this.changeAnimationState(playerData.animationState);
    }

    // Update visual effects
    if (playerData.hasShield !== undefined) {
      this.updateShieldIndicator();
    }
    if (playerData.skullEffect !== undefined) {
      this.updateSkullIndicator();
    }
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaMs: number): void {
    const animState = this.data.animationState;
    const maxFrames = ANIMATION_FRAMES[animState];

    this.animationTimer += deltaMs * ANIMATION_SPEED;

    if (this.animationTimer >= 1.0) {
      this.animationTimer = 0;
      this.animationFrame++;

      // Loop or stop animation
      if (animState === 'death') {
        // Death animation plays once and stops
        if (this.animationFrame >= maxFrames) {
          this.animationFrame = maxFrames - 1;
        }
      } else {
        // Other animations loop
        if (this.animationFrame >= maxFrames) {
          this.animationFrame = 0;
        }
      }

      // Update sprite texture
      this.updateSpriteTexture();
    }
  }

  /**
   * Update visual effects (invincibility blink, etc.)
   */
  private updateVisualEffects(deltaMs: number): void {
    // Handle invincibility blinking
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= deltaMs;

      // Blink effect
      const blinkCycle = Math.floor(this.invincibilityTimer / INVINCIBILITY_BLINK_SPEED) % 2;
      this.isVisible = blinkCycle === 0;
      this.sprite.visible = this.isVisible;
    } else {
      this.sprite.visible = true;
      this.isVisible = true;
    }
  }

  /**
   * Update status indicators (shield, skull)
   */
  private updateIndicators(): void {
    this.updateShieldIndicator();
    this.updateSkullIndicator();
  }

  // ==========================================================================
  // POSITION METHODS
  // ==========================================================================

  /**
   * Update container position from player data
   */
  private updatePosition(): void {
    const pixelX = this.data.position.x * GAME_CONSTANTS.TILE_SIZE;
    const pixelY = this.data.position.y * GAME_CONSTANTS.TILE_SIZE;

    this.container.x = pixelX;
    this.container.y = pixelY;
  }

  /**
   * Interpolate position smoothly
   */
  interpolatePosition(targetPos: Position, alpha: number): void {
    const currentX = this.container.x / GAME_CONSTANTS.TILE_SIZE;
    const currentY = this.container.y / GAME_CONSTANTS.TILE_SIZE;

    const interpX = currentX + (targetPos.x - currentX) * alpha;
    const interpY = currentY + (targetPos.y - currentY) * alpha;

    this.container.x = interpX * GAME_CONSTANTS.TILE_SIZE;
    this.container.y = interpY * GAME_CONSTANTS.TILE_SIZE;
  }

  // ==========================================================================
  // ANIMATION METHODS
  // ==========================================================================

  /**
   * Change animation state
   */
  private changeAnimationState(newState: PlayerAnimationState): void {
    if (this.lastAnimationState === newState) return;

    this.lastAnimationState = newState;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.updateSpriteTexture();
  }

  /**
   * Update sprite texture based on current animation state
   */
  private updateSpriteTexture(): void {
    // TODO: Load actual sprite textures from AssetLoader
    // For now, this is a placeholder
    // Actual implementation would get texture from sprite sheet:
    // const textureName = `player_${this.data.color}_${this.lastAnimationState}_${this.animationFrame}`;
    // this.sprite.texture = TextureCache[textureName];
  }

  /**
   * Play animation once (non-looping)
   */
  playAnimation(state: PlayerAnimationState): void {
    this.changeAnimationState(state);
  }

  // ==========================================================================
  // VISUAL EFFECTS
  // ==========================================================================

  /**
   * Draw shadow under player
   */
  private drawShadow(): void {
    this.shadowGraphics.clear();
    this.shadowGraphics.beginFill(0x000000, 0.3);
    this.shadowGraphics.drawEllipse(0, SHADOW_OFFSET_Y, 12, 6);
    this.shadowGraphics.endFill();
  }

  /**
   * Update shield indicator
   */
  private updateShieldIndicator(): void {
    if (this.data.hasShield) {
      if (!this.shieldIndicator) {
        this.shieldIndicator = new Graphics();
        this.shieldIndicator.zIndex = 3;
        this.container.addChild(this.shieldIndicator);
      }

      // Draw shield circle
      this.shieldIndicator.clear();
      this.shieldIndicator.lineStyle(2, 0x00ffff, 0.8);
      this.shieldIndicator.drawCircle(0, -8, 18);
    } else if (this.shieldIndicator) {
      this.container.removeChild(this.shieldIndicator);
      this.shieldIndicator.destroy();
      this.shieldIndicator = null;
    }
  }

  /**
   * Update skull effect indicator
   */
  private updateSkullIndicator(): void {
    if (this.data.skullEffect) {
      if (!this.skullIndicator) {
        this.skullIndicator = new Graphics();
        this.skullIndicator.zIndex = 3;
        this.container.addChild(this.skullIndicator);
      }

      // Draw skull icon above player
      this.skullIndicator.clear();
      this.skullIndicator.beginFill(0xff00ff, 0.8);
      this.skullIndicator.drawRect(-6, -32, 12, 12);
      this.skullIndicator.endFill();
    } else if (this.skullIndicator) {
      this.container.removeChild(this.skullIndicator);
      this.skullIndicator.destroy();
      this.skullIndicator = null;
    }
  }

  /**
   * Show invincibility effect
   */
  showInvincibility(duration: number): void {
    this.invincibilityTimer = duration;
  }

  /**
   * Flash player with color (e.g., when hit)
   */
  flash(color: number, duration: number = 200): void {
    // Store original tint
    const originalTint = this.sprite.tint;

    // Apply flash color
    this.sprite.tint = color;

    // Reset after duration
    setTimeout(() => {
      this.sprite.tint = originalTint;
    }, duration);
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get id(): string {
    return this.data.id;
  }

  get position(): Position {
    return this.data.position;
  }

  get isAlive(): boolean {
    return this.data.isAlive;
  }

  get playerData(): PlayerData {
    return { ...this.data };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy player entity and cleanup
   */
  destroy(): void {
    // Remove all indicators
    if (this.shieldIndicator) {
      this.shieldIndicator.destroy();
      this.shieldIndicator = null;
    }
    if (this.skullIndicator) {
      this.skullIndicator.destroy();
      this.skullIndicator = null;
    }

    // Destroy children
    this.shadowGraphics.destroy();
    this.sprite.destroy();
    this.nameText.destroy();

    // Destroy container
    this.container.destroy({ children: true });
  }
}
