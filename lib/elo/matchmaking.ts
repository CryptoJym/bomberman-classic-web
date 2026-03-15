/**
 * ELO-Based Matchmaking System
 * Finds fair matches based on player ratings
 */

import { calculateExpectedScore } from './calculator';
import type { RankTier } from '@/types/api';

/**
 * Player matchmaking data
 */
export interface MatchmakingPlayer {
  playerId: string;
  username: string;
  eloRating: number;
  rankTier: RankTier;
  totalGames: number;
  queueTime?: number; // How long they've been waiting (ms)
}

/**
 * Matchmaking configuration
 */
export interface MatchmakingConfig {
  /** Maximum ELO difference between players */
  maxEloDifference: number;
  /** Maximum rank tier difference */
  maxRankDifference: number;
  /** Expand search range over time */
  expandSearchOverTime: boolean;
  /** Milliseconds before expanding search by 100 ELO */
  expansionInterval: number;
  /** Minimum players per match */
  minPlayers: number;
  /** Maximum players per match */
  maxPlayers: number;
}

/**
 * Default matchmaking config
 */
export const DEFAULT_MATCHMAKING_CONFIG: MatchmakingConfig = {
  maxEloDifference: 200,
  maxRankDifference: 2,
  expandSearchOverTime: true,
  expansionInterval: 10000, // 10 seconds
  minPlayers: 2,
  maxPlayers: 4,
};

/**
 * Calculate ELO range based on queue time
 */
export function calculateEloRange(
  playerElo: number,
  queueTime: number,
  config: MatchmakingConfig
): { min: number; max: number } {
  let range = config.maxEloDifference;

  if (config.expandSearchOverTime && queueTime > 0) {
    const expansions = Math.floor(queueTime / config.expansionInterval);
    range += expansions * 100;
    range = Math.min(range, 800); // Cap at 800 ELO difference
  }

  return {
    min: Math.max(0, playerElo - range),
    max: playerElo + range,
  };
}

/**
 * Check if two players can be matched
 */
export function canMatchPlayers(
  player1: MatchmakingPlayer,
  player2: MatchmakingPlayer,
  config: MatchmakingConfig = DEFAULT_MATCHMAKING_CONFIG
): boolean {
  // Calculate ELO range for player with longer queue time
  const longerQueueTime = Math.max(player1.queueTime || 0, player2.queueTime || 0);
  const { min, max } = calculateEloRange(player1.eloRating, longerQueueTime, config);

  // Check ELO difference
  if (player2.eloRating < min || player2.eloRating > max) {
    return false;
  }

  // Check rank difference (unless search is very expanded)
  if (longerQueueTime < config.expansionInterval * 3) {
    const rankDiff = Math.abs(
      getRankIndex(player1.rankTier) - getRankIndex(player2.rankTier)
    );
    if (rankDiff > config.maxRankDifference) {
      return false;
    }
  }

  return true;
}

/**
 * Get rank index for comparison
 */
function getRankIndex(rank: RankTier): number {
  const ranks: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
  return ranks.indexOf(rank);
}

/**
 * Calculate match quality score (0-100)
 * Higher is better
 */
export function calculateMatchQuality(players: MatchmakingPlayer[]): number {
  if (players.length < 2) {
    return 0;
  }

  // Calculate average ELO
  const avgElo = players.reduce((sum, p) => sum + p.eloRating, 0) / players.length;

  // Calculate standard deviation
  const variance = players.reduce((sum, p) => sum + Math.pow(p.eloRating - avgElo, 2), 0) / players.length;
  const stdDev = Math.sqrt(variance);

  // Lower standard deviation = higher quality match
  // Map 0-400 std dev to 100-0 quality score
  const quality = Math.max(0, Math.min(100, 100 - (stdDev / 4)));

  return Math.round(quality);
}

/**
 * Find best match from a pool of waiting players
 */
export function findBestMatch(
  player: MatchmakingPlayer,
  pool: MatchmakingPlayer[],
  config: MatchmakingConfig = DEFAULT_MATCHMAKING_CONFIG
): MatchmakingPlayer[] | null {
  // Filter compatible players
  const compatible = pool.filter(p =>
    p.playerId !== player.playerId && canMatchPlayers(player, p, config)
  );

  if (compatible.length === 0) {
    return null;
  }

  // For 1v1, return best single opponent
  if (config.maxPlayers === 2) {
    const best = compatible.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.eloRating - player.eloRating);
      const currentDiff = Math.abs(current.eloRating - player.eloRating);
      return currentDiff < closestDiff ? current : closest;
    });
    return [player, best];
  }

  // For multiplayer, try to build best group
  const targetSize = config.maxPlayers;
  const candidates = compatible
    .sort((a, b) => Math.abs(a.eloRating - player.eloRating) - Math.abs(b.eloRating - player.eloRating))
    .slice(0, targetSize - 1);

  if (candidates.length >= config.minPlayers - 1) {
    return [player, ...candidates];
  }

  return null;
}

/**
 * Create balanced teams from a group of players
 */
export function createBalancedTeams(
  players: MatchmakingPlayer[],
  teamSize: number
): MatchmakingPlayer[][] {
  if (players.length < teamSize * 2) {
    throw new Error('Not enough players for team creation');
  }

  // Sort by ELO
  const sorted = [...players].sort((a, b) => b.eloRating - a.eloRating);

  // Use snake draft to balance teams
  const teams: MatchmakingPlayer[][] = Array.from({ length: teamSize }, () => []);
  let teamIndex = 0;
  let direction = 1;

  for (const player of sorted) {
    const team = teams[teamIndex];
    if (team) {
      team.push(player);
    }
    teamIndex += direction;

    if (teamIndex >= teamSize || teamIndex < 0) {
      direction *= -1;
      teamIndex += direction;
    }
  }

  return teams;
}

/**
 * Calculate average team ELO
 */
export function calculateTeamElo(team: MatchmakingPlayer[]): number {
  if (team.length === 0) {
    return 0;
  }
  return Math.round(team.reduce((sum, p) => sum + p.eloRating, 0) / team.length);
}

/**
 * Calculate expected win probability for a team
 */
export function calculateTeamWinProbability(
  team: MatchmakingPlayer[],
  opponents: MatchmakingPlayer[]
): number {
  const teamElo = calculateTeamElo(team);
  const opponentElo = calculateTeamElo(opponents);
  return calculateExpectedScore(teamElo, opponentElo);
}

/**
 * Validate match fairness
 */
export function isMatchFair(
  players: MatchmakingPlayer[],
  maxEloDifference: number = 300
): boolean {
  if (players.length < 2) {
    return false;
  }

  const elos = players.map(p => p.eloRating);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);

  return (maxElo - minElo) <= maxEloDifference;
}
