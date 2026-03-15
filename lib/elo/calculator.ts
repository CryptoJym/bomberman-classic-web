/**
 * ELO Rating Calculator
 * Standard ELO algorithm adapted for multiplayer Bomberman
 */

import { getRankFromElo } from './ranks';
import type { RankTier } from '@/types/api';

/**
 * K-factor determines how much ratings change per game
 * Higher K = more volatile ratings
 */
const K_FACTORS = {
  // New players (< 30 games) have higher volatility
  provisional: 40,
  // Normal players
  standard: 32,
  // High-rated players (Master+) have lower volatility
  expert: 24,
  // Top players (2200+) have minimal volatility
  elite: 16,
};

/**
 * Get K-factor based on player's current rating and games played
 */
function getKFactor(elo: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) {
    return K_FACTORS.provisional;
  }
  if (elo >= 2200) {
    return K_FACTORS.elite;
  }
  if (elo >= 1900) {
    return K_FACTORS.expert;
  }
  return K_FACTORS.standard;
}

/**
 * Calculate expected score (win probability) using ELO formula
 * Returns value between 0 and 1
 */
export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate new ELO rating after a game
 */
export function calculateNewElo(
  playerElo: number,
  opponentElo: number,
  actualScore: number,
  gamesPlayed: number = 30
): {
  newElo: number;
  eloChange: number;
  expectedScore: number;
} {
  const kFactor = getKFactor(playerElo, gamesPlayed);
  const expectedScore = calculateExpectedScore(playerElo, opponentElo);
  const eloChange = Math.round(kFactor * (actualScore - expectedScore));
  const newElo = Math.max(0, playerElo + eloChange);

  return {
    newElo,
    eloChange,
    expectedScore,
  };
}

/**
 * Calculate ELO changes for a multiplayer game (2-4 players)
 */
export interface PlayerGameResult {
  playerId: string;
  currentElo: number;
  placement: number; // 1st, 2nd, 3rd, 4th
  totalGames: number;
}

export interface PlayerEloChange {
  playerId: string;
  oldElo: number;
  newElo: number;
  eloChange: number;
  oldRank: RankTier;
  newRank: RankTier;
  rankChanged: boolean;
}

/**
 * Calculate ELO changes for all players in a multiplayer game
 * Uses pairwise comparisons between all players
 */
export function calculateMultiplayerElo(results: PlayerGameResult[]): PlayerEloChange[] {
  const changes: PlayerEloChange[] = [];

  // For each player, calculate their ELO change based on all other players
  for (const player of results) {
    let totalEloChange = 0;
    const opponentCount = results.length - 1;

    // Compare against each opponent
    for (const opponent of results) {
      if (opponent.playerId === player.playerId) {
        continue;
      }

      // Determine actual score (1 = win, 0.5 = draw, 0 = loss)
      let actualScore: number;
      if (player.placement < opponent.placement) {
        actualScore = 1; // Beat this opponent
      } else if (player.placement === opponent.placement) {
        actualScore = 0.5; // Tied with this opponent
      } else {
        actualScore = 0; // Lost to this opponent
      }

      // Calculate ELO change for this matchup
      const { eloChange } = calculateNewElo(
        player.currentElo,
        opponent.currentElo,
        actualScore,
        player.totalGames
      );

      totalEloChange += eloChange;
    }

    // Average the ELO changes (since we're comparing against multiple opponents)
    const avgEloChange = Math.round(totalEloChange / opponentCount);
    const newElo = Math.max(0, player.currentElo + avgEloChange);
    const oldRank = getRankFromElo(player.currentElo);
    const newRank = getRankFromElo(newElo);

    changes.push({
      playerId: player.playerId,
      oldElo: player.currentElo,
      newElo,
      eloChange: avgEloChange,
      oldRank,
      newRank,
      rankChanged: oldRank !== newRank,
    });
  }

  return changes;
}

/**
 * Calculate ELO change for a 1v1 game (simplified)
 */
export function calculate1v1Elo(
  winnerElo: number,
  loserElo: number,
  winnerGames: number = 30,
  loserGames: number = 30
): {
  winner: PlayerEloChange;
  loser: PlayerEloChange;
} {
  const winnerResult = calculateNewElo(winnerElo, loserElo, 1, winnerGames);
  const loserResult = calculateNewElo(loserElo, winnerElo, 0, loserGames);

  return {
    winner: {
      playerId: 'winner',
      oldElo: winnerElo,
      newElo: winnerResult.newElo,
      eloChange: winnerResult.eloChange,
      oldRank: getRankFromElo(winnerElo),
      newRank: getRankFromElo(winnerResult.newElo),
      rankChanged: getRankFromElo(winnerElo) !== getRankFromElo(winnerResult.newElo),
    },
    loser: {
      playerId: 'loser',
      oldElo: loserElo,
      newElo: loserResult.newElo,
      eloChange: loserResult.eloChange,
      oldRank: getRankFromElo(loserElo),
      newRank: getRankFromElo(loserResult.newElo),
      rankChanged: getRankFromElo(loserElo) !== getRankFromElo(loserResult.newElo),
    },
  };
}

/**
 * Calculate minimum ELO change (for very one-sided matches)
 */
export const MIN_ELO_CHANGE = 1;

/**
 * Calculate maximum ELO change (prevent extreme swings)
 */
export const MAX_ELO_CHANGE = 50;

/**
 * Clamp ELO change to reasonable bounds
 */
export function clampEloChange(eloChange: number): number {
  const sign = Math.sign(eloChange);
  const magnitude = Math.abs(eloChange);
  const clampedMagnitude = Math.max(MIN_ELO_CHANGE, Math.min(MAX_ELO_CHANGE, magnitude));
  return sign * clampedMagnitude;
}
