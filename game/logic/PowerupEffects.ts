/**
 * Powerup Effects for Bomberman
 * Detailed behavior for all powerup types
 */

import type { Player, PowerupType, SkullEffect } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// POWERUP EFFECTS CLASS
// ============================================================================

/**
 * Manages powerup effects and their application
 */
export class PowerupEffects {
  /**
   * Get powerup description
   */
  getDescription(type: PowerupType): string {
    const descriptions: Record<PowerupType, string> = {
      bomb_up: 'Increases max bombs by 1',
      fire_up: 'Increases explosion radius by 1',
      speed_up: 'Increases movement speed',
      kick: 'Allows kicking bombs',
      punch: 'Allows punching/throwing bombs',
      shield: 'Protects from one explosion',
      skull: 'Random negative effect',
    };
    return descriptions[type];
  }

  /**
   * Check if powerup effect is stackable
   */
  isStackable(type: PowerupType): boolean {
    const stackable: PowerupType[] = ['bomb_up', 'fire_up', 'speed_up'];
    return stackable.includes(type);
  }

  /**
   * Get maximum stack count for powerup
   */
  getMaxStack(type: PowerupType): number {
    const maxStacks: Partial<Record<PowerupType, number>> = {
      bomb_up: GAME_CONSTANTS.MAX_BOMBS,
      fire_up: GAME_CONSTANTS.MAX_EXPLOSION_RADIUS,
      speed_up: Math.floor((GAME_CONSTANTS.MAX_PLAYER_SPEED - 1.0) / GAME_CONSTANTS.SPEED_INCREMENT),
    };
    return maxStacks[type] || 1;
  }

  /**
   * Check if player can collect powerup
   */
  canCollect(player: Player, type: PowerupType): boolean {
    if (!player.isAlive) return false;

    // Check if already at max
    if (this.isStackable(type)) {
      const currentCount = player.powerups.filter((p) => p === type).length;
      return currentCount < this.getMaxStack(type);
    }

    // Non-stackable powerups can be collected if not already owned
    return !player.powerups.includes(type);
  }

  /**
   * Get skull effect description
   */
  getSkullEffectDescription(effect: SkullEffect): string {
    const descriptions: Record<SkullEffect, string> = {
      slow: 'Movement speed reduced by 50%',
      reverse: 'Controls are reversed',
      diarrhea: 'Automatically places bombs rapidly',
      constipation: 'Cannot place bombs',
      low_power: 'Explosion radius reduced to 1',
      rapid_bombs: 'Bombs explode faster',
    };
    return descriptions[effect];
  }

  /**
   * Apply skull effect to player stats
   */
  applySkullEffect(player: Player, effect: SkullEffect): Player {
    const modified = { ...player };

    switch (effect) {
      case 'slow':
        modified.speed = Math.max(0.5, player.speed * 0.5);
        break;

      case 'low_power':
        modified.explosionRadius = 1;
        break;

      // Other effects are handled by game logic
      case 'reverse':
      case 'diarrhea':
      case 'constipation':
      case 'rapid_bombs':
        break;
    }

    return modified;
  }

  /**
   * Remove skull effect from player
   */
  removeSkullEffect(player: Player): Player {
    return {
      ...player,
      skullEffect: undefined,
      skullEffectExpiresAt: undefined,
    };
  }

  /**
   * Check if skull effect has expired
   */
  hasSkullEffectExpired(player: Player): boolean {
    if (!player.skullEffect || !player.skullEffectExpiresAt) {
      return true;
    }
    return Date.now() >= player.skullEffectExpiresAt;
  }

  /**
   * Get powerup visual color
   */
  getColor(type: PowerupType): number {
    const colors: Record<PowerupType, number> = {
      bomb_up: 0xff4444,
      fire_up: 0xff8800,
      speed_up: 0x44ff44,
      kick: 0x4444ff,
      punch: 0xff44ff,
      shield: 0x00ffff,
      skull: 0x8800ff,
    };
    return colors[type];
  }

  /**
   * Get powerup rarity
   */
  getRarity(type: PowerupType): 'common' | 'uncommon' | 'rare' {
    const rarities: Record<PowerupType, 'common' | 'uncommon' | 'rare'> = {
      bomb_up: 'common',
      fire_up: 'common',
      speed_up: 'common',
      kick: 'uncommon',
      punch: 'uncommon',
      shield: 'rare',
      skull: 'uncommon',
    };
    return rarities[type];
  }
}
