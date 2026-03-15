/**
 * Asset Type Definitions for Bomberman Online
 *
 * These types define the structure for all game assets including
 * sprites, animations, audio, and fonts.
 */

// ============================================================================
// Core Asset Types
// ============================================================================

/**
 * Base sprite sheet configuration
 */
export interface SpriteSheet {
  /** Unique identifier for the sprite sheet */
  key: string;
  /** Path to the sprite sheet image file */
  path: string;
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Number of columns in the sprite sheet */
  columns?: number;
  /** Number of rows in the sprite sheet */
  rows?: number;
  /** Animation definitions for this sprite sheet */
  animations?: Record<string, AnimationConfig>;
}

/**
 * Animation configuration for sprite animations
 */
export interface AnimationConfig {
  /** Frame indices to play in sequence */
  frames: number[];
  /** Frames per second for this animation */
  frameRate: number;
  /** Whether the animation should loop */
  loop: boolean;
  /** Optional callback when animation completes (for non-looping) */
  onComplete?: () => void;
}

/**
 * Static sprite region (non-animated)
 */
export interface SpriteRegion {
  /** X position in the sprite sheet */
  x: number;
  /** Y position in the sprite sheet */
  y: number;
  /** Width of the region */
  width: number;
  /** Height of the region */
  height: number;
}

// ============================================================================
// Character Assets
// ============================================================================

/**
 * Character color variants
 */
export type CharacterColor =
  | 'white'
  | 'black'
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'cyan';

/**
 * Character animation states
 */
export type CharacterAnimation =
  | 'idle_down'
  | 'idle_up'
  | 'idle_left'
  | 'idle_right'
  | 'walk_down'
  | 'walk_up'
  | 'walk_left'
  | 'walk_right'
  | 'place_bomb'
  | 'kick'
  | 'punch'
  | 'hit'
  | 'death'
  | 'victory';

/**
 * Character sprite sheet configuration
 */
export interface CharacterSpriteSheet extends SpriteSheet {
  /** Frame offset for each character color variant */
  characterOffsets: Record<CharacterColor, number>;
  /** All available animations */
  animations: Record<CharacterAnimation, AnimationConfig>;
}

// ============================================================================
// Bomb Assets
// ============================================================================

/**
 * Bomb animation states
 */
export type BombAnimation =
  | 'idle'
  | 'fuse'
  | 'explode_center'
  | 'explode_horizontal'
  | 'explode_vertical'
  | 'explode_end_up'
  | 'explode_end_down'
  | 'explode_end_left'
  | 'explode_end_right';

/**
 * Bomb sprite sheet configuration
 */
export interface BombSpriteSheet extends SpriteSheet {
  animations: Record<BombAnimation, AnimationConfig>;
}

// ============================================================================
// Tile Assets
// ============================================================================

/**
 * Tile types available in the game
 */
export type TileType =
  | 'ground_1'
  | 'ground_2'
  | 'ground_3'
  | 'ground_4'
  | 'wall_1'
  | 'wall_2'
  | 'wall_3'
  | 'wall_4'
  | 'block_1'
  | 'block_2'
  | 'block_3'
  | 'block_4';

/**
 * Tile sprite sheet configuration
 */
export interface TileSpriteSheet extends SpriteSheet {
  /** Map of tile type to frame index */
  tiles: Record<TileType, number>;
  /** Destruction animation */
  animations: {
    block_destroy: AnimationConfig;
  };
}

// ============================================================================
// Power-up Assets
// ============================================================================

/**
 * Power-up types
 */
export type PowerupType =
  | 'bomb_up'
  | 'fire_up'
  | 'speed_up'
  | 'kick'
  | 'punch'
  | 'shield'
  | 'skull'
  | 'full_fire';

/**
 * Power-up item configuration
 */
export interface PowerupItem {
  /** Base frame index */
  frame: number;
  /** Frames for glow animation [normal, glowing] */
  glowFrames: [number, number];
}

/**
 * Power-up sprite sheet configuration
 */
export interface PowerupSpriteSheet extends SpriteSheet {
  /** Individual power-up items */
  items: Record<PowerupType, PowerupItem>;
  /** Global glow animation config */
  glowAnimation: {
    frameRate: number;
    loop: boolean;
  };
}

// ============================================================================
// Effects Assets
// ============================================================================

/**
 * Effect animation types
 */
export type EffectAnimation =
  | 'spawn'
  | 'teleport'
  | 'shield_hit'
  | 'powerup_collect'
  | 'dust';

/**
 * Effects sprite sheet configuration
 */
export interface EffectsSpriteSheet extends SpriteSheet {
  animations: Record<EffectAnimation, AnimationConfig>;
}

// ============================================================================
// UI Assets
// ============================================================================

/**
 * UI element identifiers
 */
export type UIElement =
  | 'button_normal'
  | 'button_hover'
  | 'button_pressed'
  | 'button_disabled'
  | 'panel_corner_tl'
  | 'panel_corner_tr'
  | 'panel_corner_bl'
  | 'panel_corner_br'
  | 'panel_edge_top'
  | 'panel_edge_bottom'
  | 'panel_edge_left'
  | 'panel_edge_right'
  | 'panel_center'
  | 'health_bar_bg'
  | 'health_bar_fill'
  | 'timer_bg'
  | 'scoreboard_bg'
  | 'player_indicator'
  | 'crown'
  | 'skull_icon'
  | 'bomb_icon'
  | 'fire_icon'
  | 'speed_icon';

/**
 * Font configuration
 */
export interface FontConfig {
  /** X position in sprite sheet */
  x: number;
  /** Y position in sprite sheet */
  y: number;
  /** Width of each character */
  charWidth: number;
  /** Height of each character */
  charHeight: number;
}

/**
 * UI sprite sheet configuration
 */
export interface UISpriteSheet {
  path: string;
  elements: Record<UIElement, SpriteRegion>;
  fonts: {
    small: FontConfig;
    large: FontConfig;
  };
}

// ============================================================================
// Audio Assets
// ============================================================================

/**
 * Music track identifiers
 */
export type MusicTrack =
  | 'bgm_menu'
  | 'bgm_game'
  | 'bgm_victory'
  | 'bgm_tension';

/**
 * Sound effect identifiers
 */
export type SoundEffect =
  | 'bomb_place'
  | 'explosion'
  | 'explosion_chain'
  | 'powerup_collect'
  | 'player_death'
  | 'victory'
  | 'block_destroy'
  | 'menu_select'
  | 'menu_confirm'
  | 'menu_cancel'
  | 'countdown'
  | 'game_start'
  | 'kick'
  | 'punch'
  | 'shield_break'
  | 'skull_effect'
  | 'walk'
  | 'time_warning';

/**
 * Audio file configuration
 */
export interface AudioConfig {
  /** Path to the audio file */
  path: string;
  /** Volume (0.0 to 1.0) */
  volume: number;
  /** Whether the audio should loop */
  loop?: boolean;
}

/**
 * Complete audio manifest
 */
export interface AudioManifest {
  music: Record<MusicTrack, AudioConfig>;
  sfx: Record<SoundEffect, AudioConfig>;
}

// ============================================================================
// Font Assets
// ============================================================================

/**
 * Bitmap font configuration
 */
export interface BitmapFontConfig {
  /** Path to the font definition file (.fnt) */
  path: string;
  /** Path to the font texture */
  texture: string;
  /** Base font size in pixels */
  size: number;
}

// ============================================================================
// Complete Asset Manifest
// ============================================================================

/**
 * Complete asset manifest structure
 */
export interface AssetManifest {
  version: string;
  lastUpdated: string;
  baseResolution: {
    width: number;
    height: number;
    scale: number;
  };
  sprites: {
    characters: CharacterSpriteSheet;
    bombs: BombSpriteSheet;
    tiles: TileSpriteSheet;
    powerups: PowerupSpriteSheet;
    effects: EffectsSpriteSheet;
    ui: UISpriteSheet;
    achievements: SpriteSheet;
  };
  audio: AudioManifest;
  fonts: Record<string, BitmapFontConfig>;
}

// ============================================================================
// Color Palette Types
// ============================================================================

/**
 * 16-color palette (SNES style)
 */
export type ColorPalette = [
  string, string, string, string,
  string, string, string, string,
  string, string, string, string,
  string, string, string, string
];

/**
 * Character palette configuration
 */
export interface CharacterPalette {
  name: string;
  palette: ColorPalette;
}

/**
 * Map theme color scheme
 */
export interface MapThemeColors {
  name: string;
  ground: string[];
  walls: string[];
  blocks: string[];
  shadow: string;
  highlight: string;
  /** Optional special effects colors */
  specialEffect?: string[];
}

/**
 * Power-up color scheme
 */
export interface PowerupColors {
  primary: string;
  secondary: string;
  glow: string;
  icon: string;
}

/**
 * UI color scheme
 */
export interface UIColors {
  primary: {
    dark: string;
    medium: string;
    light: string;
  };
  accent: {
    gold: string;
    goldDark: string;
    goldLight: string;
  };
  text: {
    white: string;
    gray: string;
    dark: string;
  };
  backgrounds: {
    panel: string;
    panelBorder: string;
    modal: string;
  };
  buttons: {
    normal: ButtonColors;
    hover: ButtonColors;
    pressed: ButtonColors;
    disabled: ButtonColors;
  };
  health: {
    full: string;
    medium: string;
    low: string;
    background: string;
  };
  timer: {
    normal: string;
    warning: string;
    critical: string;
  };
}

/**
 * Button color state
 */
export interface ButtonColors {
  fill: string;
  border: string;
  text: string;
}

/**
 * Achievement rarity border colors
 */
export interface AchievementBorderColors {
  outer: string;
  inner: string;
  shine: string;
}

/**
 * Legendary achievement animated border
 */
export interface LegendaryBorderColors {
  colors: string[];
  animationSpeed: number;
}

/**
 * Complete color palette manifest
 */
export interface ColorPaletteManifest {
  version: string;
  colorFormat: string;
  characters: Record<CharacterColor, CharacterPalette>;
  bombs: {
    standard: { name: string; palette: ColorPalette };
    explosion: { name: string; palette: ColorPalette };
  };
  tiles: Record<string, MapThemeColors>;
  powerups: Record<PowerupType, PowerupColors>;
  ui: UIColors;
  effects: Record<string, string[]>;
  achievements: {
    borders: {
      common: AchievementBorderColors;
      rare: AchievementBorderColors;
      epic: AchievementBorderColors;
      legendary: LegendaryBorderColors;
    };
  };
  particles: {
    explosion: Record<string, string>;
    sparkle: Record<string, string>;
    debris: Record<string, string[]>;
  };
}

// ============================================================================
// Asset Loading State
// ============================================================================

/**
 * Individual asset loading state
 */
export interface AssetLoadingState {
  /** Asset key/identifier */
  key: string;
  /** Current loading status */
  status: 'pending' | 'loading' | 'loaded' | 'error';
  /** Loading progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Overall asset loading progress
 */
export interface AssetLoadingProgress {
  /** Total number of assets to load */
  total: number;
  /** Number of assets loaded */
  loaded: number;
  /** Number of assets that failed to load */
  failed: number;
  /** Overall progress percentage (0-100) */
  percentage: number;
  /** Individual asset states */
  assets: Record<string, AssetLoadingState>;
  /** Whether all assets are loaded */
  isComplete: boolean;
}

// ============================================================================
// Placeholder Configuration
// ============================================================================

/**
 * Placeholder sprite configuration
 */
export interface PlaceholderConfig {
  /** Width of the placeholder */
  width: number;
  /** Height of the placeholder */
  height: number;
  /** Background color */
  color: string;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Text label to display */
  label?: string;
  /** Text color */
  textColor?: string;
}

/**
 * Placeholder generator options
 */
export interface PlaceholderGeneratorOptions {
  /** Whether to add a label */
  showLabel?: boolean;
  /** Whether to add a border */
  showBorder?: boolean;
  /** Font size for labels */
  fontSize?: number;
  /** Border radius */
  borderRadius?: number;
}
