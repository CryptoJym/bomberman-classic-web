/**
 * Placeholder Asset Generation System for Bomberman Online
 *
 * This module generates CSS-based placeholder sprites for development.
 * These will be replaced with real pixel art assets later.
 */

import type {
  CharacterColor,
  CharacterAnimation,
  BombAnimation,
  TileType,
  PowerupType,
  EffectAnimation,
  PlaceholderConfig,
  PlaceholderGeneratorOptions,
} from '@/types/assets';

// ============================================================================
// Color Constants
// ============================================================================

/**
 * Character placeholder colors
 */
export const CHARACTER_COLORS: Record<CharacterColor, string> = {
  white: '#FFFFFF',
  black: '#2A2A2A',
  red: '#FF4444',
  blue: '#4488FF',
  green: '#44CC44',
  yellow: '#FFCC00',
  pink: '#FF88CC',
  cyan: '#44CCCC',
};

/**
 * Power-up placeholder colors
 */
export const POWERUP_COLORS: Record<PowerupType, string> = {
  bomb_up: '#4488FF',
  fire_up: '#FF8844',
  speed_up: '#44FF44',
  kick: '#FFFF44',
  punch: '#FF4444',
  shield: '#FFFFFF',
  skull: '#8844FF',
  full_fire: '#FF0000',
};

/**
 * Tile placeholder colors
 */
export const TILE_COLORS: Record<'ground' | 'wall' | 'block', string> = {
  ground: '#4A8C4A',
  wall: '#8B8B8B',
  block: '#CD853F',
};

// ============================================================================
// Placeholder Generator Class
// ============================================================================

/**
 * Generates placeholder sprites as canvas elements or data URLs
 */
export class PlaceholderGenerator {
  private options: Required<PlaceholderGeneratorOptions>;

  constructor(options: PlaceholderGeneratorOptions = {}) {
    this.options = {
      showLabel: options.showLabel ?? true,
      showBorder: options.showBorder ?? true,
      fontSize: options.fontSize ?? 10,
      borderRadius: options.borderRadius ?? 2,
    };
  }

  /**
   * Create a canvas element with the placeholder
   */
  createCanvas(config: PlaceholderConfig): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Fill background
    ctx.fillStyle = config.color;
    if (this.options.borderRadius > 0) {
      this.roundRect(ctx, 0, 0, config.width, config.height, this.options.borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, config.width, config.height);
    }

    // Draw border
    if (this.options.showBorder && config.borderColor) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth ?? 1;
      if (this.options.borderRadius > 0) {
        this.roundRect(ctx, 0.5, 0.5, config.width - 1, config.height - 1, this.options.borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(0.5, 0.5, config.width - 1, config.height - 1);
      }
    }

    // Draw label
    if (this.options.showLabel && config.label) {
      ctx.fillStyle = config.textColor ?? '#000000';
      ctx.font = `${this.options.fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate label if too long
      const maxWidth = config.width - 4;
      let label = config.label;
      while (ctx.measureText(label).width > maxWidth && label.length > 1) {
        label = label.slice(0, -1);
      }

      ctx.fillText(label, config.width / 2, config.height / 2);
    }

    return canvas;
  }

  /**
   * Create a data URL from the placeholder
   */
  createDataURL(config: PlaceholderConfig): string {
    const canvas = this.createCanvas(config);
    return canvas.toDataURL('image/png');
  }

  /**
   * Create a CSS background style string
   */
  createCSSBackground(config: PlaceholderConfig): string {
    return `url('${this.createDataURL(config)}')`;
  }

  /**
   * Helper to draw rounded rectangles
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// ============================================================================
// Pre-built Placeholder Factories
// ============================================================================

/**
 * Generate a character placeholder
 */
export function createCharacterPlaceholder(
  color: CharacterColor,
  animation?: CharacterAnimation
): PlaceholderConfig {
  const baseColor = CHARACTER_COLORS[color];
  const label = animation ? animation.slice(0, 4).toUpperCase() : color.slice(0, 1).toUpperCase();

  return {
    width: 32,
    height: 32,
    color: baseColor,
    borderColor: darkenColor(baseColor, 30),
    borderWidth: 2,
    label,
    textColor: getContrastColor(baseColor),
  };
}

/**
 * Generate a bomb placeholder
 */
export function createBombPlaceholder(animation?: BombAnimation): PlaceholderConfig {
  const isExplosion = animation?.startsWith('explode');

  return {
    width: 32,
    height: 32,
    color: isExplosion ? '#FF6600' : '#1A1A1A',
    borderColor: isExplosion ? '#FFFF00' : '#4A4A4A',
    borderWidth: 2,
    label: isExplosion ? 'EXP' : 'BMB',
    textColor: '#FFFFFF',
  };
}

/**
 * Generate a tile placeholder
 */
export function createTilePlaceholder(type: TileType): PlaceholderConfig {
  let category: 'ground' | 'wall' | 'block';

  if (type.startsWith('ground')) {
    category = 'ground';
  } else if (type.startsWith('wall')) {
    category = 'wall';
  } else {
    category = 'block';
  }

  const color = TILE_COLORS[category];

  return {
    width: 32,
    height: 32,
    color,
    borderColor: darkenColor(color, 20),
    borderWidth: 1,
    label: type.slice(0, 3).toUpperCase(),
    textColor: getContrastColor(color),
  };
}

/**
 * Generate a power-up placeholder
 */
export function createPowerupPlaceholder(type: PowerupType): PlaceholderConfig {
  const color = POWERUP_COLORS[type];

  // Create label from type
  const labelMap: Record<PowerupType, string> = {
    bomb_up: 'B+',
    fire_up: 'F+',
    speed_up: 'S+',
    kick: 'KCK',
    punch: 'PNC',
    shield: 'SHD',
    skull: 'SKL',
    full_fire: 'MAX',
  };

  return {
    width: 24,
    height: 24,
    color,
    borderColor: lightenColor(color, 30),
    borderWidth: 2,
    label: labelMap[type],
    textColor: getContrastColor(color),
  };
}

/**
 * Generate an effect placeholder
 */
export function createEffectPlaceholder(effect: EffectAnimation): PlaceholderConfig {
  const effectColors: Record<EffectAnimation, string> = {
    spawn: '#FFFFFF',
    teleport: '#88CCFF',
    shield_hit: '#FFD700',
    powerup_collect: '#FFFF00',
    dust: '#C0C0C0',
  };

  return {
    width: 32,
    height: 32,
    color: effectColors[effect],
    borderColor: darkenColor(effectColors[effect], 20),
    borderWidth: 1,
    label: effect.slice(0, 3).toUpperCase(),
    textColor: '#000000',
  };
}

/**
 * Generate a UI element placeholder
 */
export function createUIPlaceholder(
  width: number,
  height: number,
  label: string
): PlaceholderConfig {
  return {
    width,
    height,
    color: '#4A4A8A',
    borderColor: '#6A6AAA',
    borderWidth: 2,
    label,
    textColor: '#FFFFFF',
  };
}

// ============================================================================
// Sprite Sheet Generation
// ============================================================================

/**
 * Generate a complete character sprite sheet placeholder
 */
export function generateCharacterSpriteSheet(generator: PlaceholderGenerator): HTMLCanvasElement {
  const sheetWidth = 512;
  const sheetHeight = 512;
  const frameSize = 32;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill with transparency
  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  const colors: CharacterColor[] = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'cyan'];

  colors.forEach((color, colorIndex) => {
    const baseY = colorIndex * 64;

    // Generate frames for each animation state
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const config = createCharacterPlaceholder(color);
        const frameCanvas = generator.createCanvas(config);
        ctx.drawImage(frameCanvas, col * frameSize, baseY + row * frameSize);
      }
    }
  });

  return canvas;
}

/**
 * Generate a complete bomb sprite sheet placeholder
 */
export function generateBombSpriteSheet(generator: PlaceholderGenerator): HTMLCanvasElement {
  const sheetWidth = 256;
  const sheetHeight = 128;
  const frameSize = 32;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  // Bomb idle and fuse
  for (let i = 0; i < 8; i++) {
    const isExplosion = i >= 4;
    const config = createBombPlaceholder(isExplosion ? 'explode_center' : 'idle');
    const frameCanvas = generator.createCanvas(config);
    ctx.drawImage(frameCanvas, i * frameSize, 0);
  }

  // Explosion frames
  for (let row = 1; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const config = createBombPlaceholder('explode_center');
      const frameCanvas = generator.createCanvas(config);
      ctx.drawImage(frameCanvas, col * frameSize, row * frameSize);
    }
  }

  return canvas;
}

/**
 * Generate a complete tile sprite sheet placeholder
 */
export function generateTileSpriteSheet(generator: PlaceholderGenerator): HTMLCanvasElement {
  const sheetWidth = 256;
  const sheetHeight = 128;
  const frameSize = 32;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  const tileTypes: TileType[] = [
    'ground_1', 'ground_2', 'ground_3', 'ground_4',
    'wall_1', 'wall_2', 'wall_3', 'wall_4',
    'block_1', 'block_2', 'block_3', 'block_4',
  ];

  tileTypes.forEach((type, index) => {
    const col = index % 8;
    const row = Math.floor(index / 8);
    const config = createTilePlaceholder(type);
    const frameCanvas = generator.createCanvas(config);
    ctx.drawImage(frameCanvas, col * frameSize, row * frameSize);
  });

  return canvas;
}

/**
 * Generate a complete power-up sprite sheet placeholder
 */
export function generatePowerupSpriteSheet(generator: PlaceholderGenerator): HTMLCanvasElement {
  const sheetWidth = 192;
  const sheetHeight = 48;
  const frameSize = 24;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  const powerups: PowerupType[] = [
    'bomb_up', 'fire_up', 'speed_up', 'kick',
    'punch', 'shield', 'skull', 'full_fire',
  ];

  powerups.forEach((type, index) => {
    // Normal state
    const config = createPowerupPlaceholder(type);
    const frameCanvas = generator.createCanvas(config);
    ctx.drawImage(frameCanvas, index * frameSize, 0);

    // Glow state (slightly brighter)
    const glowConfig = {
      ...config,
      color: lightenColor(POWERUP_COLORS[type], 20),
    };
    const glowCanvas = generator.createCanvas(glowConfig);
    ctx.drawImage(glowCanvas, index * frameSize, frameSize);
  });

  return canvas;
}

// ============================================================================
// Color Utility Functions
// ============================================================================

/**
 * Darken a hex color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  const factor = 1 - percent / 100;
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  const factor = percent / 100;
  return rgbToHex(
    Math.round(rgb.r + (255 - rgb.r) * factor),
    Math.round(rgb.g + (255 - rgb.g) * factor),
    Math.round(rgb.b + (255 - rgb.b) * factor)
  );
}

/**
 * Get a contrasting text color (black or white) for a background
 */
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return '#000000';
  }

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================================================
// All Placeholders Export
// ============================================================================

/**
 * Create all placeholder sprite sheets
 * Returns an object with data URLs for each sprite sheet
 */
export function createAllPlaceholders(): Record<string, string> {
  const generator = new PlaceholderGenerator();

  return {
    characters: generateCharacterSpriteSheet(generator).toDataURL('image/png'),
    bombs: generateBombSpriteSheet(generator).toDataURL('image/png'),
    tiles: generateTileSpriteSheet(generator).toDataURL('image/png'),
    powerups: generatePowerupSpriteSheet(generator).toDataURL('image/png'),
  };
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Placeholder asset URLs for SSR-safe usage
 * These are simple colored data URLs that work without canvas
 */
export const PLACEHOLDER_URLS = {
  character: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA5SURBVFhH7c0xAQAwDASh+je9DSDLB2ZBBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/AIivAAZ5JQA1tJ0nVgAAAABJRU5ErkJggg==',
  bomb: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA5SURBVFhH7c0xAQAwDASh+je9DSDLB2ZBBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/AIivAAZaGgA1xJ0n1gAAAABJRU5ErkJggg==',
  tile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA5SURBVFhH7c0xAQAwDASh+je9DYi0fGAWdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/AJivAEZ5IwBLOzMnmgAAAABJRU5ErkJggg==',
  powerup: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAlSURBVEhL7cMBAQAwCAQwn37/TjphgVnQAQAAAAAAAADAPwL6qgAPSSUA/WdB9QAAAABJRU5ErkJggg==',
};
