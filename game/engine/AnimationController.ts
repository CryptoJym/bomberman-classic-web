/**
 * Animation Controller for Bomberman Online
 * Manages sprite animations, frame timing, and transitions
 */

import type { Sprite, Texture } from 'pixi.js';

// ============================================================================
// Types
// ============================================================================

export interface AnimationConfig {
  frames: number[];
  frameRate: number;
  loop: boolean;
  onComplete?: () => void;
}

export interface ActiveAnimation {
  sprite: Sprite;
  config: AnimationConfig;
  currentFrame: number;
  elapsedTime: number;
  playing: boolean;
  textures: Texture[];
}

export interface AnimationDefinition {
  name: string;
  frames: number[];
  frameRate: number;
  loop: boolean;
}

type AnimationCallback = (animationId: string) => void;

// ============================================================================
// Animation Controller Class
// ============================================================================

/**
 * Manages all sprite animations in the game
 * Handles frame timing, transitions, and callbacks
 */
export class AnimationController {
  // Active animations mapped by ID
  private animations: Map<string, ActiveAnimation> = new Map();

  // Animation definitions (templates)
  private definitions: Map<string, AnimationDefinition> = new Map();

  // Frame textures cache
  private textureCache: Map<string, Texture[]> = new Map();

  // Callbacks
  private onCompleteCallbacks: Map<string, AnimationCallback[]> = new Map();

  // Global animation speed multiplier
  private speedMultiplier = 1;

  // Paused state
  private paused = false;

  constructor() {
    this.registerDefaultAnimations();
  }

  // ==========================================================================
  // Animation Registration
  // ==========================================================================

  /**
   * Register default animation definitions
   */
  private registerDefaultAnimations(): void {
    // Character animations
    this.defineAnimation('player_idle_down', [0, 1, 2, 3], 8, true);
    this.defineAnimation('player_idle_up', [4, 5, 6, 7], 8, true);
    this.defineAnimation('player_idle_left', [8, 9, 10, 11], 8, true);
    this.defineAnimation('player_idle_right', [12, 13, 14, 15], 8, true);
    this.defineAnimation('player_walk_down', [0, 1, 2, 3], 12, true);
    this.defineAnimation('player_walk_up', [4, 5, 6, 7], 12, true);
    this.defineAnimation('player_walk_left', [8, 9, 10, 11], 12, true);
    this.defineAnimation('player_walk_right', [12, 13, 14, 15], 12, true);
    this.defineAnimation('player_death', [0, 1, 2, 3, 4, 5], 10, false);
    this.defineAnimation('player_victory', [8, 9, 10, 11], 6, true);

    // Bomb animations
    this.defineAnimation('bomb_idle', [0, 1, 2], 4, true);
    this.defineAnimation('bomb_about_to_explode', [0, 1, 2], 12, true);

    // Explosion animations
    this.defineAnimation('explosion_center', [0, 1, 2, 3], 15, false);
    this.defineAnimation('explosion_horizontal', [4, 5, 6, 7], 15, false);
    this.defineAnimation('explosion_vertical', [8, 9, 10, 11], 15, false);
    this.defineAnimation('explosion_end', [12, 13, 14, 15], 15, false);

    // Powerup animations
    this.defineAnimation('powerup_glow', [0, 1], 4, true);
    this.defineAnimation('powerup_collect', [0, 1, 2, 3], 20, false);

    // Effect animations
    this.defineAnimation('spawn', [0, 1, 2, 3], 15, false);
    this.defineAnimation('dust', [0, 1, 2, 3], 20, false);
    this.defineAnimation('shield_hit', [0, 1, 2], 15, false);
  }

  /**
   * Define a reusable animation
   */
  defineAnimation(
    name: string,
    frames: number[],
    frameRate: number,
    loop: boolean
  ): void {
    this.definitions.set(name, {
      name,
      frames,
      frameRate,
      loop,
    });
  }

  /**
   * Register a sprite for animation
   */
  register(
    id: string,
    sprite: Sprite,
    config: AnimationConfig,
    textures?: Texture[]
  ): void {
    // Store textures if provided
    if (textures) {
      this.textureCache.set(id, textures);
    }

    const animation: ActiveAnimation = {
      sprite,
      config,
      currentFrame: 0,
      elapsedTime: 0,
      playing: false,
      textures: textures || this.textureCache.get(id) || [],
    };

    this.animations.set(id, animation);
  }

  /**
   * Register a sprite with a predefined animation
   */
  registerWithDefinition(
    id: string,
    sprite: Sprite,
    definitionName: string,
    textures: Texture[]
  ): void {
    const definition = this.definitions.get(definitionName);
    if (!definition) {
      console.warn(`Animation definition '${definitionName}' not found`);
      return;
    }

    this.register(
      id,
      sprite,
      {
        frames: definition.frames,
        frameRate: definition.frameRate,
        loop: definition.loop,
      },
      textures
    );
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Play an animation
   */
  play(id: string, fromStart: boolean = true): void {
    const animation = this.animations.get(id);
    if (!animation) return;

    if (fromStart) {
      animation.currentFrame = 0;
      animation.elapsedTime = 0;
    }

    animation.playing = true;
    this.updateSpriteTexture(animation);
  }

  /**
   * Play an animation by definition name
   */
  playDefinition(id: string, definitionName: string): void {
    const animation = this.animations.get(id);
    const definition = this.definitions.get(definitionName);

    if (!animation || !definition) return;

    // Update config from definition
    animation.config = {
      frames: definition.frames,
      frameRate: definition.frameRate,
      loop: definition.loop,
      onComplete: animation.config.onComplete,
    };

    animation.currentFrame = 0;
    animation.elapsedTime = 0;
    animation.playing = true;
    this.updateSpriteTexture(animation);
  }

  /**
   * Stop an animation
   */
  stop(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = false;
    }
  }

  /**
   * Pause an animation
   */
  pause(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = false;
    }
  }

  /**
   * Resume a paused animation
   */
  resume(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = true;
    }
  }

  /**
   * Reset an animation to the first frame
   */
  reset(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.currentFrame = 0;
      animation.elapsedTime = 0;
      this.updateSpriteTexture(animation);
    }
  }

  /**
   * Set a specific frame
   */
  setFrame(id: string, frameIndex: number): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.currentFrame = Math.max(
        0,
        Math.min(frameIndex, animation.config.frames.length - 1)
      );
      this.updateSpriteTexture(animation);
    }
  }

  // ==========================================================================
  // Global Controls
  // ==========================================================================

  /**
   * Pause all animations
   */
  pauseAll(): void {
    this.paused = true;
  }

  /**
   * Resume all animations
   */
  resumeAll(): void {
    this.paused = false;
  }

  /**
   * Set global animation speed multiplier
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(5, multiplier));
  }

  /**
   * Get global animation speed multiplier
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  // ==========================================================================
  // Update Loop
  // ==========================================================================

  /**
   * Update all animations (called each frame)
   */
  update(deltaTime: number): void {
    if (this.paused) return;

    const adjustedDelta = deltaTime * this.speedMultiplier;

    for (const [id, animation] of this.animations) {
      if (!animation.playing) continue;

      // Calculate frame duration
      const frameDuration = 1000 / animation.config.frameRate;

      // Accumulate time
      animation.elapsedTime += adjustedDelta;

      // Check if we need to advance frame
      if (animation.elapsedTime >= frameDuration) {
        const framesToAdvance = Math.floor(animation.elapsedTime / frameDuration);
        animation.elapsedTime %= frameDuration;

        // Advance frame(s)
        animation.currentFrame += framesToAdvance;

        // Handle loop/completion
        if (animation.currentFrame >= animation.config.frames.length) {
          if (animation.config.loop) {
            animation.currentFrame %= animation.config.frames.length;
          } else {
            animation.currentFrame = animation.config.frames.length - 1;
            animation.playing = false;

            // Trigger completion callback
            animation.config.onComplete?.();
            this.triggerOnComplete(id);
          }
        }

        // Update sprite texture
        this.updateSpriteTexture(animation);
      }
    }
  }

  /**
   * Update sprite texture based on current frame
   */
  private updateSpriteTexture(animation: ActiveAnimation): void {
    const frameIndex = animation.config.frames[animation.currentFrame];

    if (frameIndex !== undefined && animation.textures[frameIndex]) {
      animation.sprite.texture = animation.textures[frameIndex];
    }
  }

  // ==========================================================================
  // Callbacks
  // ==========================================================================

  /**
   * Register a callback for animation completion
   */
  onComplete(id: string, callback: AnimationCallback): void {
    const callbacks = this.onCompleteCallbacks.get(id) || [];
    callbacks.push(callback);
    this.onCompleteCallbacks.set(id, callbacks);
  }

  /**
   * Trigger completion callbacks
   */
  private triggerOnComplete(id: string): void {
    const callbacks = this.onCompleteCallbacks.get(id);
    if (callbacks) {
      callbacks.forEach((callback) => callback(id));
    }
  }

  /**
   * Remove completion callback
   */
  removeOnComplete(id: string, callback?: AnimationCallback): void {
    if (!callback) {
      this.onCompleteCallbacks.delete(id);
    } else {
      const callbacks = this.onCompleteCallbacks.get(id);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Check if an animation is playing
   */
  isPlaying(id: string): boolean {
    return this.animations.get(id)?.playing ?? false;
  }

  /**
   * Get current frame index
   */
  getCurrentFrame(id: string): number {
    return this.animations.get(id)?.currentFrame ?? 0;
  }

  /**
   * Get animation progress (0-1)
   */
  getProgress(id: string): number {
    const animation = this.animations.get(id);
    if (!animation) return 0;
    return animation.currentFrame / (animation.config.frames.length - 1);
  }

  /**
   * Check if animation exists
   */
  has(id: string): boolean {
    return this.animations.has(id);
  }

  /**
   * Get all animation IDs
   */
  getAnimationIds(): string[] {
    return Array.from(this.animations.keys());
  }

  // ==========================================================================
  // Texture Management
  // ==========================================================================

  /**
   * Update textures for an animation
   */
  setTextures(id: string, textures: Texture[]): void {
    this.textureCache.set(id, textures);

    const animation = this.animations.get(id);
    if (animation) {
      animation.textures = textures;
      this.updateSpriteTexture(animation);
    }
  }

  /**
   * Get textures for an animation
   */
  getTextures(id: string): Texture[] | undefined {
    return this.textureCache.get(id);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Remove an animation registration
   */
  unregister(id: string): void {
    this.animations.delete(id);
    this.textureCache.delete(id);
    this.onCompleteCallbacks.delete(id);
  }

  /**
   * Remove all animations for a specific type prefix
   */
  unregisterByPrefix(prefix: string): void {
    for (const id of this.animations.keys()) {
      if (id.startsWith(prefix)) {
        this.unregister(id);
      }
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.animations.clear();
    this.textureCache.clear();
    this.onCompleteCallbacks.clear();
    this.definitions.clear();
  }
}
