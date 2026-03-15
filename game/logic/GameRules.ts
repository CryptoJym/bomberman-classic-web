/**
 * Game Rules for Bomberman
 * Win conditions, scoring, and game flow logic
 */

import type {
  GameState,
  Player,
  GamePhase,
  RoundResult,
  RoomSettings,
} from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface WinCondition {
  type: 'last_survivor' | 'most_kills' | 'time_limit';
  winnerId: string | null;
  reason: string;
}

export interface ScoreUpdate {
  playerId: string;
  kills: number;
  deaths: number;
  placement: number;
}

// ============================================================================
// GAME RULES CLASS
// ============================================================================

/**
 * Enforces game rules and determines win conditions
 */
export class GameRules {
  /**
   * Check if round should end
   */
  checkRoundEnd(state: GameState): WinCondition | null {
    // Count alive players
    const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);

    // Last survivor wins
    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      if (winner) {
        return {
          type: 'last_survivor',
          winnerId: winner.id,
          reason: 'Last player standing',
        };
      }
    }

    // No survivors - draw
    if (alivePlayers.length === 0) {
      return {
        type: 'last_survivor',
        winnerId: null,
        reason: 'Mutual elimination',
      };
    }

    // Time limit reached
    if (state.timeRemaining <= 0) {
      const winner = this.getPlayerWithMostKills(state.players);
      return {
        type: 'time_limit',
        winnerId: winner?.id || null,
        reason: 'Time limit reached',
      };
    }

    return null;
  }

  /**
   * Check if match should end (someone won enough rounds)
   */
  checkMatchEnd(state: GameState, settings: RoomSettings): string | null {
    for (const [playerId, wins] of Object.entries(state.roundWins)) {
      if (wins >= settings.roundsToWin) {
        return playerId;
      }
    }
    return null;
  }

  /**
   * Calculate round results
   */
  calculateRoundResult(
    state: GameState,
    winnerId: string | null,
    duration: number
  ): RoundResult {
    const playerStats: Record<string, { kills: number; deaths: number; placement: number }> = {};

    // Calculate placements
    const players = Object.values(state.players);
    const sortedPlayers = players.sort((a, b) => {
      // Alive players rank higher
      if (a.isAlive !== b.isAlive) {
        return a.isAlive ? -1 : 1;
      }
      // Then by kills
      return b.kills - a.kills;
    });

    sortedPlayers.forEach((player, index) => {
      playerStats[player.id] = {
        kills: player.kills,
        deaths: player.deaths,
        placement: index + 1,
      };
    });

    return {
      roundNumber: state.currentRound,
      winnerId,
      winnerUsername: winnerId ? state.players[winnerId]?.username : undefined,
      duration,
      playerStats,
    };
  }

  /**
   * Award kill
   */
  awardKill(killer: Player, victim: Player): { killer: Player; victim: Player } {
    return {
      killer: {
        ...killer,
        kills: killer.kills + 1,
      },
      victim: {
        ...victim,
        deaths: victim.deaths + 1,
        isAlive: false,
      },
    };
  }

  /**
   * Get player with most kills
   */
  private getPlayerWithMostKills(players: Record<string, Player>): Player | null {
    let maxKills = -1;
    let winner: Player | null = null;

    for (const player of Object.values(players)) {
      if (player.kills > maxKills) {
        maxKills = player.kills;
        winner = player;
      }
    }

    return winner;
  }

  /**
   * Calculate player score for leaderboard
   */
  calculatePlayerScore(player: Player, roundsWon: number): number {
    return roundsWon * 1000 + player.kills * 100 - player.deaths * 10;
  }

  /**
   * Determine if sudden death should start
   */
  shouldStartSuddenDeath(state: GameState, settings: RoomSettings): boolean {
    if (!settings.suddenDeathEnabled) return false;
    if (state.phase !== 'playing') return false;

    const elapsedTime = (settings.roundTime * 1000 - state.timeRemaining) / 1000;
    return elapsedTime >= settings.suddenDeathTime;
  }

  /**
   * Check if game phase should transition
   */
  getNextPhase(currentPhase: GamePhase): GamePhase | null {
    const transitions: Record<GamePhase, GamePhase | null> = {
      waiting: 'starting',
      starting: 'countdown',
      countdown: 'playing',
      playing: 'sudden_death', // Or 'round_end'
      sudden_death: 'round_end',
      round_end: 'intermission',
      intermission: 'countdown', // Or 'finished'
      finished: null,
    };

    return transitions[currentPhase] || null;
  }

  /**
   * Validate player action
   */
  canPlayerAct(player: Player): boolean {
    return player.isAlive && !player.skullEffect;
  }

  /**
   * Check if player can place bomb
   */
  canPlaceBomb(player: Player): boolean {
    if (!this.canPlayerAct(player)) return false;
    if (player.skullEffect === 'constipation') return false;
    return player.activeBombs < player.maxBombs;
  }
}
