/**
 * Renderer - Handles PixiJS rendering for Bomberman Online
 * Manages layered rendering of tiles, entities, effects, and UI
 */

import type {
  Application,
  Container as PixiContainer,
  Sprite,
  Graphics,
} from 'pixi.js';
import type { GameState, Player, Bomb, Powerup, Explosion, Tile } from '@/types/game';
import type { SpriteManager } from './SpriteManager';

// ============================================================================
// Types
// ============================================================================

export interface RendererOptions {
  app: Application;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
}

export interface RenderLayers {
  background: PixiContainer;
  tiles: PixiContainer;
  items: PixiContainer;
  bombs: PixiContainer;
  players: PixiContainer;
  explosions: PixiContainer;
  effects: PixiContainer;
  ui: PixiContainer;
}

interface EntitySprite {
  id: string;
  sprite: Sprite;
  type: string;
}

// ============================================================================
// Renderer Class
// ============================================================================

/**
 * Handles all PixiJS rendering for the game
 * Manages layer ordering, entity sprites, and visual effects
 */
export class Renderer {
  private app: Application;
  private tileSize: number;
  private mapWidth: number;
  private mapHeight: number;

  // Main game container
  private gameContainer: PixiContainer | null = null;

  // Render layers (z-ordered)
  private layers: RenderLayers | null = null;

  // Sprite manager reference (set after initialization)
  private spriteManager: SpriteManager | null = null;

  // Active entity sprites
  private entitySprites: Map<string, EntitySprite> = new Map();

  // Tile sprites (static, created once)
  private tileSprites: Sprite[] = [];

  // PixiJS module
  private PIXI: typeof import('pixi.js') | null = null;

  // Debug mode
  private debugMode = false;
  private debugGraphics: Graphics | null = null;

  constructor(options: RendererOptions) {
    this.app = options.app;
    this.tileSize = options.tileSize;
    this.mapWidth = options.mapWidth;
    this.mapHeight = options.mapHeight;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the renderer with layer containers
   */
  async initialize(): Promise<void> {
    this.PIXI = await import('pixi.js');

    // Create main game container
    this.gameContainer = new this.PIXI.Container();
    this.gameContainer.sortableChildren = true;
    this.app.stage.addChild(this.gameContainer);

    // Create render layers in z-order
    this.layers = {
      background: new this.PIXI.Container(),
      tiles: new this.PIXI.Container(),
      items: new this.PIXI.Container(),
      bombs: new this.PIXI.Container(),
      players: new this.PIXI.Container(),
      explosions: new this.PIXI.Container(),
      effects: new this.PIXI.Container(),
      ui: new this.PIXI.Container(),
    };

    // Set z-index for each layer
    this.layers.background.zIndex = 0;
    this.layers.tiles.zIndex = 1;
    this.layers.items.zIndex = 2;
    this.layers.bombs.zIndex = 3;
    this.layers.players.zIndex = 4;
    this.layers.explosions.zIndex = 5;
    this.layers.effects.zIndex = 6;
    this.layers.ui.zIndex = 10;

    // Add layers to game container
    Object.values(this.layers).forEach((layer) => {
      this.gameContainer!.addChild(layer);
    });

    // Create background
    this.createBackground();

    // Create debug graphics
    this.debugGraphics = new this.PIXI.Graphics();
    this.debugGraphics.visible = false;
    this.layers.effects.addChild(this.debugGraphics);
  }

  /**
   * Set the sprite manager reference
   */
  setSpriteManager(spriteManager: SpriteManager): void {
    this.spriteManager = spriteManager;
  }

  /**
   * Create the background fill
   */
  private createBackground(): void {
    if (!this.PIXI || !this.layers) return;

    const bg = new this.PIXI.Graphics();
    bg.rect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
    bg.fill(0x1a1a2e);
    this.layers.background.addChild(bg);
  }

  // ==========================================================================
  // Main Render API
  // ==========================================================================

  /**
   * Render a complete game state
   */
  render(state: GameState, interpolation: number = 1): void {
    if (!this.layers || !this.spriteManager) return;

    // Update tiles (only on change)
    this.renderTiles(state.map.tiles);

    // Render powerups
    this.renderPowerups(Object.values(state.powerups));

    // Render bombs
    this.renderBombs(Object.values(state.bombs), interpolation);

    // Render players
    this.renderPlayers(Object.values(state.players), interpolation);

    // Render explosions
    this.renderExplosions(state.explosions);

    // Update debug overlay if enabled
    if (this.debugMode) {
      this.renderDebugOverlay(state);
    }
  }

  // ==========================================================================
  // Tile Rendering
  // ==========================================================================

  /**
   * Render tile layer
   */
  private renderTiles(tiles: Tile[][]): void {
    if (!this.layers || !this.spriteManager) return;

    // Calculate total tile count
    const totalTiles = tiles.reduce((sum, row) => sum + row.length, 0);

    // Only recreate if tile count changed
    if (this.tileSprites.length !== totalTiles) {
      this.clearTiles();
      this.createTileSprites(tiles);
    } else {
      // Update existing tiles
      this.updateTileSprites(tiles);
    }
  }

  /**
   * Create tile sprites from state
   */
  private createTileSprites(tiles: Tile[][]): void {
    if (!this.layers || !this.spriteManager) return;

    for (let y = 0; y < tiles.length; y++) {
      const row = tiles[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (!tile) continue;

        let tileType: 'empty' | 'wall' | 'block' = 'empty';
        if (tile.type === 'wall') tileType = 'wall';
        else if (tile.type === 'block') tileType = 'block';

        const sprite = this.spriteManager.createTileSprite(tileType, tile.variant || 0);
        if (sprite) {
          sprite.x = x * this.tileSize;
          sprite.y = y * this.tileSize;
          this.layers.tiles.addChild(sprite);
          this.tileSprites.push(sprite);
        }
      }
    }
  }

  /**
   * Update tile sprites from state (for destroyed blocks)
   */
  private updateTileSprites(tiles: Tile[][]): void {
    if (!this.spriteManager) return;

    let spriteIndex = 0;
    for (let y = 0; y < tiles.length; y++) {
      const row = tiles[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (!tile) continue;

        const sprite = this.tileSprites[spriteIndex];
        if (!sprite) {
          spriteIndex++;
          continue;
        }

        // Update tile type if changed (block destroyed -> empty)
        let tileType: 'empty' | 'wall' | 'block' = 'empty';
        if (tile.type === 'wall') tileType = 'wall';
        else if (tile.type === 'block') tileType = 'block';

        // Get correct texture from sprite manager
        const newSprite = this.spriteManager.createTileSprite(tileType, tile.variant || 0);
        if (newSprite) {
          sprite.texture = newSprite.texture;
          this.spriteManager.releaseSprite(newSprite, 'tile');
        }

        spriteIndex++;
      }
    }
  }

  /**
   * Clear all tile sprites
   */
  private clearTiles(): void {
    if (!this.spriteManager) return;

    for (const sprite of this.tileSprites) {
      this.spriteManager.releaseSprite(sprite, 'tile');
    }
    this.tileSprites = [];
    this.layers?.tiles.removeChildren();
  }

  // ==========================================================================
  // Player Rendering
  // ==========================================================================

  /**
   * Render all players
   */
  private renderPlayers(players: Player[], _interpolation: number): void {
    if (!this.layers || !this.spriteManager) return;

    const activeIds = new Set<string>();

    for (const player of players) {
      if (!player.isAlive) continue;

      activeIds.add(player.id);
      let entitySprite = this.entitySprites.get(player.id);

      if (!entitySprite) {
        // Create new player sprite
        const sprite = this.spriteManager.createPlayerSprite(player.color);
        if (sprite) {
          this.layers.players.addChild(sprite);
          entitySprite = { id: player.id, sprite, type: 'player' };
          this.entitySprites.set(player.id, entitySprite);
        }
      }

      if (entitySprite) {
        // Use position directly (interpolation can be added later with state history)
        const renderX = player.position.x;
        const renderY = player.position.y;

        entitySprite.sprite.x = renderX * this.tileSize + this.tileSize / 2;
        entitySprite.sprite.y = renderY * this.tileSize + this.tileSize / 2;

        // Determine if player is moving based on animation state
        const isMoving = player.animationState === 'walk';

        // Update animation frame
        const animation = this.spriteManager.getAnimationName(
          player.direction,
          isMoving
        );
        this.spriteManager.updatePlayerFrame(
          entitySprite.sprite,
          player.color,
          animation,
          player.animationFrame || 0
        );

        // Apply shield effect
        if (player.hasShield) {
          entitySprite.sprite.alpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
        } else {
          entitySprite.sprite.alpha = 1;
        }
      }
    }

    // Remove sprites for dead/disconnected players
    this.cleanupEntitySprites('player', activeIds);
  }

  // ==========================================================================
  // Bomb Rendering
  // ==========================================================================

  /**
   * Render all bombs
   */
  private renderBombs(bombs: Bomb[], _interpolation: number): void {
    if (!this.layers || !this.spriteManager) return;

    const activeIds = new Set<string>();

    for (const bomb of bombs) {
      activeIds.add(bomb.id);
      let entitySprite = this.entitySprites.get(bomb.id);

      if (!entitySprite) {
        // Create new bomb sprite
        const sprite = this.spriteManager.createBombSprite();
        if (sprite) {
          this.layers.bombs.addChild(sprite);
          entitySprite = { id: bomb.id, sprite, type: 'bomb' };
          this.entitySprites.set(bomb.id, entitySprite);
        }
      }

      if (entitySprite) {
        entitySprite.sprite.x = bomb.position.x * this.tileSize + this.tileSize / 2;
        entitySprite.sprite.y = bomb.position.y * this.tileSize + this.tileSize / 2;

        // Animate bomb pulsing
        const timeLeft = bomb.fuseTime - (Date.now() - bomb.plantedAt);
        const pulseSpeed = Math.max(100, timeLeft / 3);
        const scale = 1 + Math.sin(Date.now() / pulseSpeed) * 0.1;
        entitySprite.sprite.scale.set(scale);

        // Update animation frame
        const frameIndex = Math.floor((Date.now() / 200) % 3);
        this.spriteManager.updateBombFrame(entitySprite.sprite, frameIndex);
      }
    }

    // Remove exploded bomb sprites
    this.cleanupEntitySprites('bomb', activeIds);
  }

  // ==========================================================================
  // Powerup Rendering
  // ==========================================================================

  /**
   * Render all powerups
   */
  private renderPowerups(powerups: Powerup[]): void {
    if (!this.layers || !this.spriteManager) return;

    const activeIds = new Set<string>();

    for (const powerup of powerups) {
      activeIds.add(powerup.id);
      let entitySprite = this.entitySprites.get(powerup.id);

      if (!entitySprite) {
        // Create new powerup sprite
        const sprite = this.spriteManager.createPowerupSprite(powerup.type);
        if (sprite) {
          this.layers.items.addChild(sprite);
          entitySprite = { id: powerup.id, sprite, type: 'powerup' };
          this.entitySprites.set(powerup.id, entitySprite);
        }
      }

      if (entitySprite) {
        entitySprite.sprite.x = powerup.position.x * this.tileSize + this.tileSize / 2;
        entitySprite.sprite.y = powerup.position.y * this.tileSize + this.tileSize / 2;

        // Floating animation
        const floatOffset = Math.sin(Date.now() / 300) * 2;
        entitySprite.sprite.y += floatOffset;

        // Glow animation
        const isGlowing = Math.sin(Date.now() / 500) > 0;
        this.spriteManager.updatePowerupFrame(entitySprite.sprite, powerup.type, isGlowing);
      }
    }

    // Remove collected powerup sprites
    this.cleanupEntitySprites('powerup', activeIds);
  }

  // ==========================================================================
  // Explosion Rendering
  // ==========================================================================

  /**
   * Render all explosions
   */
  private renderExplosions(explosions: Explosion[]): void {
    if (!this.layers || !this.spriteManager) return;

    const activeIds = new Set<string>();

    for (const explosion of explosions) {
      // Render each segment (includes center and all directions)
      for (const segment of explosion.segments) {
        this.renderExplosionPart(
          explosion,
          segment.type,
          segment.position.x,
          segment.position.y,
          activeIds
        );
      }
    }

    // Remove finished explosion sprites
    this.cleanupEntitySprites('explosion', activeIds);
  }

  /**
   * Render a single explosion part
   */
  private renderExplosionPart(
    explosion: Explosion,
    type: 'center' | 'horizontal' | 'vertical' | 'end_up' | 'end_down' | 'end_left' | 'end_right',
    x: number,
    y: number,
    activeIds: Set<string>
  ): void {
    if (!this.layers || !this.spriteManager) return;

    const id = `${explosion.id}_${x}_${y}`;
    activeIds.add(id);

    let entitySprite = this.entitySprites.get(id);

    if (!entitySprite) {
      const sprite = this.spriteManager.createExplosionSprite(type);
      if (sprite) {
        this.layers.explosions.addChild(sprite);
        entitySprite = { id, sprite, type: 'explosion' };
        this.entitySprites.set(id, entitySprite);
      }
    }

    if (entitySprite) {
      entitySprite.sprite.x = x * this.tileSize + this.tileSize / 2;
      entitySprite.sprite.y = y * this.tileSize + this.tileSize / 2;

      // Animation frame based on explosion lifetime
      const elapsed = Date.now() - explosion.startedAt;
      const frameIndex = Math.floor((elapsed / explosion.duration) * 4);
      this.spriteManager.updateExplosionFrame(entitySprite.sprite, type, frameIndex);

      // Fade out near end
      const progress = elapsed / explosion.duration;
      if (progress > 0.7) {
        entitySprite.sprite.alpha = 1 - (progress - 0.7) / 0.3;
      } else {
        entitySprite.sprite.alpha = 1;
      }
    }
  }

  // ==========================================================================
  // Debug Rendering
  // ==========================================================================

  /**
   * Toggle debug overlay
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (this.debugGraphics) {
      this.debugGraphics.visible = enabled;
    }
  }

  /**
   * Render debug overlay with hitboxes and grid
   */
  private renderDebugOverlay(state: GameState): void {
    if (!this.debugGraphics || !this.PIXI) return;

    this.debugGraphics.clear();

    // Draw grid
    this.debugGraphics.setStrokeStyle({ width: 1, color: 0x333333 });
    for (let x = 0; x <= this.mapWidth; x++) {
      this.debugGraphics.moveTo(x * this.tileSize, 0);
      this.debugGraphics.lineTo(x * this.tileSize, this.mapHeight * this.tileSize);
    }
    for (let y = 0; y <= this.mapHeight; y++) {
      this.debugGraphics.moveTo(0, y * this.tileSize);
      this.debugGraphics.lineTo(this.mapWidth * this.tileSize, y * this.tileSize);
    }
    this.debugGraphics.stroke();

    // Draw player hitboxes
    this.debugGraphics.setStrokeStyle({ width: 2, color: 0x00ff00 });
    for (const player of Object.values(state.players)) {
      if (!player.isAlive) continue;
      const px = player.position.x * this.tileSize;
      const py = player.position.y * this.tileSize;
      this.debugGraphics.rect(px, py, this.tileSize, this.tileSize);
    }
    this.debugGraphics.stroke();

    // Draw bomb hitboxes
    this.debugGraphics.setStrokeStyle({ width: 2, color: 0xff0000 });
    for (const bomb of Object.values(state.bombs)) {
      const bx = bomb.position.x * this.tileSize;
      const by = bomb.position.y * this.tileSize;
      this.debugGraphics.rect(bx, by, this.tileSize, this.tileSize);
    }
    this.debugGraphics.stroke();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clean up sprites for removed entities
   */
  private cleanupEntitySprites(type: string, activeIds: Set<string>): void {
    if (!this.spriteManager) return;

    for (const [id, entitySprite] of this.entitySprites) {
      if (entitySprite.type === type && !activeIds.has(id)) {
        entitySprite.sprite.parent?.removeChild(entitySprite.sprite);
        this.spriteManager.releaseSprite(entitySprite.sprite, type);
        this.entitySprites.delete(id);
      }
    }
  }

  /**
   * Get the main game container
   */
  getGameContainer(): PixiContainer | null {
    return this.gameContainer;
  }

  /**
   * Get a specific render layer
   */
  getLayer(name: keyof RenderLayers): PixiContainer | null {
    return this.layers?.[name] || null;
  }

  /**
   * Add a sprite to a specific layer
   */
  addToLayer(layerName: keyof RenderLayers, sprite: Sprite): void {
    this.layers?.[layerName].addChild(sprite);
  }

  /**
   * Remove a sprite from its layer
   */
  removeFromLayer(sprite: Sprite): void {
    sprite.parent?.removeChild(sprite);
  }

  /**
   * Clear all entity sprites (for game reset)
   */
  clearAllEntities(): void {
    if (!this.spriteManager) return;

    for (const [_id, entitySprite] of this.entitySprites) {
      entitySprite.sprite.parent?.removeChild(entitySprite.sprite);
      this.spriteManager.releaseSprite(entitySprite.sprite, entitySprite.type);
    }
    this.entitySprites.clear();

    this.clearTiles();
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.clearAllEntities();

    if (this.gameContainer) {
      this.gameContainer.destroy({ children: true });
      this.gameContainer = null;
    }

    this.layers = null;
    this.debugGraphics = null;
    this.PIXI = null;
  }
}
