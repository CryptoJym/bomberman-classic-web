/**
 * ELO System - Main Export
 *
 * A complete ELO rating system for Bomberman Online multiplayer
 */

// Calculator exports
export {
  calculateExpectedScore,
  calculateNewElo,
  calculateMultiplayerElo,
  calculate1v1Elo,
  clampEloChange,
  MIN_ELO_CHANGE,
  MAX_ELO_CHANGE,
  type PlayerGameResult,
  type PlayerEloChange,
} from './calculator';

// Ranks exports
export {
  RANK_THRESHOLDS,
  DEFAULT_ELO,
  RANK_INFO,
  getRankFromElo,
  getRankInfoFromElo,
  calculateRankProgress,
  getAllRanks,
  getRankIndex,
  compareRanks,
  type RankTierInfo,
} from './ranks';

// Matchmaking exports
export {
  DEFAULT_MATCHMAKING_CONFIG,
  calculateEloRange,
  canMatchPlayers,
  calculateMatchQuality,
  findBestMatch,
  createBalancedTeams,
  calculateTeamElo,
  calculateTeamWinProbability,
  isMatchFair,
  type MatchmakingPlayer,
  type MatchmakingConfig,
} from './matchmaking';
