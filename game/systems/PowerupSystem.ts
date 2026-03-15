/**
 * Powerup System for Bomberman Game
 * Handles powerup spawning, collection, and effects
 */

import type {
  Powerup,
  PowerupType,
  Player,
  Position,
  SkullEffect,
} from '@/types/game';
import { GAME_CONSTANTS, POWERUP_SPAWN_CHANCES } from '@/types/game';

// ============================================================================
// POWERUP SYSTEM CLASS
// ============================================================================

/**
 * System for powerup management
 */
export class PowerupSystem {
  /**
   * Generate random powerup type based on spawn chances
   */
  generateRandomPowerupType(): PowerupType {
    const random = Math.random();
    let cumulative = 0;

    for (const [type, chance] of Object.entries(POWERUP_SPAWN_CHANCES)) {
      cumulative += chance;
      if (random <= cumulative) {
        return type as PowerupType;
      }
    }

    return 'bomb_up'; // Fallback
  }

  /**
   * Create powerup at position
   */
  createPowerup(position: Position, type?: PowerupType): Powerup {
    return {
      id: `powerup_${Date.now()}_${Math.random()}`,
      type: type || this.generateRandomPowerupType(),
      position,
      spawnedAt: Date.now(),
      animationFrame: 0,
    };
  }

  /**
   * Apply powerup effect to player
   */
  applyPowerup(player: Player, powerup: Powerup): Player {
    const updated = { ...player };

    switch (powerup.type) {
      case 'bomb_up':
        updated.maxBombs = Math.min(updated.maxBombs + 1, GAME_CONSTANTS.MAX_BOMBS);
        updated.powerups.push('bomb_up');
        break;

      case 'fire_up':
        updated.explosionRadius = Math.min(
          updated.explosionRadius + 1,
          GAME_CONSTANTS.MAX_EXPLOSION_RADIUS
        );
        updated.powerups.push('fire_up');
        break;

      case 'speed_up':
        updated.speed = Math.min(
          updated.speed + GAME_CONSTANTS.SPEED_INCREMENT,
          GAME_CONSTANTS.MAX_PLAYER_SPEED
        );
        updated.powerups.push('speed_up');
        break;

      case 'kick':
        updated.canKick = true;
        updated.powerups.push('kick');
        break;

      case 'punch':
        updated.canPunch = true;
        updated.powerups.push('punch');
        break;

      case 'shield':
        updated.hasShield = true;
        updated.powerups.push('shield');
        break;

      case 'skull':
        this.applySkullEffect(updated);
        break;
    }

    return updated;
  }

  /**
   * Apply random skull effect
   */
  private applySkullEffect(player: Player): void {
    const effects: SkullEffect[] = [
      'slow',
      'reverse',
      'diarrhea',
      'constipation',
      'low_power',
      'rapid_bombs',
    ];

    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    player.skullEffect = randomEffect;
    player.skullEffectExpiresAt = Date.now() + GAME_CONSTANTS.SKULL_EFFECT_DURATION;
  }

  /**
   * Check if skull effect has expired
   */
  checkSkullEffectExpiry(player: Player): Player {
    if (player.skullEffect && player.skullEffectExpiresAt) {
      if (Date.now() >= player.skullEffectExpiresAt) {
        return {
          ...player,
          skullEffect: undefined,
          skullEffectExpiresAt: undefined,
        };
      }
    }
    return player;
  }

  /**
   * Remove shield from player
   */
  removeShield(player: Player): Player {
    return {
      ...player,
      hasShield: false,
      powerups: player.powerups.filter((p) => p !== 'shield'),
    };
  }

  /**
   * Reset player powerups (on death)
   */
  resetPowerups(player: Player): Player {
    return {
      ...player,
      maxBombs: 1,
      explosionRadius: 1,
      speed: 1.0,
      canKick: false,
      canPunch: false,
      hasShield: false,
      skullEffect: undefined,
      skullEffectExpiresAt: undefined,
      powerups: [],
    };
  }
}
