/**
 * Main Game class for Bomberman Online
 * Uses PixiJS 8.x for rendering with SNES-style pixel-perfect graphics
 */

import type { Application } from 'pixi.js';
import type { GameState, GamePhase } from '@/types/game';
import type { ServerMessage } from '@/types/websocket';

import { AssetLoader } from './AssetLoader';
import { Renderer } from './Renderer';
import { InputHandler, type InputState } from './InputHandler';
import { SpriteManager } from './SpriteManager';
import { AnimationController } from './AnimationController';
import { ParticleSystem } from './ParticleSystem';
import { Camera } from './Camera';
import { GameClient, type ConnectionState } from '../network/GameClient';

// ============================================================================
// Types
// ============================================================================

export interface GameOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  scale?: number;
  onStateChange?: (state: LocalGameState) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onLoadProgress?: (progress: number) => void;
}

export interface LocalGameState {
  phase: GamePhase | 'loading' | 'error';
  tick: number;
  serverTick: number;
  localPlayerId: string | null;
  connectionState: ConnectionState;
  loadingProgress: number;
  error?: string;
}

export interface GameConfig {
  /** Base resolution width (SNES style) */
  baseWidth: number;
  /** Base resolution height (SNES style) */
  baseHeight: number;
  /** Tile size in pixels */
  tileSize: number;
  /** Map width in tiles */
  mapWidth: number;
  /** Map height in tiles */
  mapHeight: number;
  /** Target FPS */
  targetFPS: number;
  /** Server tick rate in Hz */
  serverTickRate: number;
}

/** Default game configuration for SNES-style rendering */
export const DEFAULT_CONFIG: GameConfig = {
  baseWidth: 480,   // 15 tiles * 32px
  baseHeight: 416,  // 13 tiles * 32px
  tileSize: 32,
  mapWidth: 15,
  mapHeight: 13,
  targetFPS: 60,
  serverTickRate: 20,
};

// ============================================================================
// Main Game Class
// ============================================================================

/**
 * Main game engine class
 * Handles initialization, game loop, and coordination between systems
 */
export class BombermanGame {
  // PixiJS application
  private app: Application | null = null;
  private container: HTMLElement | null = null;

  // Game configuration
  private config: GameConfig;
  // private _options: GameOptions; // Commented out - never read, only individual properties are used

  // Core systems
  private assetLoader: AssetLoader | null = null;
  private spriteManager: SpriteManager | null = null;
  private renderer: Renderer | null = null;
  private inputHandler: InputHandler | null = null;
  private animationController: AnimationController | null = null;
  private particleSystem: ParticleSystem | null = null;
  private camera: Camera | null = null;
  private gameClient: GameClient | null = null;

  // Game state
  private localState: LocalGameState = {
    phase: 'loading',
    tick: 0,
    serverTick: 0,
    localPlayerId: null,
    connectionState: 'disconnected',
    loadingProgress: 0,
  };

  // Server game state (authoritative)
  private serverState: GameState | null = null;

  // State interpolation buffers
  private stateBuffer: Array<{ state: GameState; timestamp: number }> = [];
  private readonly stateBufferSize = 3;

  // Input prediction
  private inputSequence = 0;
  private pendingInputs: Array<{ input: InputState; sequence: number; timestamp: number }> = [];

  // Timing
  private lastUpdateTime = 0;
  private accumulator = 0;
  private readonly fixedDeltaTime = 1000 / 60; // 60 FPS fixed timestep

  // Callbacks
  private onStateChange?: (state: LocalGameState) => void;
  private onConnectionChange?: (state: ConnectionState) => void;
  private onLoadProgress?: (progress: number) => void;

  // Destroy flag
  private isDestroyed = false;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // this._options = { container: document.body };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the game engine
   */
  async init(options: GameOptions): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot initialize destroyed game instance');
    }

    // this._options = options;
    this.container = options.container;
    this.onStateChange = options.onStateChange;
    this.onConnectionChange = options.onConnectionChange;
    this.onLoadProgress = options.onLoadProgress;

    try {
      // Update state
      this.updateLocalState({ phase: 'loading', loadingProgress: 0 });

      // Dynamically import PixiJS to avoid SSR issues
      const PIXI = await import('pixi.js');

      // Create PixiJS application
      this.app = new PIXI.Application();

      await this.app.init({
        width: options.width ?? this.config.baseWidth,
        height: options.height ?? this.config.baseHeight,
        backgroundColor: 0x1a1a2e,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: false, // Pixel-perfect rendering - critical for SNES style
        roundPixels: true, // Snap sprites to pixel grid
        hello: false, // Disable PixiJS console message
      });

      // Apply pixel-perfect scaling
      this.app.stage.eventMode = 'static';
      this.app.canvas.style.imageRendering = 'pixelated';

      // Append canvas to container
      this.container.appendChild(this.app.canvas);
      this.updateLocalState({ loadingProgress: 0.1 });

      // Initialize core systems
      await this.initializeSystems();
      this.updateLocalState({ loadingProgress: 0.3 });

      // Load assets
      await this.loadAssets();
      this.updateLocalState({ loadingProgress: 1, phase: 'waiting' });

      // Initialize input handler
      this.inputHandler = new InputHandler();
      this.inputHandler.enable();
      this.inputHandler.onInput(this.handleInput.bind(this));

      // Start game loop
      this.startGameLoop();

    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.updateLocalState({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown initialization error'
      });
      throw error;
    }
  }

  /**
   * Initialize all game systems
   */
  private async initializeSystems(): Promise<void> {
    if (!this.app) return;

    // Asset loader
    this.assetLoader = new AssetLoader();

    // Sprite manager (needs PixiJS stage)
    this.spriteManager = new SpriteManager(this.app.stage);

    // Animation controller
    this.animationController = new AnimationController();

    // Particle system
    this.particleSystem = new ParticleSystem(this.app.stage);

    // Camera system
    this.camera = new Camera(this.app.stage, {
      viewportWidth: this.config.baseWidth,
      viewportHeight: this.config.baseHeight,
      worldWidth: this.config.mapWidth * this.config.tileSize,
      worldHeight: this.config.mapHeight * this.config.tileSize,
      smoothing: 0.1,
    });

    // Main renderer
    this.renderer = new Renderer({
      app: this.app,
      tileSize: this.config.tileSize,
      mapWidth: this.config.mapWidth,
      mapHeight: this.config.mapHeight,
    });
  }

  /**
   * Load game assets (sprites, audio, etc.)
   */
  async loadAssets(): Promise<void> {
    if (!this.assetLoader || !this.spriteManager) return;

    // Load assets using the AssetLoader with progress callback
    await this.assetLoader.loadAllAssets((progress) => {
      const overallProgress = 0.3 + (progress * 0.7);
      this.updateLocalState({ loadingProgress: overallProgress });
      this.onLoadProgress?.(overallProgress);
    });

    // Pass loaded textures to sprite manager
    await this.spriteManager.setTextures(this.assetLoader.getTextures());
  }

  // ==========================================================================
  // Game Loop
  // ==========================================================================

  /**
   * Start the game loop
   */
  private startGameLoop(): void {
    if (!this.app) return;

    this.lastUpdateTime = performance.now();

    this.app.ticker.add(() => {
      if (this.isDestroyed) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastUpdateTime;
      this.lastUpdateTime = currentTime;

      // Fixed timestep update
      this.accumulator += deltaTime;

      while (this.accumulator >= this.fixedDeltaTime) {
        this.fixedUpdate(this.fixedDeltaTime);
        this.accumulator -= this.fixedDeltaTime;
      }

      // Variable timestep render with interpolation
      const alpha = this.accumulator / this.fixedDeltaTime;
      this.render(alpha);
    });
  }

  /**
   * Fixed timestep update (game logic)
   */
  private fixedUpdate(deltaMs: number): void {
    if (this.localState.phase !== 'playing') return;

    this.localState.tick++;

    // Update animation controller
    this.animationController?.update(deltaMs);

    // Update particle system
    this.particleSystem?.update(deltaMs);

    // Update camera
    if (this.camera && this.serverState && this.localState.localPlayerId) {
      const localPlayer = this.serverState.players[this.localState.localPlayerId];
      if (localPlayer) {
        this.camera.follow(
          localPlayer.position.x * this.config.tileSize,
          localPlayer.position.y * this.config.tileSize
        );
      }
      this.camera.update(deltaMs);
    }

    // Process input prediction
    this.processInputPrediction();
  }

  /**
   * Render the game (called every frame)
   */
  private render(_alpha: number): void {
    if (!this.renderer || !this.serverState) return;

    // Interpolate state for smooth rendering
    // const interpolatedState = this.interpolateState(_alpha);

    // Render game state
    this.renderer.render(this.serverState);
  }

  /**
   * Interpolate between server states for smooth rendering
   * Currently unused - commented out to avoid noUnusedLocals error
   */
  // private interpolateState(alpha: number): GameState {
  //   if (!this.serverState) {
  //     return this.createEmptyState();
  //   }
  //
  //   if (this.stateBuffer.length < 2) {
  //     return this.serverState;
  //   }
  //
  //   // Simple linear interpolation between the two most recent states
  //   const prevStateEntry = this.stateBuffer[0];
  //   const nextStateEntry = this.stateBuffer[1];
  //
  //   if (!prevStateEntry || !nextStateEntry) {
  //     return this.serverState;
  //   }
  //
  //   const prevState = prevStateEntry.state;
  //   const nextState = nextStateEntry.state;
  //
  //   const interpolated: GameState = {
  //     ...nextState,
  //     players: {},
  //   };
  //
  //   // Interpolate player positions
  //   for (const playerId in nextState.players) {
  //     const prevPlayer = prevState.players[playerId];
  //     const nextPlayer = nextState.players[playerId];
  //
  //     if (prevPlayer && nextPlayer) {
  //       interpolated.players[playerId] = {
  //         ...nextPlayer,
  //         position: {
  //           x: prevPlayer.position.x + (nextPlayer.position.x - prevPlayer.position.x) * alpha,
  //           y: prevPlayer.position.y + (nextPlayer.position.y - prevPlayer.position.y) * alpha,
  //         },
  //       };
  //     } else if (nextPlayer) {
  //       interpolated.players[playerId] = nextPlayer;
  //     }
  //   }
  //
  //   return interpolated;
  // }

  /**
   * Create an empty game state for initialization
   * Currently unused - commented out to avoid noUnusedLocals error
   */
  // private createEmptyState(): GameState {
  //   return {
  //     tick: 0,
  //     phase: 'waiting',
  //     map: {
  //       id: 'empty',
  //       name: 'Empty Map',
  //       width: this.config.mapWidth,
  //       height: this.config.mapHeight,
  //       tiles: [],
  //       spawnPoints: [],
  //       isOfficial: true,
  //       playCount: 0,
  //       likes: 0,
  //       maxPlayers: 4,
  //       version: 1,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     },
  //     players: {},
  //     bombs: {},
  //     powerups: {},
  //     explosions: [],
  //     currentRound: 1,
  //     roundsToWin: 3,
  //     roundWins: {},
  //     timeRemaining: 0,
  //     roundResults: [],
  //     suddenDeathLevel: 0,
  //     lastProcessedInputs: {},
  //   };
  // }

  // ==========================================================================
  // Input Handling
  // ==========================================================================

  /**
   * Handle input from InputHandler
   */
  private handleInput(inputState: InputState): void {
    if (this.localState.phase !== 'playing') return;

    // Increment sequence number
    this.inputSequence++;

    // Store for prediction reconciliation
    this.pendingInputs.push({
      input: inputState,
      sequence: this.inputSequence,
      timestamp: Date.now(),
    });

    // Send to server
    this.sendInputToServer(inputState, this.inputSequence);

    // Apply local prediction
    this.applyInputPrediction(inputState);
  }

  /**
   * Send input to the game server
   */
  private sendInputToServer(input: InputState, sequence: number): void {
    if (!this.gameClient) return;

    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

    if (input.up) direction = 'up';
    else if (input.down) direction = 'down';
    else if (input.left) direction = 'left';
    else if (input.right) direction = 'right';

    this.gameClient.sendInput({
      direction,
      bomb: input.bomb,
      seq: sequence,
    });
  }

  /**
   * Apply input prediction locally
   */
  private applyInputPrediction(input: InputState): void {
    if (!this.serverState || !this.localState.localPlayerId) return;

    const localPlayer = this.serverState.players[this.localState.localPlayerId];
    if (!localPlayer || !localPlayer.isAlive) return;

    // Predict movement
    const speed = localPlayer.speed * 0.1; // tiles per frame
    let dx = 0;
    let dy = 0;

    if (input.up) dy = -speed;
    else if (input.down) dy = speed;
    else if (input.left) dx = -speed;
    else if (input.right) dx = speed;

    // Update predicted position (without collision - server is authoritative)
    localPlayer.position.x += dx;
    localPlayer.position.y += dy;
  }

  /**
   * Process input prediction reconciliation
   */
  private processInputPrediction(): void {
    if (!this.serverState || !this.localState.localPlayerId) return;

    const lastProcessed = this.serverState.lastProcessedInputs[this.localState.localPlayerId];
    if (lastProcessed === undefined) return;

    // Remove processed inputs
    this.pendingInputs = this.pendingInputs.filter(
      (pending) => pending.sequence > lastProcessed
    );

    // Re-apply remaining pending inputs
    const localPlayer = this.serverState.players[this.localState.localPlayerId];
    if (!localPlayer) return;

    for (const pending of this.pendingInputs) {
      this.applyInputPrediction(pending.input);
    }
  }

  // ==========================================================================
  // Network Integration
  // ==========================================================================

  /**
   * Connect to game server
   */
  connectToServer(url: string, token?: string): void {
    this.gameClient = new GameClient({
      url,
      token,
      onMessage: this.handleServerMessage.bind(this),
      onStateChange: (state) => {
        this.updateLocalState({ connectionState: state });
        this.onConnectionChange?.(state);
      },
    });

    this.gameClient.connect();
  }

  /**
   * Join a game room
   */
  joinRoom(roomCode: string, clerkId: string): void {
    this.gameClient?.joinRoom(roomCode, clerkId);
  }

  /**
   * Handle messages from the server
   */
  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'state':
        // StateUpdateMessage contains players, bombs, etc. directly
        // Build a GameState from it
        if (this.serverState) {
          const updatedState: GameState = {
            ...this.serverState,
            tick: message.tick,
            players: message.players,
          };
          this.handleStateUpdate(updatedState);
        }
        break;
      case 'room_joined':
        this.updateLocalState({ localPlayerId: message.playerId });
        break;
      case 'game_start':
        this.handleStateUpdate(message.initialState);
        this.updateLocalState({ phase: 'playing' });
        break;
      case 'game_end':
        this.updateLocalState({ phase: 'finished' });
        break;
      case 'pong':
        // Handle latency measurement
        break;
    }
  }

  /**
   * Handle game state update from server
   */
  private handleStateUpdate(state: GameState): void {
    // Add to state buffer for interpolation
    this.stateBuffer.push({ state, timestamp: Date.now() });

    // Keep buffer at fixed size
    while (this.stateBuffer.length > this.stateBufferSize) {
      this.stateBuffer.shift();
    }

    // Update server state
    this.serverState = state;
    this.updateLocalState({
      serverTick: state.tick,
      phase: state.phase,
    });
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Update local game state
   */
  private updateLocalState(updates: Partial<LocalGameState>): void {
    this.localState = { ...this.localState, ...updates };
    this.onStateChange?.(this.localState);
  }

  /**
   * Get current local game state
   */
  getState(): LocalGameState {
    return { ...this.localState };
  }

  /**
   * Get current server game state
   */
  getServerState(): GameState | null {
    return this.serverState;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Set the local player ID (for spectator mode or manual assignment)
   */
  setLocalPlayerId(playerId: string | null): void {
    this.updateLocalState({ localPlayerId: playerId });
  }

  /**
   * Trigger screen shake effect
   */
  screenShake(intensity: number = 5, duration: number = 200): void {
    this.camera?.startShake(intensity, duration);
  }

  /**
   * Spawn particle effect at position
   */
  spawnParticles(
    type: 'explosion' | 'powerup' | 'death',
    x: number,
    y: number
  ): void {
    // Map particle type to the appropriate method
    if (type === 'explosion') {
      this.particleSystem?.createExplosion(x, y);
    } else if (type === 'powerup') {
      this.particleSystem?.createPowerupEffect(x, y, 0xffff00);
    }
    // death particles would use a similar approach
  }

  /**
   * Resize the game canvas
   */
  resize(width: number, height: number): void {
    if (!this.app) return;

    this.app.renderer.resize(width, height);
    // Camera resize would need to be implemented in the Camera class
    // this.camera?.setViewportSize(width, height);
  }

  /**
   * Get the PixiJS application instance
   */
  getApp(): Application | null {
    return this.app;
  }

  /**
   * Get the asset loader instance
   */
  getAssetLoader(): AssetLoader | null {
    return this.assetLoader;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy the game instance and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;

    // Disconnect from server
    this.gameClient?.disconnect();
    this.gameClient = null;

    // Disable input
    this.inputHandler?.disable();
    this.inputHandler = null;

    // Clean up systems
    this.particleSystem?.destroy();
    this.particleSystem = null;

    this.renderer?.destroy();
    this.renderer = null;

    this.spriteManager?.destroy();
    this.spriteManager = null;

    this.animationController = null;
    this.camera = null;
    this.assetLoader = null;

    // Destroy PixiJS application
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }

    // Clear state
    this.serverState = null;
    this.stateBuffer = [];
    this.pendingInputs = [];
    this.container = null;
  }
}
