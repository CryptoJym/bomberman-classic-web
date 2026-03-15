/**
 * Bomb Entity for Bomberman Game
 * Manages bomb state, countdown animation, and rendering
 */

import { Container, Sprite, Graphics, Text } from 'pixi.js';
import type { Bomb as BombData, Position, Direction } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

const WOBBLE_SPEED = 8; // Wobble animation speed
const WOBBLE_AMOUNT = 2; // Pixels to wobble
const FUSE_BLINK_SPEED = 300; // ms per blink (speeds up as countdown progresses)
const SHADOW_OFFSET_Y = 4;

// ============================================================================
// BOMB ENTITY CLASS
// ============================================================================

/**
 * Bomb entity with countdown and wobble animation
 */
export class BombEntity {
  // Container and sprites
  public container: Container;
  private sprite: Sprite;
  private fuseGraphics: Graphics;
  private shadowGraphics: Graphics;
  private timerText: Text | null = null;

  // Bomb data
  private data: BombData;

  // Animation state
  private wobbleTimer = 0;
  private fuseBlinkTimer = 0;
  private isFuseLit = true;

  // Movement (for kicked/punched bombs)
  private movementSpeed = 4; // tiles per second
  // private targetPosition: Position | null = null; // For future kick/punch feature

  constructor(bombData: BombData) {
    this.data = { ...bombData };

    // Create container
    this.container = new Container();
    this.container.sortableChildren = true;

    // Create shadow
    this.shadowGraphics = new Graphics();
    this.drawShadow();
    this.shadowGraphics.zIndex = 0;
    this.container.addChild(this.shadowGraphics);

    // Create bomb sprite
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.zIndex = 1;
    this.container.addChild(this.sprite);

    // Create fuse indicator
    this.fuseGraphics = new Graphics();
    this.fuseGraphics.zIndex = 2;
    this.container.addChild(this.fuseGraphics);

    // Create timer text (optional, for debugging)
    if (process.env.NODE_ENV === 'development') {
      this.timerText = new Text({
        text: '',
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 2 },
        },
      });
      this.timerText.anchor.set(0.5);
      this.timerText.y = -20;
      this.timerText.zIndex = 3;
      this.container.addChild(this.timerText);
    }

    // Position container
    this.updatePosition();
  }

  // ==========================================================================
  // UPDATE METHODS
  // ==========================================================================

  /**
   * Update bomb entity
   */
  update(deltaMs: number): void {
    // Update wobble animation
    this.updateWobble(deltaMs);

    // Update fuse blink
    this.updateFuse(deltaMs);

    // Update movement (if kicked/punched)
    if (this.data.state === 'moving' && this.data.moveDirection) {
      this.updateMovement(deltaMs);
    }

    // Update timer text
    if (this.timerText) {
      const remaining = Math.max(0, this.data.fuseTime / 1000);
      this.timerText.text = remaining.toFixed(1);
    }

    // Update position
    this.updatePosition();
  }

  /**
   * Update from server data
   */
  updateFromServer(bombData: Partial<BombData>): void {
    // Merge with existing data
    this.data = { ...this.data, ...bombData };

    // Update position
    if (bombData.position) {
      this.updatePosition();
    }

    // Update state
    if (bombData.state === 'exploding') {
      this.startExplodingAnimation();
    }
  }

  /**
   * Update wobble animation
   */
  private updateWobble(deltaMs: number): void {
    this.wobbleTimer += deltaMs * 0.001 * WOBBLE_SPEED;

    // Calculate wobble offset
    const wobbleX = Math.sin(this.wobbleTimer) * WOBBLE_AMOUNT;
    const wobbleY = Math.cos(this.wobbleTimer * 1.5) * (WOBBLE_AMOUNT * 0.5);

    this.sprite.x = wobbleX;
    this.sprite.y = wobbleY;
  }

  /**
   * Update fuse blink animation
   */
  private updateFuse(deltaMs: number): void {
    const timeElapsed = GAME_CONSTANTS.BOMB_FUSE_TIME - this.data.fuseTime;
    const urgency = timeElapsed / GAME_CONSTANTS.BOMB_FUSE_TIME;

    // Blink faster as time runs out
    const blinkSpeed = FUSE_BLINK_SPEED * (1 - urgency * 0.7);

    this.fuseBlinkTimer += deltaMs;
    if (this.fuseBlinkTimer >= blinkSpeed) {
      this.fuseBlinkTimer = 0;
      this.isFuseLit = !this.isFuseLit;
    }

    // Draw fuse indicator
    this.drawFuse();
  }

  /**
   * Update movement for kicked/punched bombs
   */
  private updateMovement(deltaMs: number): void {
    if (!this.data.moveDirection) return;

    const delta = deltaMs * 0.001; // Convert to seconds
    const moveAmount = this.movementSpeed * delta;

    // Calculate direction vector
    let dx = 0;
    let dy = 0;
    switch (this.data.moveDirection) {
      case 'up':
        dy = -moveAmount;
        break;
      case 'down':
        dy = moveAmount;
        break;
      case 'left':
        dx = -moveAmount;
        break;
      case 'right':
        dx = moveAmount;
        break;
    }

    // Update position
    this.data.position.x += dx;
    this.data.position.y += dy;
  }

  // ==========================================================================
  // POSITION METHODS
  // ==========================================================================

  /**
   * Update container position from bomb data
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
  // VISUAL METHODS
  // ==========================================================================

  /**
   * Draw shadow under bomb
   */
  private drawShadow(): void {
    this.shadowGraphics.clear();
    this.shadowGraphics.beginFill(0x000000, 0.3);
    this.shadowGraphics.drawEllipse(0, SHADOW_OFFSET_Y, 10, 5);
    this.shadowGraphics.endFill();
  }

  /**
   * Draw fuse indicator
   */
  private drawFuse(): void {
    this.fuseGraphics.clear();

    if (this.isFuseLit) {
      // Draw lit fuse (spark)
      const timeElapsed = GAME_CONSTANTS.BOMB_FUSE_TIME - this.data.fuseTime;
      const urgency = timeElapsed / GAME_CONSTANTS.BOMB_FUSE_TIME;

      // Color transitions from yellow to red
      const r = 255;
      const g = Math.floor(255 * (1 - urgency));
      const b = 0;
      const color = (r << 16) | (g << 8) | b;

      // Spark grows as urgency increases
      const sparkSize = 3 + urgency * 4;

      this.fuseGraphics.beginFill(color, 1);
      this.fuseGraphics.drawCircle(0, -12, sparkSize);
      this.fuseGraphics.endFill();

      // Outer glow
      this.fuseGraphics.beginFill(color, 0.3);
      this.fuseGraphics.drawCircle(0, -12, sparkSize + 3);
      this.fuseGraphics.endFill();
    }
  }

  /**
   * Start exploding animation
   */
  private startExplodingAnimation(): void {
    // Scale up slightly
    this.sprite.scale.set(1.2);

    // Bright flash
    this.sprite.tint = 0xffffff;

    // This bomb will be removed shortly by the game engine
  }

  /**
   * Set kicked/punched state
   */
  setMoving(direction: Direction): void {
    this.data.state = 'moving';
    this.data.moveDirection = direction;
  }

  /**
   * Stop movement
   */
  stopMoving(): void {
    this.data.state = 'planted';
    this.data.moveDirection = undefined;
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

  get ownerId(): string {
    return this.data.ownerId;
  }

  get bombData(): BombData {
    return { ...this.data };
  }

  get isExploding(): boolean {
    return this.data.state === 'exploding';
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy bomb entity and cleanup
   */
  destroy(): void {
    // Destroy all graphics
    this.shadowGraphics.destroy();
    this.sprite.destroy();
    this.fuseGraphics.destroy();

    if (this.timerText) {
      this.timerText.destroy();
    }

    // Destroy container
    this.container.destroy({ children: true });
  }
}
