/**
 * Collision System for Bomberman Game
 * Handles collision detection between players, bombs, walls, and powerups
 */

import type {
  Player,
  Bomb,
  Powerup,
  Position,
  GameMap,
  Direction,
} from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface CollisionContext {
  map: GameMap;
  players: Map<string, Player>;
  bombs: Map<string, Bomb>;
  powerups: Map<string, Powerup>;
}

export interface CollisionResult {
  collided: boolean;
  collidedWith: 'wall' | 'bomb' | 'player' | 'powerup' | null;
  position: Position;
  data?: unknown;
}

export interface RaycastResult {
  hit: boolean;
  hitPosition: Position;
  hitType: 'wall' | 'block' | 'bomb' | 'player' | null;
  distance: number;
}

// ============================================================================
// COLLISION SYSTEM CLASS
// ============================================================================

/**
 * System for handling collision detection
 */
export class CollisionSystem {
  // ==========================================================================
  // TILE COLLISION
  // ==========================================================================

  /**
   * Check if a tile position is walkable
   */
  isWalkable(
    x: number,
    y: number,
    context: CollisionContext,
    playerId?: string
  ): boolean {
    const { map, bombs } = context;

    // Check bounds
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
      return false;
    }

    // Check tile type
    const tile = map.tiles[y]?.[x];
    if (!tile) return false;

    if (tile.type === 'wall' || tile.type === 'block') {
      return false;
    }

    // Check for bombs (unless it's the player's own bomb they just placed)
    for (const bomb of bombs.values()) {
      const bombTileX = Math.floor(bomb.position.x);
      const bombTileY = Math.floor(bomb.position.y);

      if (bombTileX === x && bombTileY === y) {
        // Allow walking through own bomb if player is on the same tile
        if (playerId && bomb.ownerId === playerId) {
          const player = context.players.get(playerId);
          if (player) {
            const playerTileX = Math.floor(player.position.x);
            const playerTileY = Math.floor(player.position.y);
            if (playerTileX === bombTileX && playerTileY === bombTileY) {
              continue; // Allow passing through
            }
          }
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Check if position collides with any obstacle
   */
  checkCollision(
    position: Position,
    context: CollisionContext,
    playerId?: string
  ): CollisionResult {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

    // Check tile collision
    if (!this.isWalkable(tileX, tileY, context, playerId)) {
      const tile = context.map.tiles[tileY]?.[tileX];
      return {
        collided: true,
        collidedWith: tile?.type === 'wall' || tile?.type === 'block' ? 'wall' : 'bomb',
        position: { x: tileX, y: tileY },
      };
    }

    // Check player collision
    const playerCollision = this.checkPlayerCollision(position, context, playerId);
    if (playerCollision.collided) {
      return playerCollision;
    }

    // Check powerup collision
    const powerupCollision = this.checkPowerupCollision(position, context);
    if (powerupCollision.collided) {
      return powerupCollision;
    }

    return {
      collided: false,
      collidedWith: null,
      position,
    };
  }

  // ==========================================================================
  // ENTITY COLLISION
  // ==========================================================================

  /**
   * Check collision with other players
   */
  checkPlayerCollision(
    position: Position,
    context: CollisionContext,
    excludePlayerId?: string
  ): CollisionResult {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

    for (const player of context.players.values()) {
      if (player.id === excludePlayerId) continue;
      if (!player.isAlive) continue;

      const playerTileX = Math.floor(player.position.x);
      const playerTileY = Math.floor(player.position.y);

      if (playerTileX === tileX && playerTileY === tileY) {
        return {
          collided: true,
          collidedWith: 'player',
          position: { x: tileX, y: tileY },
          data: player,
        };
      }
    }

    return {
      collided: false,
      collidedWith: null,
      position,
    };
  }

  /**
   * Check collision with powerup
   */
  checkPowerupCollision(
    position: Position,
    context: CollisionContext
  ): CollisionResult {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

    for (const powerup of context.powerups.values()) {
      if (powerup.position.x === tileX && powerup.position.y === tileY) {
        return {
          collided: true,
          collidedWith: 'powerup',
          position: { x: tileX, y: tileY },
          data: powerup,
        };
      }
    }

    return {
      collided: false,
      collidedWith: null,
      position,
    };
  }

  /**
   * Check if bomb exists at position
   */
  hasBombAt(position: Position, context: CollisionContext): Bomb | null {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

    for (const bomb of context.bombs.values()) {
      const bombTileX = Math.floor(bomb.position.x);
      const bombTileY = Math.floor(bomb.position.y);

      if (bombTileX === tileX && bombTileY === tileY) {
        return bomb;
      }
    }

    return null;
  }

  // ==========================================================================
  // RAYCASTING
  // ==========================================================================

  /**
   * Cast a ray in a direction until hitting an obstacle
   * Used for explosion propagation and line-of-sight checks
   */
  raycast(
    origin: Position,
    direction: Direction,
    maxDistance: number,
    context: CollisionContext
  ): RaycastResult {
    let currentX = Math.floor(origin.x);
    let currentY = Math.floor(origin.y);

    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'up':
        dy = -1;
        break;
      case 'down':
        dy = 1;
        break;
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
    }

    for (let i = 0; i < maxDistance; i++) {
      currentX += dx;
      currentY += dy;

      // Check bounds
      if (
        currentX < 0 ||
        currentY < 0 ||
        currentX >= context.map.width ||
        currentY >= context.map.height
      ) {
        return {
          hit: true,
          hitPosition: { x: currentX - dx, y: currentY - dy },
          hitType: 'wall',
          distance: i,
        };
      }

      // Check tile
      const row = context.map.tiles[currentY];
      const tile = row ? row[currentX] : undefined;
      if (tile?.type === 'wall') {
        return {
          hit: true,
          hitPosition: { x: currentX, y: currentY },
          hitType: 'wall',
          distance: i + 1,
        };
      }

      if (tile?.type === 'block') {
        return {
          hit: true,
          hitPosition: { x: currentX, y: currentY },
          hitType: 'block',
          distance: i + 1,
        };
      }

      // Check bomb
      const bomb = this.hasBombAt({ x: currentX, y: currentY }, context);
      if (bomb) {
        return {
          hit: true,
          hitPosition: { x: currentX, y: currentY },
          hitType: 'bomb',
          distance: i + 1,
        };
      }

      // Check player
      for (const player of context.players.values()) {
        if (!player.isAlive) continue;

        const playerTileX = Math.floor(player.position.x);
        const playerTileY = Math.floor(player.position.y);

        if (playerTileX === currentX && playerTileY === currentY) {
          return {
            hit: true,
            hitPosition: { x: currentX, y: currentY },
            hitType: 'player',
            distance: i + 1,
          };
        }
      }
    }

    // Max distance reached without hitting anything
    return {
      hit: false,
      hitPosition: { x: currentX, y: currentY },
      hitType: null,
      distance: maxDistance,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if circular areas overlap (for collision detection)
   */
  circlesOverlap(
    pos1: Position,
    radius1: number,
    pos2: Position,
    radius2: number
  ): boolean {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius1 + radius2;
  }

  /**
   * Check if rectangular areas overlap
   */
  rectanglesOverlap(
    pos1: Position,
    width1: number,
    height1: number,
    pos2: Position,
    width2: number,
    height2: number
  ): boolean {
    return (
      pos1.x < pos2.x + width2 &&
      pos1.x + width1 > pos2.x &&
      pos1.y < pos2.y + height2 &&
      pos1.y + height1 > pos2.y
    );
  }

  /**
   * Get all players within radius of position
   */
  getPlayersInRadius(
    position: Position,
    radius: number,
    context: CollisionContext,
    excludePlayerId?: string
  ): Player[] {
    const players: Player[] = [];

    for (const player of context.players.values()) {
      if (player.id === excludePlayerId) continue;
      if (!player.isAlive) continue;

      const dx = player.position.x - position.x;
      const dy = player.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        players.push(player);
      }
    }

    return players;
  }

  /**
   * Get all bombs within radius of position
   */
  getBombsInRadius(
    position: Position,
    radius: number,
    context: CollisionContext
  ): Bomb[] {
    const bombs: Bomb[] = [];

    for (const bomb of context.bombs.values()) {
      const dx = bomb.position.x - position.x;
      const dy = bomb.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        bombs.push(bomb);
      }
    }

    return bombs;
  }
}
