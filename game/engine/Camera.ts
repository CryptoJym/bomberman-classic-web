/**
 * Camera System for Bomberman Online
 * Handles viewport management, smooth following, camera shake, and boundaries
 */

import type { Container } from 'pixi.js';

// ============================================================================
// Types
// ============================================================================

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  smoothing: number;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface ShakeState {
  intensity: number;
  duration: number;
  elapsed: number;
  offsetX: number;
  offsetY: number;
}

interface ZoomState {
  current: number;
  target: number;
  speed: number;
}

// ============================================================================
// Camera Class
// ============================================================================

/**
 * Camera system for viewport management
 * Supports smooth following, shake effects, zoom, and boundary clamping
 */
export class Camera {
  private container: Container;
  private config: CameraConfig;

  // Camera position (center of viewport)
  private x: number = 0;
  private y: number = 0;

  // Target position for smooth following
  private targetX: number = 0;
  private targetY: number = 0;

  // Shake effect state
  private shake: ShakeState = {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offsetX: 0,
    offsetY: 0,
  };

  // Zoom state
  private zoom: ZoomState = {
    current: 1,
    target: 1,
    speed: 0.1,
  };

  // Boundary constraints
  private boundaryEnabled = true;
  private padding = 0;

  // Deadzone (area where camera doesn't follow)
  private deadzoneWidth = 0;
  private deadzoneHeight = 0;

  // Flash effect
  private flashAlpha = 0;
  private flashDuration = 0;
  private flashElapsed = 0;
  private flashColor = 0xffffff;

  constructor(container: Container, config: CameraConfig) {
    this.container = container;
    this.config = config;

    // Center camera initially
    this.x = config.worldWidth / 2;
    this.y = config.worldHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  // ==========================================================================
  // Position Control
  // ==========================================================================

  /**
   * Set the camera position instantly
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.updateContainer();
  }

  /**
   * Get the current camera position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Move camera to follow a target smoothly
   */
  follow(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Set camera to follow multiple targets (center point)
   */
  followMultiple(targets: Array<{ x: number; y: number }>): void {
    if (targets.length === 0) return;

    let sumX = 0;
    let sumY = 0;

    for (const target of targets) {
      sumX += target.x;
      sumY += target.y;
    }

    this.targetX = sumX / targets.length;
    this.targetY = sumY / targets.length;
  }

  /**
   * Center camera on the world
   */
  centerOnWorld(): void {
    this.setPosition(this.config.worldWidth / 2, this.config.worldHeight / 2);
  }

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Trigger camera shake effect
   */
  startShake(intensity: number, duration: number): void {
    // Don't override stronger shake
    if (this.shake.intensity > intensity && this.shake.elapsed < this.shake.duration) {
      return;
    }

    this.shake = {
      intensity,
      duration,
      elapsed: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  /**
   * Stop camera shake immediately
   */
  stopShake(): void {
    this.shake = {
      intensity: 0,
      duration: 0,
      elapsed: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  /**
   * Trigger screen flash effect
   */
  flash(color: number = 0xffffff, duration: number = 100): void {
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashElapsed = 0;
    this.flashAlpha = 1;
  }

  /**
   * Set zoom level
   */
  setZoom(level: number, instant: boolean = false): void {
    this.zoom.target = Math.max(0.5, Math.min(2, level));
    if (instant) {
      this.zoom.current = this.zoom.target;
    }
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.zoom.current;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set smoothing factor (0 = instant, 1 = no movement)
   */
  setSmoothing(smoothing: number): void {
    this.config.smoothing = Math.max(0, Math.min(1, smoothing));
  }

  /**
   * Set deadzone size (area where target can move without camera following)
   */
  setDeadzone(width: number, height: number): void {
    this.deadzoneWidth = width;
    this.deadzoneHeight = height;
  }

  /**
   * Enable or disable boundary clamping
   */
  setBoundaryEnabled(enabled: boolean): void {
    this.boundaryEnabled = enabled;
  }

  /**
   * Set boundary padding
   */
  setBoundaryPadding(padding: number): void {
    this.padding = padding;
  }

  /**
   * Update world dimensions (for map changes)
   */
  setWorldSize(width: number, height: number): void {
    this.config.worldWidth = width;
    this.config.worldHeight = height;
  }

  /**
   * Update viewport dimensions (for window resize)
   */
  setViewportSize(width: number, height: number): void {
    this.config.viewportWidth = width;
    this.config.viewportHeight = height;
  }

  // ==========================================================================
  // Update Loop
  // ==========================================================================

  /**
   * Update camera position (called each frame)
   */
  update(deltaTime: number): void {
    // Update shake effect
    this.updateShake(deltaTime);

    // Update flash effect
    this.updateFlash(deltaTime);

    // Update zoom
    this.updateZoom(deltaTime);

    // Apply deadzone
    let targetX = this.targetX;
    let targetY = this.targetY;

    if (this.deadzoneWidth > 0 || this.deadzoneHeight > 0) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;

      if (Math.abs(dx) < this.deadzoneWidth / 2) {
        targetX = this.x;
      } else {
        targetX = this.x + (dx - Math.sign(dx) * this.deadzoneWidth / 2);
      }

      if (Math.abs(dy) < this.deadzoneHeight / 2) {
        targetY = this.y;
      } else {
        targetY = this.y + (dy - Math.sign(dy) * this.deadzoneHeight / 2);
      }
    }

    // Smooth camera movement
    const { smoothing } = this.config;
    const factor = 1 - Math.pow(1 - smoothing, deltaTime / 16.67);

    this.x += (targetX - this.x) * factor;
    this.y += (targetY - this.y) * factor;

    // Clamp to boundaries
    if (this.boundaryEnabled) {
      this.clampToBoundaries();
    }

    // Update container position
    this.updateContainer();
  }

  /**
   * Update shake effect
   */
  private updateShake(deltaTime: number): void {
    if (this.shake.duration <= 0) return;

    this.shake.elapsed += deltaTime;

    if (this.shake.elapsed >= this.shake.duration) {
      this.stopShake();
      return;
    }

    // Calculate intensity falloff
    const progress = this.shake.elapsed / this.shake.duration;
    const currentIntensity = this.shake.intensity * (1 - progress);

    // Random shake offset
    this.shake.offsetX = (Math.random() * 2 - 1) * currentIntensity;
    this.shake.offsetY = (Math.random() * 2 - 1) * currentIntensity;
  }

  /**
   * Update flash effect
   */
  private updateFlash(deltaTime: number): void {
    if (this.flashDuration <= 0) return;

    this.flashElapsed += deltaTime;

    if (this.flashElapsed >= this.flashDuration) {
      this.flashAlpha = 0;
      this.flashDuration = 0;
    } else {
      // Fade out
      this.flashAlpha = 1 - (this.flashElapsed / this.flashDuration);
    }
  }

  /**
   * Update zoom level
   */
  private updateZoom(deltaTime: number): void {
    if (Math.abs(this.zoom.current - this.zoom.target) < 0.001) {
      this.zoom.current = this.zoom.target;
      return;
    }

    const factor = this.zoom.speed * (deltaTime / 16.67);
    this.zoom.current += (this.zoom.target - this.zoom.current) * factor;
  }

  /**
   * Clamp camera position to world boundaries
   */
  private clampToBoundaries(): void {
    const { viewportWidth, viewportHeight, worldWidth, worldHeight } = this.config;
    const halfViewW = viewportWidth / 2 / this.zoom.current;
    const halfViewH = viewportHeight / 2 / this.zoom.current;

    // Calculate min/max positions
    const minX = halfViewW + this.padding;
    const maxX = worldWidth - halfViewW - this.padding;
    const minY = halfViewH + this.padding;
    const maxY = worldHeight - halfViewH - this.padding;

    // If world is smaller than viewport, center it
    if (minX >= maxX) {
      this.x = worldWidth / 2;
    } else {
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }

    if (minY >= maxY) {
      this.y = worldHeight / 2;
    } else {
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  /**
   * Update the container position based on camera
   */
  private updateContainer(): void {
    const { viewportWidth, viewportHeight } = this.config;

    // Apply zoom
    this.container.scale.set(this.zoom.current);

    // Center the camera on the target (accounting for zoom)
    const offsetX = viewportWidth / 2 - this.x * this.zoom.current;
    const offsetY = viewportHeight / 2 - this.y * this.zoom.current;

    // Apply shake offset
    this.container.x = Math.round(offsetX + this.shake.offsetX);
    this.container.y = Math.round(offsetY + this.shake.offsetY);
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get camera bounds (visible area in world coordinates)
   */
  getBounds(): CameraBounds {
    const { viewportWidth, viewportHeight } = this.config;
    const halfW = viewportWidth / 2 / this.zoom.current;
    const halfH = viewportHeight / 2 / this.zoom.current;

    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    };
  }

  /**
   * Check if a point is visible in the viewport
   */
  isPointVisible(x: number, y: number): boolean {
    const bounds = this.getBounds();
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }

  /**
   * Check if a rectangle is visible in the viewport
   */
  isRectVisible(x: number, y: number, width: number, height: number): boolean {
    const bounds = this.getBounds();
    return (
      x + width >= bounds.minX &&
      x <= bounds.maxX &&
      y + height >= bounds.minY &&
      y <= bounds.maxY
    );
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const { viewportWidth, viewportHeight } = this.config;
    return {
      x: (screenX - viewportWidth / 2) / this.zoom.current + this.x,
      y: (screenY - viewportHeight / 2) / this.zoom.current + this.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const { viewportWidth, viewportHeight } = this.config;
    return {
      x: (worldX - this.x) * this.zoom.current + viewportWidth / 2,
      y: (worldY - this.y) * this.zoom.current + viewportHeight / 2,
    };
  }

  /**
   * Get flash state for rendering
   */
  getFlashState(): { alpha: number; color: number } {
    return {
      alpha: this.flashAlpha,
      color: this.flashColor,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopShake();
    this.flashAlpha = 0;
    this.flashDuration = 0;
  }
}
