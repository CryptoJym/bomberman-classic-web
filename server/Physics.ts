/**
 * Physics System for Bomberman Game Server
 * Handles movement, collision detection, and explosion ray casting
 */

import type {
  Position,
  Direction,
  TileType,
  GameMap,
  Player,
  Bomb,
  Powerup,
  PowerupEffects,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TILE = {
  EMPTY: 0 as TileType,
  SOLID: 1 as TileType,
  SOFT: 2 as TileType,
};

/** Direction vectors */
const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// ============================================================================
// COLLISION DETECTION
// ============================================================================

export interface CollisionContext {
  map: GameMap;
  bombs: Map<string, Bomb>;
  players: Map<string, Player>;
  powerups: Map<string, Powerup>;
}

/**
 * Check if a tile position is walkable (empty and no blocking objects)
 */
export function isWalkable(
  x: number,
  y: number,
  context: CollisionContext,
  playerId?: string,
  ignoreBombs: boolean = false
): boolean {
  const { map, bombs } = context;

  // Check bounds
  if (x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1) {
    return false;
  }

  // Check tile type
  const tile = map.tiles[y]?.[x];
  if (tile === undefined || tile !== TILE.EMPTY) {
    return false;
  }

  // Check for bombs (unless ignored)
  if (!ignoreBombs) {
    for (const bomb of bombs.values()) {
      if (bomb.position.x === x && bomb.position.y === y) {
        // Players can walk through their own bomb if they haven't left it
        if (playerId && bomb.ownerId === playerId) {
          // Check if player is still on the bomb tile
          const player = context.players.get(playerId);
          if (player && player.position.x === x && player.position.y === y) {
            continue; // Allow walking through own bomb while standing on it
          }
        }
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a position has a bomb
 */
export function hasBombAt(
  x: number,
  y: number,
  bombs: Map<string, Bomb>
): Bomb | null {
  for (const bomb of bombs.values()) {
    if (bomb.position.x === x && bomb.position.y === y && !bomb.exploded) {
      return bomb;
    }
  }
  return null;
}

/**
 * Check if player can place a bomb at current position
 */
export function canPlaceBomb(
  player: Player,
  bombs: Map<string, Bomb>
): boolean {
  // Check if player is alive
  if (!player.isAlive) return false;

  // Check bomb count
  if (player.activeBombs >= player.powerups.maxBombs) return false;

  // Check if position is already occupied by a bomb
  const { x, y } = player.position;
  if (hasBombAt(x, y, bombs)) return false;

  return true;
}

// ============================================================================
// MOVEMENT
// ============================================================================

export interface MovementResult {
  newPosition: Position;
  moved: boolean;
  collectedPowerup?: Powerup;
}

/**
 * Attempt to move a player in a direction
 */
export function movePlayer(
  player: Player,
  direction: Direction,
  context: CollisionContext
): MovementResult {
  const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
  const newX = player.position.x + dx;
  const newY = player.position.y + dy;

  // Check if movement is valid
  if (!isWalkable(newX, newY, context, player.id)) {
    return {
      newPosition: player.position,
      moved: false,
    };
  }

  const newPosition = { x: newX, y: newY };

  // Check for powerup collection
  let collectedPowerup: Powerup | undefined;
  for (const powerup of context.powerups.values()) {
    if (powerup.position.x === newX && powerup.position.y === newY) {
      collectedPowerup = powerup;
      break;
    }
  }

  return {
    newPosition,
    moved: true,
    collectedPowerup,
  };
}

/**
 * Get valid adjacent positions from a position
 */
export function getValidAdjacentPositions(
  position: Position,
  context: CollisionContext,
  playerId?: string
): Position[] {
  const positions: Position[] = [];

  for (const direction of Object.keys(DIRECTION_VECTORS) as Direction[]) {
    const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
    const x = position.x + dx;
    const y = position.y + dy;

    if (isWalkable(x, y, context, playerId)) {
      positions.push({ x, y });
    }
  }

  return positions;
}

// ============================================================================
// EXPLOSION RAY CASTING
// ============================================================================

export interface ExplosionCell {
  position: Position;
  hitSoftBlock: boolean;
  hitPlayer: boolean;
  hitPowerup: boolean;
}

export interface ExplosionResult {
  cells: ExplosionCell[];
  destroyedBlocks: Position[];
  killedPlayers: string[];
  destroyedPowerups: string[];
  triggeredBombs: string[];
}

/**
 * Calculate explosion spread from a bomb
 * Uses ray casting in four cardinal directions
 */
export function calculateExplosion(
  bomb: Bomb,
  context: CollisionContext
): ExplosionResult {
  const { map, players, powerups, bombs } = context;
  const result: ExplosionResult = {
    cells: [],
    destroyedBlocks: [],
    killedPlayers: [],
    destroyedPowerups: [],
    triggeredBombs: [],
  };

  // Center cell always included
  result.cells.push({
    position: { ...bomb.position },
    hitSoftBlock: false,
    hitPlayer: false,
    hitPowerup: false,
  });

  // Check center for players
  checkCellForPlayers(bomb.position, players, bomb.ownerId, result);

  // Cast rays in four directions
  const directions: Direction[] = ['up', 'down', 'left', 'right'];

  for (const direction of directions) {
    castExplosionRay(
      bomb.position,
      direction,
      bomb.radius,
      map,
      players,
      powerups,
      bombs,
      bomb.id,
      bomb.ownerId,
      result
    );
  }

  return result;
}

/**
 * Cast an explosion ray in a single direction
 */
function castExplosionRay(
  origin: Position,
  direction: Direction,
  radius: number,
  map: GameMap,
  players: Map<string, Player>,
  powerups: Map<string, Powerup>,
  bombs: Map<string, Bomb>,
  sourceBombId: string,
  ownerId: string,
  result: ExplosionResult
): void {
  const { x: dx, y: dy } = DIRECTION_VECTORS[direction];

  for (let i = 1; i <= radius; i++) {
    const x = origin.x + dx * i;
    const y = origin.y + dy * i;

    // Check bounds
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
      break;
    }

    const tile = map.tiles[y][x];

    // Hit solid wall - stop immediately
    if (tile === TILE.SOLID) {
      break;
    }

    const cell: ExplosionCell = {
      position: { x, y },
      hitSoftBlock: false,
      hitPlayer: false,
      hitPowerup: false,
    };

    // Hit soft block - include this cell but stop after
    if (tile === TILE.SOFT) {
      cell.hitSoftBlock = true;
      result.cells.push(cell);
      result.destroyedBlocks.push({ x, y });
      break;
    }

    // Add empty cell to explosion
    result.cells.push(cell);

    // Check for players in this cell
    checkCellForPlayers({ x, y }, players, ownerId, result);

    // Check for powerups in this cell
    checkCellForPowerups({ x, y }, powerups, result);

    // Check for other bombs to trigger chain reaction
    checkCellForBombs({ x, y }, bombs, sourceBombId, result);
  }
}

/**
 * Check if any players are in an explosion cell
 */
function checkCellForPlayers(
  position: Position,
  players: Map<string, Player>,
  bombOwnerId: string,
  result: ExplosionResult
): void {
  for (const player of players.values()) {
    if (!player.isAlive) continue;

    if (player.position.x === position.x && player.position.y === position.y) {
      // Don't add duplicates
      if (!result.killedPlayers.includes(player.id)) {
        result.killedPlayers.push(player.id);
      }
    }
  }
}

/**
 * Check if any powerups are in an explosion cell
 */
function checkCellForPowerups(
  position: Position,
  powerups: Map<string, Powerup>,
  result: ExplosionResult
): void {
  for (const powerup of powerups.values()) {
    if (powerup.position.x === position.x && powerup.position.y === position.y) {
      if (!result.destroyedPowerups.includes(powerup.id)) {
        result.destroyedPowerups.push(powerup.id);
      }
    }
  }
}

/**
 * Check if any bombs are in an explosion cell (chain reaction)
 */
function checkCellForBombs(
  position: Position,
  bombs: Map<string, Bomb>,
  excludeBombId: string,
  result: ExplosionResult
): void {
  for (const bomb of bombs.values()) {
    if (bomb.id === excludeBombId) continue;
    if (bomb.exploded) continue;

    if (bomb.position.x === position.x && bomb.position.y === position.y) {
      if (!result.triggeredBombs.includes(bomb.id)) {
        result.triggeredBombs.push(bomb.id);
      }
    }
  }
}

// ============================================================================
// BOMB KICK PHYSICS
// ============================================================================

export interface KickResult {
  success: boolean;
  newPosition?: Position;
  stoppedBy?: 'wall' | 'bomb' | 'player' | 'edge';
}

/**
 * Attempt to kick a bomb in a direction
 */
export function kickBomb(
  bomb: Bomb,
  direction: Direction,
  context: CollisionContext
): KickResult {
  const { map, bombs, players } = context;
  const { x: dx, y: dy } = DIRECTION_VECTORS[direction];

  // Find the furthest position the bomb can travel
  let lastValidPosition = bomb.position;
  let stoppedBy: 'wall' | 'bomb' | 'player' | 'edge' | undefined;

  for (let i = 1; i <= 10; i++) { // Max kick distance
    const x = bomb.position.x + dx * i;
    const y = bomb.position.y + dy * i;

    // Check bounds
    if (x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1) {
      stoppedBy = 'edge';
      break;
    }

    // Check tile
    const tile = map.tiles[y][x];
    if (tile !== TILE.EMPTY) {
      stoppedBy = 'wall';
      break;
    }

    // Check for other bombs
    const otherBomb = hasBombAt(x, y, bombs);
    if (otherBomb && otherBomb.id !== bomb.id) {
      stoppedBy = 'bomb';
      break;
    }

    // Check for players
    let playerBlocking = false;
    for (const player of players.values()) {
      if (player.isAlive && player.position.x === x && player.position.y === y) {
        playerBlocking = true;
        break;
      }
    }
    if (playerBlocking) {
      stoppedBy = 'player';
      break;
    }

    lastValidPosition = { x, y };
  }

  // If bomb didn't move, kick failed
  if (lastValidPosition.x === bomb.position.x && lastValidPosition.y === bomb.position.y) {
    return { success: false, stoppedBy };
  }

  return {
    success: true,
    newPosition: lastValidPosition,
    stoppedBy,
  };
}

// ============================================================================
// SUDDEN DEATH ZONE
// ============================================================================

/**
 * Get positions that should be destroyed in sudden death shrink
 */
export function getSuddenDeathPositions(
  map: GameMap,
  level: number
): Position[] {
  const positions: Position[] = [];

  // Level 0 = no shrink
  // Level 1 = outer ring
  // Level 2 = next ring inward, etc.

  const ring = level;
  const minX = 1 + ring - 1;
  const maxX = map.width - 2 - (ring - 1);
  const minY = 1 + ring - 1;
  const maxY = map.height - 2 - (ring - 1);

  // Top and bottom edges of the ring
  for (let x = minX; x <= maxX; x++) {
    if (minY > 0 && minY < map.height - 1) {
      positions.push({ x, y: minY });
    }
    if (maxY > 0 && maxY < map.height - 1) {
      positions.push({ x, y: maxY });
    }
  }

  // Left and right edges (excluding corners already added)
  for (let y = minY + 1; y < maxY; y++) {
    if (minX > 0 && minX < map.width - 1) {
      positions.push({ x: minX, y });
    }
    if (maxX > 0 && maxX < map.width - 1) {
      positions.push({ x: maxX, y });
    }
  }

  return positions;
}

/**
 * Check if a position is in the safe zone (not affected by sudden death)
 */
export function isInSafeZone(
  position: Position,
  map: GameMap,
  suddenDeathLevel: number
): boolean {
  if (suddenDeathLevel === 0) return true;

  const minSafe = suddenDeathLevel;
  const maxSafeX = map.width - 1 - suddenDeathLevel;
  const maxSafeY = map.height - 1 - suddenDeathLevel;

  return (
    position.x > minSafe &&
    position.x < maxSafeX &&
    position.y > minSafe &&
    position.y < maxSafeY
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Manhattan distance between two positions
 */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Check if two positions are adjacent (including diagonals)
 */
export function areAdjacent(a: Position, b: Position, includeDiagonals: boolean = false): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);

  if (includeDiagonals) {
    return dx <= 1 && dy <= 1 && (dx + dy > 0);
  }
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/**
 * Get direction from one position to another
 */
export function getDirection(from: Position, to: Position): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';

  return null;
}

/**
 * Get opposite direction
 */
export function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };
  return opposites[direction];
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Physics = {
  isWalkable,
  hasBombAt,
  canPlaceBomb,
  movePlayer,
  getValidAdjacentPositions,
  calculateExplosion,
  kickBomb,
  getSuddenDeathPositions,
  isInSafeZone,
  manhattanDistance,
  areAdjacent,
  getDirection,
  getOppositeDirection,
  DIRECTION_VECTORS,
};

export default Physics;
