/**
 * Asset Loading System for Bomberman Online
 * Handles sprite sheets, audio, and fonts with placeholder fallback
 */

import type { Texture } from 'pixi.js';
import type { EffectAnimation } from '@/types/assets';
import {
  PlaceholderGenerator,
  createEffectPlaceholder,
  generateCharacterSpriteSheet,
  generateBombSpriteSheet,
  generateTileSpriteSheet,
  generatePowerupSpriteSheet,
  isBrowser,
} from '@/lib/placeholders';

// ============================================================================
// Types
// ============================================================================

export interface LoadedTextures {
  characters: Texture | null;
  bombs: Texture | null;
  tiles: Texture | null;
  powerups: Texture | null;
  effects: Texture | null;
  ui: Texture | null;
}

export interface LoadedAudio {
  music: Map<string, HTMLAudioElement>;
  sfx: Map<string, HTMLAudioElement>;
}

export interface AssetLoadingState {
  total: number;
  loaded: number;
  failed: number;
  currentAsset: string;
  isComplete: boolean;
}

export type ProgressCallback = (progress: number, state: AssetLoadingState) => void;

// ============================================================================
// Asset Manifest (from manifest.json)
// ============================================================================

const ASSET_PATHS = {
  sprites: {
    characters: '/assets/sprites/characters.png',
    bombs: '/assets/sprites/bombs.png',
    tiles: '/assets/sprites/tiles.png',
    powerups: '/assets/sprites/powerups.png',
    effects: '/assets/sprites/effects.png',
    ui: '/assets/sprites/ui.png',
  },
  audio: {
    music: {
      bgm_menu: '/assets/audio/bgm_menu.mp3',
      bgm_game: '/assets/audio/bgm_game.mp3',
      bgm_victory: '/assets/audio/bgm_victory.mp3',
      bgm_tension: '/assets/audio/bgm_tension.mp3',
    },
    sfx: {
      bomb_place: '/assets/audio/sfx/bomb_place.mp3',
      explosion: '/assets/audio/sfx/explosion.mp3',
      powerup_collect: '/assets/audio/sfx/powerup.mp3',
      player_death: '/assets/audio/sfx/death.mp3',
      victory: '/assets/audio/sfx/victory.mp3',
      block_destroy: '/assets/audio/sfx/block_destroy.mp3',
      menu_select: '/assets/audio/sfx/menu_select.mp3',
      countdown: '/assets/audio/sfx/countdown.mp3',
      game_start: '/assets/audio/sfx/game_start.mp3',
    },
  },
  fonts: {
    pixel_small: '/assets/fonts/pixel_small.fnt',
    pixel_large: '/assets/fonts/pixel_large.fnt',
  },
};

// ============================================================================
// Asset Loader Class
// ============================================================================

/**
 * Asset loader with placeholder fallback support
 * Loads all game assets with progress tracking
 */
export class AssetLoader {
  // Loaded assets
  private textures: LoadedTextures = {
    characters: null,
    bombs: null,
    tiles: null,
    powerups: null,
    effects: null,
    ui: null,
  };

  private audio: LoadedAudio = {
    music: new Map(),
    sfx: new Map(),
  };

  // Sprite sheet data (for frame extraction) - currently unused
  // private _spritesheets: Map<string, Spritesheet> = new Map();

  // Loading state
  private loadingState: AssetLoadingState = {
    total: 0,
    loaded: 0,
    failed: 0,
    currentAsset: '',
    isComplete: false,
  };

  // Placeholder generator
  private placeholderGenerator: PlaceholderGenerator | null = null;

  // PixiJS module (dynamically imported)
  private PIXI: typeof import('pixi.js') | null = null;

  constructor() {
    if (isBrowser()) {
      this.placeholderGenerator = new PlaceholderGenerator({
        showLabel: true,
        showBorder: true,
        fontSize: 8,
        borderRadius: 0,
      });
    }
  }

  // ==========================================================================
  // Main Loading API
  // ==========================================================================

  /**
   * Load all game assets (alias for loadAllAssets)
   */
  async loadAll(onProgress?: ProgressCallback): Promise<void> {
    return this.loadAllAssets(onProgress);
  }

  /**
   * Load all game assets
   */
  async loadAllAssets(onProgress?: ProgressCallback): Promise<void> {
    // Dynamically import PixiJS
    this.PIXI = await import('pixi.js');

    // Calculate total assets
    const spriteCount = Object.keys(ASSET_PATHS.sprites).length;
    const musicCount = Object.keys(ASSET_PATHS.audio.music).length;
    const sfxCount = Object.keys(ASSET_PATHS.audio.sfx).length;

    this.loadingState = {
      total: spriteCount + musicCount + sfxCount,
      loaded: 0,
      failed: 0,
      currentAsset: '',
      isComplete: false,
    };

    // Load sprites (with placeholder fallback)
    await this.loadSprites(onProgress);

    // Load audio (optional - don't fail if missing)
    await this.loadAudio(onProgress);

    this.loadingState.isComplete = true;
    onProgress?.(1, this.loadingState);
  }

  /**
   * Load all sprite sheets
   */
  private async loadSprites(onProgress?: ProgressCallback): Promise<void> {
    const entries = Object.entries(ASSET_PATHS.sprites) as [keyof LoadedTextures, string][];

    for (const [name, path] of entries) {
      this.loadingState.currentAsset = `sprites/${name}`;

      try {
        // Try to load the actual sprite sheet
        const texture = await this.loadTexture(path);
        this.textures[name] = texture;
      } catch (error) {
        console.warn(`Failed to load sprite ${name}, using placeholder:`, error);

        // Generate placeholder texture
        this.textures[name] = await this.generatePlaceholderTexture(name);
        this.loadingState.failed++;
      }

      this.loadingState.loaded++;
      const progress = this.loadingState.loaded / this.loadingState.total;
      onProgress?.(progress, this.loadingState);
    }
  }

  /**
   * Load a single texture from URL
   */
  private async loadTexture(url: string): Promise<Texture> {
    if (!this.PIXI) {
      throw new Error('PixiJS not loaded');
    }

    return await this.PIXI.Assets.load(url);
  }

  /**
   * Generate a placeholder texture for missing sprites
   */
  private async generatePlaceholderTexture(
    name: keyof LoadedTextures
  ): Promise<Texture> {
    if (!this.PIXI || !this.placeholderGenerator || !isBrowser()) {
      throw new Error('Cannot generate placeholder - not in browser');
    }

    let canvas: HTMLCanvasElement;

    switch (name) {
      case 'characters':
        canvas = generateCharacterSpriteSheet(this.placeholderGenerator);
        break;
      case 'bombs':
        canvas = generateBombSpriteSheet(this.placeholderGenerator);
        break;
      case 'tiles':
        canvas = generateTileSpriteSheet(this.placeholderGenerator);
        break;
      case 'powerups':
        canvas = generatePowerupSpriteSheet(this.placeholderGenerator);
        break;
      case 'effects':
        canvas = this.generateEffectsSpriteSheet();
        break;
      case 'ui':
        canvas = this.generateUISpriteSheet();
        break;
      default:
        // Generic placeholder
        canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FF00FF';
          ctx.fillRect(0, 0, 256, 256);
          ctx.fillStyle = '#000000';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('MISSING', 128, 128);
        }
    }

    // Convert canvas to PixiJS texture
    return this.PIXI.Texture.from(canvas);
  }

  /**
   * Generate effects sprite sheet placeholder
   */
  private generateEffectsSpriteSheet(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.placeholderGenerator) return canvas;

    ctx.clearRect(0, 0, 256, 128);

    const effects: EffectAnimation[] = ['spawn', 'teleport', 'shield_hit', 'powerup_collect', 'dust'];

    effects.forEach((effect, index) => {
      const config = createEffectPlaceholder(effect);
      const frameCanvas = this.placeholderGenerator!.createCanvas(config);

      // Draw multiple frames for animation
      for (let frame = 0; frame < 4; frame++) {
        ctx.drawImage(frameCanvas, (index * 4 + frame) * 32 % 256, Math.floor((index * 4 + frame) / 8) * 32);
      }
    });

    return canvas;
  }

  /**
   * Generate UI sprite sheet placeholder
   */
  private generateUISpriteSheet(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, 256, 256);

    // Button states
    const buttonColors = ['#4488FF', '#66AAFF', '#2266CC', '#888888'];
    buttonColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * 32, 96, 32);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(0, i * 32, 96, 32);
    });

    // Panel corners and edges
    ctx.fillStyle = '#3A3A5A';
    for (let i = 0; i < 9; i++) {
      const x = 96 + (i % 3) * 16;
      const y = Math.floor(i / 3) * 16;
      ctx.fillRect(x, y, 16, 16);
      ctx.strokeStyle = '#5A5A8A';
      ctx.strokeRect(x, y, 16, 16);
    }

    // Health bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 128, 64, 8);
    ctx.fillStyle = '#44FF44';
    ctx.fillRect(0, 136, 64, 8);

    // Timer background
    ctx.fillStyle = '#2A2A4A';
    ctx.fillRect(64, 128, 48, 16);

    // Icons
    const iconColors = ['#FFCC00', '#888888', '#4488FF', '#FF6600', '#44FF44'];
    iconColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(120 + i * 20, 136, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    return canvas;
  }

  // ==========================================================================
  // Audio Loading
  // ==========================================================================

  /**
   * Load all audio assets
   */
  private async loadAudio(onProgress?: ProgressCallback): Promise<void> {
    // Load music
    for (const [name, path] of Object.entries(ASSET_PATHS.audio.music)) {
      this.loadingState.currentAsset = `music/${name}`;

      try {
        const audio = await this.loadAudioFile(path);
        this.audio.music.set(name, audio);
      } catch (error) {
        console.warn(`Failed to load music ${name}:`, error);
        this.loadingState.failed++;
      }

      this.loadingState.loaded++;
      const progress = this.loadingState.loaded / this.loadingState.total;
      onProgress?.(progress, this.loadingState);
    }

    // Load SFX
    for (const [name, path] of Object.entries(ASSET_PATHS.audio.sfx)) {
      this.loadingState.currentAsset = `sfx/${name}`;

      try {
        const audio = await this.loadAudioFile(path);
        this.audio.sfx.set(name, audio);
      } catch (error) {
        console.warn(`Failed to load sfx ${name}:`, error);
        this.loadingState.failed++;
      }

      this.loadingState.loaded++;
      const progress = this.loadingState.loaded / this.loadingState.total;
      onProgress?.(progress, this.loadingState);
    }
  }

  /**
   * Load a single audio file
   */
  private loadAudioFile(url: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';

      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Failed to load audio: ${url}`));

      audio.src = url;
    });
  }

  // ==========================================================================
  // Asset Access API
  // ==========================================================================

  /**
   * Get all loaded textures
   */
  getTextures(): LoadedTextures {
    return { ...this.textures };
  }

  /**
   * Get a specific texture by name
   */
  getTexture(name: keyof LoadedTextures): Texture | null {
    return this.textures[name];
  }

  /**
   * Get all loaded audio
   */
  getAudio(): LoadedAudio {
    return this.audio;
  }

  /**
   * Get a music track by name
   */
  getMusic(name: string): HTMLAudioElement | undefined {
    return this.audio.music.get(name);
  }

  /**
   * Get a sound effect by name
   */
  getSfx(name: string): HTMLAudioElement | undefined {
    return this.audio.sfx.get(name);
  }

  /**
   * Play a sound effect
   */
  playSfx(name: string, volume: number = 1): void {
    const sfx = this.audio.sfx.get(name);
    if (sfx) {
      // Clone for overlapping sounds
      const clone = sfx.cloneNode() as HTMLAudioElement;
      clone.volume = Math.max(0, Math.min(1, volume));
      clone.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  /**
   * Play background music
   */
  playMusic(name: string, loop: boolean = true, volume: number = 0.5): void {
    // Stop all other music
    this.stopAllMusic();

    const music = this.audio.music.get(name);
    if (music) {
      music.loop = loop;
      music.volume = Math.max(0, Math.min(1, volume));
      music.currentTime = 0;
      music.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  /**
   * Stop all background music
   */
  stopAllMusic(): void {
    this.audio.music.forEach((music) => {
      music.pause();
      music.currentTime = 0;
    });
  }

  /**
   * Get current loading state
   */
  getLoadingState(): AssetLoadingState {
    return { ...this.loadingState };
  }

  /**
   * Check if all assets are loaded
   */
  isLoaded(): boolean {
    return this.loadingState.isComplete;
  }

  /**
   * Get loading progress (0-1)
   */
  getProgress(): number {
    if (this.loadingState.total === 0) return 0;
    return this.loadingState.loaded / this.loadingState.total;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { ASSET_PATHS };
