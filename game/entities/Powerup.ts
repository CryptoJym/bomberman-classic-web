/**
 * Powerup Entity for Bomberman Game
 * Manages powerup rendering with bobbing animation
 */

import { Container, Sprite, Graphics } from 'pixi.js';
import type { Powerup as PowerupData, Position, PowerupType } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

const BOB_SPEED = 3; // Bobbing animation speed
const BOB_AMOUNT = 4; // Pixels to bob up and down
const SPIN_SPEED = 2; // Rotation speed for some powerups
const GLOW_PULSE_SPEED = 2; // Glow animation speed
const SHADOW_OFFSET_Y = 4;

// Powerup colors for visual identification
const POWERUP_COLORS: Record<PowerupType, number> = {
  bomb_up: 0xff4444,
  fire_up: 0xff8800,
  speed_up: 0x44ff44,
  kick: 0x4444ff,
  punch: 0xff44ff,
  shield: 0x00ffff,
  skull: 0x8800ff,
};

// ============================================================================
// POWERUP ENTITY CLASS
// ============================================================================

/**
 * Powerup entity with bobbing and glow animations
 */
export class PowerupEntity {
  // Container and sprites
  public container: Container;
  private sprite: Sprite;
  private glowGraphics: Graphics;
  private shadowGraphics: Graphics;

  // Powerup data
  private data: PowerupData;

  // Animation state
  private bobTimer = 0;
  private spinTimer = 0;
  private glowTimer = 0;
  private baseY = 0;

  constructor(powerupData: PowerupData) {
    this.data = { ...powerupData };

    // Create container
    this.container = new Container();
    this.container.sortableChildren = true;

    // Create shadow
    this.shadowGraphics = new Graphics();
    this.drawShadow();
    this.shadowGraphics.zIndex = 0;
    this.container.addChild(this.shadowGraphics);

    // Create glow effect
    this.glowGraphics = new Graphics();
    this.glowGraphics.zIndex = 1;
    this.container.addChild(this.glowGraphics);

    // Create powerup sprite
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.zIndex = 2;
    this.container.addChild(this.sprite);

    // Position container
    this.updatePosition();
    this.baseY = this.sprite.y;
  }

  // ==========================================================================
  // UPDATE METHODS
  // ==========================================================================

  /**
   * Update powerup entity
   */
  update(deltaMs: number): void {
    const delta = deltaMs * 0.001; // Convert to seconds

    // Update bobbing animation
    this.updateBobbing(delta);

    // Update spin (for certain powerups)
    if (this.shouldSpin()) {
      this.updateSpin(delta);
    }

    // Update glow effect
    this.updateGlow(delta);
  }

  /**
   * Update from server data
   */
  updateFromServer(powerupData: Partial<PowerupData>): void {
    // Merge with existing data
    this.data = { ...this.data, ...powerupData };

    // Update position if changed
    if (powerupData.position) {
      this.updatePosition();
    }
  }

  /**
   * Update bobbing animation
   */
  private updateBobbing(delta: number): void {
    this.bobTimer += delta * BOB_SPEED;

    // Calculate bob offset
    const bobOffset = Math.sin(this.bobTimer) * BOB_AMOUNT;
    this.sprite.y = this.baseY + bobOffset;
  }

  /**
   * Update spin animation
   */
  private updateSpin(delta: number): void {
    this.spinTimer += delta * SPIN_SPEED;
    this.sprite.rotation = this.spinTimer;
  }

  /**
   * Update glow pulse animation
   */
  private updateGlow(delta: number): void {
    this.glowTimer += delta * GLOW_PULSE_SPEED;

    // Calculate glow intensity
    const intensity = 0.5 + Math.sin(this.glowTimer) * 0.3;

    // Draw glow
    this.drawGlow(intensity);
  }

  // ==========================================================================
  // POSITION METHODS
  // ==========================================================================

  /**
   * Update container position from powerup data
   */
  private updatePosition(): void {
    const pixelX = this.data.position.x * GAME_CONSTANTS.TILE_SIZE;
    const pixelY = this.data.position.y * GAME_CONSTANTS.TILE_SIZE;

    this.container.x = pixelX;
    this.container.y = pixelY;
  }

  // ==========================================================================
  // VISUAL METHODS
  // ==========================================================================

  /**
   * Draw shadow under powerup
   */
  private drawShadow(): void {
    this.shadowGraphics.clear();
    this.shadowGraphics.beginFill(0x000000, 0.3);
    this.shadowGraphics.drawEllipse(0, SHADOW_OFFSET_Y, 8, 4);
    this.shadowGraphics.endFill();
  }

  /**
   * Draw glow effect
   */
  private drawGlow(intensity: number): void {
    const color = POWERUP_COLORS[this.data.type];

    this.glowGraphics.clear();

    // Outer glow
    this.glowGraphics.beginFill(color, intensity * 0.2);
    this.glowGraphics.drawCircle(0, 0, 20);
    this.glowGraphics.endFill();

    // Inner glow
    this.glowGraphics.beginFill(color, intensity * 0.4);
    this.glowGraphics.drawCircle(0, 0, 12);
    this.glowGraphics.endFill();
  }

  /**
   * Check if powerup should spin
   */
  private shouldSpin(): boolean {
    // Skull and special powerups spin
    return this.data.type === 'skull' || this.data.type === 'shield';
  }

  /**
   * Play collection animation
   */
  playCollectionAnimation(): void {
    // Scale up and fade out
    const startScale = this.sprite.scale.x;
    const startAlpha = this.sprite.alpha;

    const duration = 300; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.sprite.scale.set(startScale + easeProgress * 0.5);
      this.sprite.alpha = startAlpha * (1 - easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get id(): string {
    return this.data.id;
  }

  get type(): PowerupType {
    return this.data.type;
  }

  get position(): Position {
    return this.data.position;
  }

  get powerupData(): PowerupData {
    return { ...this.data };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy powerup entity and cleanup
   */
  destroy(): void {
    // Destroy all graphics
    this.shadowGraphics.destroy();
    this.glowGraphics.destroy();
    this.sprite.destroy();

    // Destroy container
    this.container.destroy({ children: true });
  }
}
