/**
 * Map Generator for Bomberman Game Server
 * Generates random and custom maps with guaranteed playability
 */

import crypto from 'crypto';
import type { Position, TileType, GameMap, PowerupType } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAP_WIDTH = 15;
const DEFAULT_MAP_HEIGHT = 13;
const MAX_PLAYERS = 16;

/** Tile type constants matching TileType enum */
const TILE = {
  EMPTY: 0 as TileType,
  SOLID: 1 as TileType,
  SOFT: 2 as TileType,
};

/** Probability of soft block placement (0-1) */
const SOFT_BLOCK_PROBABILITY = 0.72;

/** Minimum clear radius around spawn points */
const SPAWN_CLEAR_RADIUS = 1;

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Mulberry32 PRNG - fast, deterministic random number generator
 * @param seed - Initial seed value
 * @returns Function that returns random numbers [0, 1)
 */
function mulberry32(seed: number): () => number {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// SPAWN POINT GENERATION
// ============================================================================

/**
 * Generate spawn positions for a given map size
 * Places spawns in corners, midpoints of edges, and fills remaining slots
 */
export function getSpawnPositions(
  width: number,
  height: number,
  maxPlayers: number = MAX_PLAYERS
): Position[] {
  const positions: Position[] = [];

  // Corners first (most important)
  positions.push({ x: 1, y: 1 }); // Top-left
  positions.push({ x: width - 2, y: 1 }); // Top-right
  positions.push({ x: 1, y: height - 2 }); // Bottom-left
  positions.push({ x: width - 2, y: height - 2 }); // Bottom-right

  // Near-corner positions (offset by 2 tiles)
  positions.push({ x: 1, y: 3 });
  positions.push({ x: 3, y: 1 });
  positions.push({ x: width - 2, y: 3 });
  positions.push({ x: width - 4, y: 1 });
  positions.push({ x: 1, y: height - 4 });
  positions.push({ x: 3, y: height - 2 });
  positions.push({ x: width - 2, y: height - 4 });
  positions.push({ x: width - 4, y: height - 2 });

  // Edge midpoints
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  positions.push({ x: midX, y: 1 }); // Top middle
  positions.push({ x: 1, y: midY }); // Left middle
  positions.push({ x: width - 2, y: midY }); // Right middle
  positions.push({ x: midX, y: height - 2 }); // Bottom middle

  // Return limited by max players
  return positions.slice(0, maxPlayers);
}

// ============================================================================
// MAP GENERATION
// ============================================================================

export interface MapGeneratorOptions {
  /** Map width in tiles (default: 15) */
  width?: number;
  /** Map height in tiles (default: 13) */
  height?: number;
  /** Random seed for deterministic generation */
  seed?: number;
  /** Probability of soft blocks (0-1, default: 0.72) */
  softBlockProbability?: number;
  /** Number of players to accommodate */
  playerCount?: number;
  /** Map name */
  name?: string;
}

/**
 * Generate a random game map
 */
export function generateMap(options: MapGeneratorOptions = {}): GameMap {
  const {
    width = DEFAULT_MAP_WIDTH,
    height = DEFAULT_MAP_HEIGHT,
    seed = Math.floor(Math.random() * 1e9),
    softBlockProbability = SOFT_BLOCK_PROBABILITY,
    playerCount = 4,
    name = `Map_${seed}`,
  } = options;

  const rng = mulberry32(seed);

  // Initialize tiles array with empty tiles
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.EMPTY)
  );

  // Add border walls (solid/indestructible)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        tiles[y][x] = TILE.SOLID;
      }
    }
  }

  // Add interior pillar walls (classic Bomberman pattern)
  // Solid blocks at even x,y positions inside the playable area
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      tiles[y][x] = TILE.SOLID;
    }
  }

  // Fill remaining empty tiles with soft blocks randomly
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === TILE.EMPTY && rng() < softBlockProbability) {
        tiles[y][x] = TILE.SOFT;
      }
    }
  }

  // Get spawn positions and clear area around them
  const spawnPoints = getSpawnPositions(width, height, playerCount);
  clearSpawnAreas(tiles, spawnPoints, width, height);

  return {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    tiles,
    spawnPoints,
    isOfficial: false,
  };
}

/**
 * Clear soft blocks around spawn points to ensure players can move
 */
function clearSpawnAreas(
  tiles: TileType[][],
  spawnPoints: Position[],
  width: number,
  height: number
): void {
  for (const spawn of spawnPoints) {
    // Clear spawn point itself
    if (isValidTile(spawn.x, spawn.y, width, height)) {
      if (tiles[spawn.y][spawn.x] === TILE.SOFT) {
        tiles[spawn.y][spawn.x] = TILE.EMPTY;
      }
    }

    // Clear surrounding tiles within radius
    for (let dy = -SPAWN_CLEAR_RADIUS; dy <= SPAWN_CLEAR_RADIUS; dy++) {
      for (let dx = -SPAWN_CLEAR_RADIUS; dx <= SPAWN_CLEAR_RADIUS; dx++) {
        const x = spawn.x + dx;
        const y = spawn.y + dy;
        if (isValidTile(x, y, width, height)) {
          if (tiles[y][x] === TILE.SOFT) {
            tiles[y][x] = TILE.EMPTY;
          }
        }
      }
    }
  }
}

/**
 * Check if coordinates are within playable map bounds
 */
function isValidTile(x: number, y: number, width: number, height: number): boolean {
  return x > 0 && x < width - 1 && y > 0 && y < height - 1;
}

// ============================================================================
// CUSTOM MAP LOADING
// ============================================================================

export interface CustomMapData {
  /** Map name */
  name: string;
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** 2D tile array (numeric values) */
  tiles: number[][];
  /** Spawn point positions */
  spawnPoints: Position[];
  /** Creator ID */
  creatorId?: string;
}

/**
 * Validate and load a custom map from data
 */
export function loadCustomMap(data: CustomMapData): GameMap {
  const { name, width, height, tiles, spawnPoints, creatorId } = data;

  // Validate dimensions
  if (width < 9 || width > 31 || height < 9 || height > 25) {
    throw new Error('Invalid map dimensions. Width: 9-31, Height: 9-25');
  }

  // Odd dimensions work best for the pillar pattern
  if (width % 2 === 0 || height % 2 === 0) {
    console.warn('Even map dimensions may cause asymmetry');
  }

  // Validate tiles array
  if (!Array.isArray(tiles) || tiles.length !== height) {
    throw new Error('Tiles array does not match height');
  }

  for (let y = 0; y < height; y++) {
    if (!Array.isArray(tiles[y]) || tiles[y].length !== width) {
      throw new Error(`Row ${y} does not match width`);
    }
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      if (tile < 0 || tile > 2) {
        throw new Error(`Invalid tile type at (${x}, ${y}): ${tile}`);
      }
    }
  }

  // Validate spawn points
  if (!Array.isArray(spawnPoints) || spawnPoints.length < 2) {
    throw new Error('Map must have at least 2 spawn points');
  }

  for (const spawn of spawnPoints) {
    if (!isValidTile(spawn.x, spawn.y, width, height)) {
      throw new Error(`Invalid spawn point: (${spawn.x}, ${spawn.y})`);
    }
    if (tiles[spawn.y][spawn.x] !== TILE.EMPTY) {
      throw new Error(`Spawn point (${spawn.x}, ${spawn.y}) is not on empty tile`);
    }
  }

  // Verify borders are solid
  for (let x = 0; x < width; x++) {
    if (tiles[0][x] !== TILE.SOLID || tiles[height - 1][x] !== TILE.SOLID) {
      throw new Error('Map borders must be solid walls');
    }
  }
  for (let y = 0; y < height; y++) {
    if (tiles[y][0] !== TILE.SOLID || tiles[y][width - 1] !== TILE.SOLID) {
      throw new Error('Map borders must be solid walls');
    }
  }

  // Verify accessibility - each spawn should reach at least one other spawn
  validateAccessibility(tiles as TileType[][], spawnPoints, width, height);

  return {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    tiles: tiles as TileType[][],
    spawnPoints,
    isOfficial: false,
    creatorId,
  };
}

/**
 * Verify that all spawn points can potentially reach each other
 * (through soft blocks that can be destroyed)
 */
function validateAccessibility(
  tiles: TileType[][],
  spawnPoints: Position[],
  width: number,
  height: number
): void {
  if (spawnPoints.length < 2) return;

  // BFS from first spawn to verify reachability
  const visited = new Set<string>();
  const queue: Position[] = [spawnPoints[0]];
  visited.add(`${spawnPoints[0].x},${spawnPoints[0].y}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const { dx, dy } of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;

      if (visited.has(key)) continue;
      if (!isValidTile(nx, ny, width, height)) continue;

      const tile = tiles[ny][nx];
      // Can traverse empty tiles and soft blocks (destructible)
      if (tile === TILE.EMPTY || tile === TILE.SOFT) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  // Check all spawn points are reachable
  for (let i = 1; i < spawnPoints.length; i++) {
    const key = `${spawnPoints[i].x},${spawnPoints[i].y}`;
    if (!visited.has(key)) {
      throw new Error(`Spawn point ${i} (${spawnPoints[i].x}, ${spawnPoints[i].y}) is not reachable`);
    }
  }
}

// ============================================================================
// OFFICIAL MAPS
// ============================================================================

/** Classic 15x13 map layout */
export const CLASSIC_MAP: CustomMapData = {
  name: 'Classic',
  width: 15,
  height: 13,
  tiles: generateClassicTiles(15, 13),
  spawnPoints: getSpawnPositions(15, 13, 4),
};

/** Large 21x17 map for more players */
export const ARENA_MAP: CustomMapData = {
  name: 'Arena',
  width: 21,
  height: 17,
  tiles: generateClassicTiles(21, 17),
  spawnPoints: getSpawnPositions(21, 17, 8),
};

/** Small 11x9 map for 2-player duels */
export const DUEL_MAP: CustomMapData = {
  name: 'Duel',
  width: 11,
  height: 9,
  tiles: generateClassicTiles(11, 9),
  spawnPoints: [
    { x: 1, y: 1 },
    { x: 9, y: 7 },
  ],
};

/**
 * Generate classic Bomberman tiles layout (no soft blocks)
 */
function generateClassicTiles(width: number, height: number): number[][] {
  const tiles: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.EMPTY as number)
  );

  // Borders
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        tiles[y][x] = TILE.SOLID as number;
      }
    }
  }

  // Interior pillars
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      tiles[y][x] = TILE.SOLID as number;
    }
  }

  return tiles;
}

/**
 * Get an official map by name
 */
export function getOfficialMap(name: string): GameMap | null {
  const maps: Record<string, CustomMapData> = {
    classic: CLASSIC_MAP,
    arena: ARENA_MAP,
    duel: DUEL_MAP,
  };

  const mapData = maps[name.toLowerCase()];
  if (!mapData) return null;

  try {
    const map = loadCustomMap(mapData);
    map.isOfficial = true;
    return map;
  } catch {
    return null;
  }
}

// ============================================================================
// MAP RESET
// ============================================================================

/**
 * Reset a map for a new round (regenerate soft blocks)
 */
export function resetMapForNewRound(
  originalMap: GameMap,
  seed?: number
): GameMap {
  // Generate fresh map with same dimensions
  const newMap = generateMap({
    width: originalMap.width,
    height: originalMap.height,
    seed: seed ?? Math.floor(Math.random() * 1e9),
    name: originalMap.name,
  });

  // Preserve original spawn points
  newMap.spawnPoints = [...originalMap.spawnPoints];
  newMap.id = originalMap.id; // Keep same ID
  newMap.isOfficial = originalMap.isOfficial;
  newMap.creatorId = originalMap.creatorId;

  return newMap;
}

// ============================================================================
// POWERUP PLACEMENT HELPERS
// ============================================================================

/**
 * Get all soft block positions (for potential powerup hiding)
 */
export function getSoftBlockPositions(map: GameMap): Position[] {
  const positions: Position[] = [];

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x] === TILE.SOFT) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}

/**
 * Distribute hidden powerups among soft blocks
 */
export function distributePowerups(
  softBlocks: Position[],
  powerupTypes: PowerupType[],
  spawnChance: number,
  seed?: number
): Map<string, PowerupType> {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 1e9));
  const powerupMap = new Map<string, PowerupType>();

  // Shuffle soft block positions
  const shuffled = [...softBlocks].sort(() => rng() - 0.5);

  // Assign powerups to some blocks
  for (const block of shuffled) {
    if (rng() < spawnChance) {
      const typeIndex = Math.floor(rng() * powerupTypes.length);
      const type = powerupTypes[typeIndex];
      powerupMap.set(`${block.x},${block.y}`, type);
    }
  }

  return powerupMap;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const MapGenerator = {
  generateMap,
  loadCustomMap,
  getOfficialMap,
  getSpawnPositions,
  resetMapForNewRound,
  getSoftBlockPositions,
  distributePowerups,
  TILE,
};

export default MapGenerator;
