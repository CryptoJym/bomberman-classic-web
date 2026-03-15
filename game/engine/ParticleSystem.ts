/**
 * Particle System for Bomberman Online
 * Handles visual effects like explosions, debris, power-up collection, and ambient particles
 */

import type { Container, Graphics } from 'pixi.js';

// ============================================================================
// Types
// ============================================================================

export interface ParticleConfig {
  count: number;
  lifetime: number;
  speed: number;
  gravity: number;
  color: number;
  size: number;
  fadeOut: boolean;
  spread?: number;
  direction?: number;
  sizeDecay?: number;
  friction?: number;
  rotation?: number;
  rotationSpeed?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  color: number;
  size: number;
  initialSize: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  friction: number;
  sizeDecay: number;
  fadeOut: boolean;
  graphics: Graphics | null;
}

export interface EmitterConfig {
  x: number;
  y: number;
  particleConfig: ParticleConfig;
  emitRate: number;
  duration: number;
  continuous: boolean;
}

interface ActiveEmitter {
  config: EmitterConfig;
  elapsed: number;
  lastEmit: number;
}

// ============================================================================
// Preset Configurations
// ============================================================================

const PARTICLE_PRESETS: Record<string, ParticleConfig> = {
  explosion: {
    count: 20,
    lifetime: 500,
    speed: 200,
    gravity: 100,
    color: 0xff6600,
    size: 6,
    fadeOut: true,
    spread: Math.PI * 2,
    sizeDecay: 0.95,
    friction: 0.98,
  },
  blockDebris: {
    count: 8,
    lifetime: 600,
    speed: 150,
    gravity: 400,
    color: 0x8b4513,
    size: 4,
    fadeOut: true,
    spread: Math.PI * 0.5,
    direction: -Math.PI / 2,
    friction: 0.95,
  },
  powerupCollect: {
    count: 12,
    lifetime: 400,
    speed: 100,
    gravity: -50,
    color: 0xffff00,
    size: 4,
    fadeOut: true,
    spread: Math.PI * 2,
    sizeDecay: 0.9,
  },
  playerDeath: {
    count: 30,
    lifetime: 800,
    speed: 180,
    gravity: 200,
    color: 0xff0000,
    size: 5,
    fadeOut: true,
    spread: Math.PI * 2,
    friction: 0.97,
  },
  dust: {
    count: 6,
    lifetime: 300,
    speed: 30,
    gravity: -20,
    color: 0xaaaaaa,
    size: 3,
    fadeOut: true,
    spread: Math.PI,
    direction: -Math.PI / 2,
  },
  sparkle: {
    count: 4,
    lifetime: 200,
    speed: 50,
    gravity: 0,
    color: 0xffffff,
    size: 2,
    fadeOut: true,
    spread: Math.PI * 2,
  },
  smoke: {
    count: 3,
    lifetime: 1000,
    speed: 20,
    gravity: -30,
    color: 0x666666,
    size: 8,
    fadeOut: true,
    spread: Math.PI * 0.3,
    direction: -Math.PI / 2,
    sizeDecay: 1.02,
  },
  fire: {
    count: 5,
    lifetime: 300,
    speed: 60,
    gravity: -100,
    color: 0xff4400,
    size: 5,
    fadeOut: true,
    spread: Math.PI * 0.2,
    direction: -Math.PI / 2,
    sizeDecay: 0.92,
  },
};

// ============================================================================
// Particle System Class
// ============================================================================

/**
 * Manages particle effects throughout the game
 * Handles creation, updating, and rendering of particles
 */
export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private emitters: Map<string, ActiveEmitter> = new Map();

  // PixiJS module
  private PIXI: typeof import('pixi.js') | null = null;

  // Performance settings
  private maxParticles = 500;
  private pooledGraphics: Graphics[] = [];
  private poolSize = 100;

  // Global state
  private paused = false;

  constructor(container: Container) {
    this.container = container;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the particle system
   */
  async initialize(): Promise<void> {
    this.PIXI = await import('pixi.js');
    this.initializePool();
  }

  /**
   * Initialize graphics object pool
   */
  private initializePool(): void {
    if (!this.PIXI) return;

    for (let i = 0; i < this.poolSize; i++) {
      const graphics = new this.PIXI.Graphics();
      graphics.visible = false;
      this.pooledGraphics.push(graphics);
    }
  }

  /**
   * Get a graphics object from pool or create new
   */
  private getGraphics(): Graphics | null {
    if (!this.PIXI) return null;

    // Try to get from pool
    const graphics = this.pooledGraphics.pop();
    if (graphics) {
      graphics.visible = true;
      graphics.clear();
      return graphics;
    }

    // Create new if pool empty
    return new this.PIXI.Graphics();
  }

  /**
   * Return graphics object to pool
   */
  private releaseGraphics(graphics: Graphics): void {
    graphics.visible = false;
    graphics.clear();
    if (graphics.parent) {
      graphics.parent.removeChild(graphics);
    }

    if (this.pooledGraphics.length < this.poolSize) {
      this.pooledGraphics.push(graphics);
    } else {
      graphics.destroy();
    }
  }

  // ==========================================================================
  // Emission API
  // ==========================================================================

  /**
   * Emit particles at a position with custom config
   */
  emit(x: number, y: number, config: Partial<ParticleConfig>): void {
    const fullConfig: ParticleConfig = {
      count: 10,
      lifetime: 500,
      speed: 100,
      gravity: 100,
      color: 0xffffff,
      size: 4,
      fadeOut: true,
      spread: Math.PI * 2,
      direction: 0,
      sizeDecay: 1,
      friction: 1,
      rotation: 0,
      rotationSpeed: 0,
      ...config,
    };

    this.createParticles(x, y, fullConfig);
  }

  /**
   * Emit particles using a preset configuration
   */
  emitPreset(x: number, y: number, presetName: string, overrides?: Partial<ParticleConfig>): void {
    const preset = PARTICLE_PRESETS[presetName];
    if (!preset) {
      console.warn(`Particle preset '${presetName}' not found`);
      return;
    }

    const config = { ...preset, ...overrides };
    this.emit(x, y, config);
  }

  /**
   * Create explosion particles
   */
  createExplosion(x: number, y: number, color?: number): void {
    this.emitPreset(x, y, 'explosion', color ? { color } : undefined);

    // Add some smoke
    this.emitPreset(x, y, 'smoke');
  }

  /**
   * Create block destruction particles
   */
  createBlockDestruction(x: number, y: number, color?: number): void {
    this.emitPreset(x, y, 'blockDebris', color ? { color } : undefined);
    this.emitPreset(x, y, 'dust');
  }

  /**
   * Create power-up collection effect
   */
  createPowerupEffect(x: number, y: number, color: number = 0xffff00): void {
    this.emitPreset(x, y, 'powerupCollect', { color });
    this.emitPreset(x, y, 'sparkle');
  }

  /**
   * Create player death effect
   */
  createDeathEffect(x: number, y: number): void {
    this.emitPreset(x, y, 'playerDeath');
    this.emitPreset(x, y, 'smoke', { count: 8, color: 0x444444 });
  }

  /**
   * Create dust particles (for movement)
   */
  createDust(x: number, y: number): void {
    this.emitPreset(x, y, 'dust', { count: 3 });
  }

  /**
   * Create fire particles
   */
  createFire(x: number, y: number): void {
    this.emitPreset(x, y, 'fire');
  }

  // ==========================================================================
  // Emitter Management
  // ==========================================================================

  /**
   * Create a continuous particle emitter
   */
  createEmitter(id: string, config: EmitterConfig): void {
    this.emitters.set(id, {
      config,
      elapsed: 0,
      lastEmit: 0,
    });
  }

  /**
   * Remove an emitter
   */
  removeEmitter(id: string): void {
    this.emitters.delete(id);
  }

  /**
   * Check if emitter exists
   */
  hasEmitter(id: string): boolean {
    return this.emitters.has(id);
  }

  // ==========================================================================
  // Particle Creation
  // ==========================================================================

  /**
   * Create particles based on configuration
   */
  private createParticles(x: number, y: number, config: ParticleConfig): void {
    if (!this.PIXI) return;

    const {
      count,
      lifetime,
      speed,
      gravity,
      color,
      size,
      fadeOut,
      spread = Math.PI * 2,
      direction = 0,
      sizeDecay = 1,
      friction = 1,
      rotationSpeed = 0,
    } = config;

    // Limit particle count if at max
    const particlesToCreate = Math.min(
      count,
      this.maxParticles - this.particles.length
    );

    for (let i = 0; i < particlesToCreate; i++) {
      // Calculate velocity direction
      const angle = direction + (Math.random() - 0.5) * spread;
      const velocityMagnitude = speed * (0.5 + Math.random() * 0.5);

      const vx = Math.cos(angle) * velocityMagnitude;
      const vy = Math.sin(angle) * velocityMagnitude;

      // Create particle
      const particle: Particle = {
        x,
        y,
        vx,
        vy,
        lifetime,
        maxLifetime: lifetime,
        color,
        size: size * (0.8 + Math.random() * 0.4),
        initialSize: size,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rotationSpeed * (Math.random() - 0.5) * 2,
        gravity,
        friction,
        sizeDecay,
        fadeOut,
        graphics: this.getGraphics(),
      };

      // Draw particle
      this.drawParticle(particle);

      // Add to container
      if (particle.graphics) {
        this.container.addChild(particle.graphics);
      }

      this.particles.push(particle);
    }
  }

  /**
   * Draw a single particle
   */
  private drawParticle(particle: Particle): void {
    if (!particle.graphics) return;

    particle.graphics.clear();
    particle.graphics.circle(0, 0, particle.size / 2);
    particle.graphics.fill({ color: particle.color, alpha: particle.alpha });

    particle.graphics.x = particle.x;
    particle.graphics.y = particle.y;
    particle.graphics.rotation = particle.rotation;
  }

  // ==========================================================================
  // Update Loop
  // ==========================================================================

  /**
   * Update all particles (called each frame)
   */
  update(deltaTime: number): void {
    if (this.paused) return;

    // Update emitters
    this.updateEmitters(deltaTime);

    // Update particles
    const deadParticles: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle) continue;

      // Update lifetime
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        deadParticles.push(i);
        continue;
      }

      // Update physics
      particle.vy += particle.gravity * (deltaTime / 1000);
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;

      particle.x += particle.vx * (deltaTime / 1000);
      particle.y += particle.vy * (deltaTime / 1000);

      particle.rotation += particle.rotationSpeed * (deltaTime / 1000);

      // Update size
      if (particle.sizeDecay !== 1) {
        particle.size *= Math.pow(particle.sizeDecay, deltaTime / 16.67);
      }

      // Update alpha
      if (particle.fadeOut) {
        particle.alpha = particle.lifetime / particle.maxLifetime;
      }

      // Redraw particle
      this.drawParticle(particle);
    }

    // Remove dead particles (in reverse order to maintain indices)
    for (let i = deadParticles.length - 1; i >= 0; i--) {
      const index = deadParticles[i];
      if (index === undefined) continue;
      const particle = this.particles[index];
      if (!particle) continue;

      if (particle.graphics) {
        this.releaseGraphics(particle.graphics);
      }

      this.particles.splice(index, 1);
    }
  }

  /**
   * Update all emitters
   */
  private updateEmitters(deltaTime: number): void {
    const deadEmitters: string[] = [];

    for (const [id, emitter] of this.emitters) {
      emitter.elapsed += deltaTime;

      // Check if emitter expired
      if (!emitter.config.continuous && emitter.elapsed >= emitter.config.duration) {
        deadEmitters.push(id);
        continue;
      }

      // Check if should emit
      const emitInterval = 1000 / emitter.config.emitRate;
      if (emitter.elapsed - emitter.lastEmit >= emitInterval) {
        emitter.lastEmit = emitter.elapsed;
        this.createParticles(
          emitter.config.x,
          emitter.config.y,
          emitter.config.particleConfig
        );
      }
    }

    // Remove expired emitters
    for (const id of deadEmitters) {
      this.emitters.delete(id);
    }
  }

  // ==========================================================================
  // Control Methods
  // ==========================================================================

  /**
   * Pause particle system
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume particle system
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    for (const particle of this.particles) {
      if (particle.graphics) {
        this.releaseGraphics(particle.graphics);
      }
    }
    this.particles = [];
  }

  /**
   * Clear all emitters
   */
  clearEmitters(): void {
    this.emitters.clear();
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set maximum particle count
   */
  setMaxParticles(max: number): void {
    this.maxParticles = Math.max(10, max);
  }

  /**
   * Get maximum particle count
   */
  getMaxParticles(): number {
    return this.maxParticles;
  }

  /**
   * Get current particle count
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Get emitter count
   */
  getEmitterCount(): number {
    return this.emitters.size;
  }

  /**
   * Register a custom preset
   */
  registerPreset(name: string, config: ParticleConfig): void {
    PARTICLE_PRESETS[name] = config;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.clear();
    this.clearEmitters();

    // Destroy pooled graphics
    for (const graphics of this.pooledGraphics) {
      graphics.destroy();
    }
    this.pooledGraphics = [];

    this.PIXI = null;
  }
}
