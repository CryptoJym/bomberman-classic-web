/**
 * Explosion System for Bomberman Game
 * Handles explosion propagation, chain reactions, and damage
 */

import type {
  Bomb,
  Explosion,
  ExplosionSegment,
  ExplosionSegmentType,
  Position,
  Direction,
} from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import type { CollisionContext } from './CollisionSystem';

// ============================================================================
// TYPES
// ============================================================================

export interface ExplosionResult {
  explosion: Explosion;
  destroyedTiles: Position[];
  affectedPlayers: string[];
  destroyedPowerups: string[];
  triggeredBombs: string[];
}

// ============================================================================
// EXPLOSION SYSTEM CLASS
// ============================================================================

/**
 * System for explosion propagation and effects
 */
export class ExplosionSystem {
  /**
   * Create explosion from bomb
   */
  createExplosion(bomb: Bomb, context: CollisionContext): ExplosionResult {
    const segments: ExplosionSegment[] = [];
    const destroyedTiles: Position[] = [];
    const affectedPlayers = new Set<string>();
    const destroyedPowerups = new Set<string>();
    const triggeredBombs = new Set<string>();

    // Center segment
    segments.push({
      position: { ...bomb.position },
      type: 'center',
    });

    // Check center for entities
    this.checkPosition(bomb.position, context, affectedPlayers, destroyedPowerups, triggeredBombs, bomb.id);

    // Cast rays in four directions
    const directions: Direction[] = ['up', 'down', 'left', 'right'];

    for (const direction of directions) {
      const rayResult = this.castExplosionRay(
        bomb.position,
        direction,
        bomb.radius,
        context,
        bomb.id
      );

      segments.push(...rayResult.segments);
      destroyedTiles.push(...rayResult.destroyedTiles);
      rayResult.affectedPlayers.forEach((id) => affectedPlayers.add(id));
      rayResult.destroyedPowerups.forEach((id) => destroyedPowerups.add(id));
      rayResult.triggeredBombs.forEach((id) => triggeredBombs.add(id));
    }

    const explosion: Explosion = {
      id: `explosion_${Date.now()}_${Math.random()}`,
      position: bomb.position,
      ownerId: bomb.ownerId,
      segments,
      startedAt: Date.now(),
      duration: GAME_CONSTANTS.EXPLOSION_DURATION,
      animationFrame: 0,
    };

    return {
      explosion,
      destroyedTiles,
      affectedPlayers: Array.from(affectedPlayers),
      destroyedPowerups: Array.from(destroyedPowerups),
      triggeredBombs: Array.from(triggeredBombs),
    };
  }

  /**
   * Cast explosion ray in one direction
   */
  private castExplosionRay(
    origin: Position,
    direction: Direction,
    radius: number,
    context: CollisionContext,
    sourceBombId: string
  ): {
    segments: ExplosionSegment[];
    destroyedTiles: Position[];
    affectedPlayers: Set<string>;
    destroyedPowerups: Set<string>;
    triggeredBombs: Set<string>;
  } {
    const segments: ExplosionSegment[] = [];
    const destroyedTiles: Position[] = [];
    const affectedPlayers = new Set<string>();
    const destroyedPowerups = new Set<string>();
    const triggeredBombs = new Set<string>();

    let dx = 0;
    let dy = 0;
    let segmentType: ExplosionSegmentType = 'horizontal';
    let endType: ExplosionSegmentType = 'end_right';

    switch (direction) {
      case 'up':
        dy = -1;
        segmentType = 'vertical';
        endType = 'end_up';
        break;
      case 'down':
        dy = 1;
        segmentType = 'vertical';
        endType = 'end_down';
        break;
      case 'left':
        dx = -1;
        segmentType = 'horizontal';
        endType = 'end_left';
        break;
      case 'right':
        dx = 1;
        segmentType = 'horizontal';
        endType = 'end_right';
        break;
    }

    const startX = Math.floor(origin.x);
    const startY = Math.floor(origin.y);

    for (let i = 1; i <= radius; i++) {
      const x = startX + dx * i;
      const y = startY + dy * i;

      // Check bounds
      if (x < 0 || y < 0 || x >= context.map.width || y >= context.map.height) {
        break;
      }

      const row = context.map.tiles[y];
      const tile = row ? row[x] : undefined;
      const isLastSegment = i === radius;

      // Hit solid wall - stop immediately
      if (tile?.type === 'wall') {
        break;
      }

      // Hit destructible block - include and stop
      if (tile?.type === 'block') {
        segments.push({
          position: { x, y },
          type: endType,
        });
        destroyedTiles.push({ x, y });
        this.checkPosition({ x, y }, context, affectedPlayers, destroyedPowerups, triggeredBombs, sourceBombId);
        break;
      }

      // Add segment
      segments.push({
        position: { x, y },
        type: isLastSegment ? endType : segmentType,
      });

      // Check for entities
      this.checkPosition({ x, y }, context, affectedPlayers, destroyedPowerups, triggeredBombs, sourceBombId);
    }

    return {
      segments,
      destroyedTiles,
      affectedPlayers,
      destroyedPowerups,
      triggeredBombs,
    };
  }

  /**
   * Check position for players, powerups, and bombs
   */
  private checkPosition(
    position: Position,
    context: CollisionContext,
    affectedPlayers: Set<string>,
    destroyedPowerups: Set<string>,
    triggeredBombs: Set<string>,
    sourceBombId: string
  ): void {
    // Check for players
    for (const player of context.players.values()) {
      if (!player.isAlive) continue;

      const playerTileX = Math.floor(player.position.x);
      const playerTileY = Math.floor(player.position.y);

      if (playerTileX === position.x && playerTileY === position.y) {
        affectedPlayers.add(player.id);
      }
    }

    // Check for powerups
    for (const powerup of context.powerups.values()) {
      if (powerup.position.x === position.x && powerup.position.y === position.y) {
        destroyedPowerups.add(powerup.id);
      }
    }

    // Check for bombs (chain reaction)
    for (const bomb of context.bombs.values()) {
      if (bomb.id === sourceBombId) continue;

      const bombTileX = Math.floor(bomb.position.x);
      const bombTileY = Math.floor(bomb.position.y);

      if (bombTileX === position.x && bombTileY === position.y) {
        triggeredBombs.add(bomb.id);
      }
    }
  }

  /**
   * Check if position is in explosion
   */
  isPositionInExplosion(position: Position, explosion: Explosion): boolean {
    for (const segment of explosion.segments) {
      if (segment.position.x === position.x && segment.position.y === position.y) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all positions affected by explosion
   */
  getExplosionPositions(explosion: Explosion): Position[] {
    return explosion.segments.map((seg) => seg.position);
  }
}
