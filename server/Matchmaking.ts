/**
 * Matchmaking System for Bomberman Game Server
 * Handles player queuing and match finding based on skill/ELO
 */

import crypto from 'crypto';
import type { ServerPlayer } from './Player';

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedPlayer {
  /** Player reference */
  player: ServerPlayer;
  /** Queue entry timestamp */
  queuedAt: number;
  /** Player's ELO rating */
  eloRating: number;
  /** Preferred game mode */
  gameMode: GameMode;
  /** Max acceptable ELO difference (expands over time) */
  maxEloDiff: number;
  /** Region preference */
  region?: string;
}

export interface MatchResult {
  /** Unique match ID */
  matchId: string;
  /** Matched players */
  players: ServerPlayer[];
  /** Game mode for the match */
  gameMode: GameMode;
  /** Average ELO of the match */
  averageElo: number;
  /** Time taken to find match (ms) */
  matchTimeMs: number;
}

export interface MatchmakingStats {
  /** Players currently in queue */
  playersInQueue: number;
  /** Players by game mode */
  playersByMode: Record<GameMode, number>;
  /** Average queue time (ms) */
  averageQueueTime: number;
  /** Matches made in last hour */
  matchesLastHour: number;
  /** Average ELO spread in matches */
  averageEloSpread: number;
}

export type GameMode = 'classic' | 'battle_royale' | 'teams' | 'duel';

export interface MatchmakingConfig {
  /** Minimum players to start a match */
  minPlayers: Record<GameMode, number>;
  /** Maximum players per match */
  maxPlayers: Record<GameMode, number>;
  /** Initial ELO range for matching */
  initialEloRange: number;
  /** ELO range expansion per second */
  eloRangeExpansionPerSec: number;
  /** Maximum ELO range */
  maxEloRange: number;
  /** Queue timeout (ms) */
  queueTimeoutMs: number;
  /** Match check interval (ms) */
  matchCheckIntervalMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MatchmakingConfig = {
  minPlayers: {
    classic: 2,
    battle_royale: 4,
    teams: 4,
    duel: 2,
  },
  maxPlayers: {
    classic: 8,
    battle_royale: 16,
    teams: 8,
    duel: 2,
  },
  initialEloRange: 100,
  eloRangeExpansionPerSec: 10,
  maxEloRange: 500,
  queueTimeoutMs: 120000, // 2 minutes
  matchCheckIntervalMs: 1000, // 1 second
};

const DEFAULT_ELO = 1000;
const ELO_K_FACTOR = 32;

// ============================================================================
// MATCHMAKING QUEUE CLASS
// ============================================================================

export class MatchmakingQueue {
  /** Queue of players waiting for a match */
  private queue: Map<string, QueuedPlayer> = new Map();

  /** Configuration */
  private config: MatchmakingConfig;

  /** Match check interval handle */
  private matchCheckInterval: NodeJS.Timeout | null = null;

  /** Callback when a match is found */
  private onMatchFound: ((match: MatchResult) => void) | null = null;

  /** Statistics tracking */
  private stats = {
    totalMatches: 0,
    totalQueueTime: 0,
    totalEloSpread: 0,
    matchesLastHour: [] as number[],
  };

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(config: Partial<MatchmakingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Start the matchmaking service
   */
  start(onMatchFound: (match: MatchResult) => void): void {
    this.onMatchFound = onMatchFound;

    // Start periodic match checking
    this.matchCheckInterval = setInterval(() => {
      this.processQueue();
    }, this.config.matchCheckIntervalMs);

    console.log('Matchmaking service started');
  }

  /**
   * Stop the matchmaking service
   */
  stop(): void {
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
      this.matchCheckInterval = null;
    }
    this.queue.clear();
    console.log('Matchmaking service stopped');
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Add a player to the matchmaking queue
   */
  enqueue(
    player: ServerPlayer,
    gameMode: GameMode = 'classic',
    eloRating: number = DEFAULT_ELO,
    region?: string
  ): { success: boolean; position: number; estimatedWaitMs: number } {
    // Check if already in queue
    if (this.queue.has(player.id)) {
      return {
        success: false,
        position: -1,
        estimatedWaitMs: 0,
      };
    }

    // Check if player is already in a room
    if (player.roomId) {
      return {
        success: false,
        position: -1,
        estimatedWaitMs: 0,
      };
    }

    const queuedPlayer: QueuedPlayer = {
      player,
      queuedAt: Date.now(),
      eloRating,
      gameMode,
      maxEloDiff: this.config.initialEloRange,
      region,
    };

    this.queue.set(player.id, queuedPlayer);

    // Calculate queue position and estimated wait
    const position = this.getQueuePosition(player.id, gameMode);
    const estimatedWaitMs = this.estimateWaitTime(gameMode, eloRating);

    return {
      success: true,
      position,
      estimatedWaitMs,
    };
  }

  /**
   * Remove a player from the queue
   */
  dequeue(playerId: string): boolean {
    return this.queue.delete(playerId);
  }

  /**
   * Check if a player is in the queue
   */
  isInQueue(playerId: string): boolean {
    return this.queue.has(playerId);
  }

  /**
   * Get queue position for a player
   */
  getQueuePosition(playerId: string, gameMode: GameMode): number {
    let position = 0;
    for (const [id, qp] of this.queue.entries()) {
      if (qp.gameMode === gameMode) {
        position++;
        if (id === playerId) {
          return position;
        }
      }
    }
    return -1;
  }

  /**
   * Estimate wait time based on current queue state
   */
  private estimateWaitTime(gameMode: GameMode, eloRating: number): number {
    const playersInMode = this.getPlayersInMode(gameMode);
    const minPlayers = this.config.minPlayers[gameMode];

    if (playersInMode >= minPlayers - 1) {
      // Match could happen soon
      return 5000;
    }

    // Estimate based on historical data
    const avgQueueTime = this.stats.totalMatches > 0
      ? this.stats.totalQueueTime / this.stats.totalMatches
      : 30000;

    // Adjust for ELO extremes
    const eloFactor = Math.abs(eloRating - DEFAULT_ELO) / 500;
    return Math.min(avgQueueTime * (1 + eloFactor), this.config.queueTimeoutMs);
  }

  /**
   * Get count of players in a specific game mode
   */
  private getPlayersInMode(gameMode: GameMode): number {
    let count = 0;
    for (const qp of this.queue.values()) {
      if (qp.gameMode === gameMode) {
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // MATCH PROCESSING
  // ============================================================================

  /**
   * Process the queue and find matches
   */
  private processQueue(): void {
    const now = Date.now();

    // Update ELO ranges and remove timed-out players
    const timedOut: string[] = [];
    for (const [playerId, qp] of this.queue.entries()) {
      const waitTime = now - qp.queuedAt;

      // Check for timeout
      if (waitTime > this.config.queueTimeoutMs) {
        timedOut.push(playerId);
        continue;
      }

      // Expand ELO range over time
      const expansionSeconds = waitTime / 1000;
      qp.maxEloDiff = Math.min(
        this.config.maxEloRange,
        this.config.initialEloRange + expansionSeconds * this.config.eloRangeExpansionPerSec
      );
    }

    // Remove timed-out players
    for (const playerId of timedOut) {
      const qp = this.queue.get(playerId);
      if (qp) {
        qp.player.send({
          type: 'error',
          code: 2004,
          message: 'Matchmaking timed out',
        } as any);
      }
      this.queue.delete(playerId);
    }

    // Group players by game mode
    const byMode = new Map<GameMode, QueuedPlayer[]>();
    for (const qp of this.queue.values()) {
      if (!byMode.has(qp.gameMode)) {
        byMode.set(qp.gameMode, []);
      }
      byMode.get(qp.gameMode)!.push(qp);
    }

    // Try to form matches for each mode
    for (const [mode, players] of byMode.entries()) {
      this.tryFormMatch(mode, players);
    }

    // Clean up old stats
    const oneHourAgo = now - 3600000;
    this.stats.matchesLastHour = this.stats.matchesLastHour.filter(t => t > oneHourAgo);
  }

  /**
   * Try to form a match from queued players
   */
  private tryFormMatch(mode: GameMode, queuedPlayers: QueuedPlayer[]): void {
    const minPlayers = this.config.minPlayers[mode];
    const maxPlayers = this.config.maxPlayers[mode];

    if (queuedPlayers.length < minPlayers) {
      return; // Not enough players
    }

    // Sort by ELO for better matching
    const sorted = [...queuedPlayers].sort((a, b) => a.eloRating - b.eloRating);

    // Try to find the best match
    const match = this.findBestMatch(sorted, minPlayers, maxPlayers);

    if (match) {
      this.createMatch(match, mode);
    }
  }

  /**
   * Find the best match from sorted players
   */
  private findBestMatch(
    sorted: QueuedPlayer[],
    minPlayers: number,
    maxPlayers: number
  ): QueuedPlayer[] | null {
    // Try different group sizes, preferring larger groups
    for (let size = Math.min(maxPlayers, sorted.length); size >= minPlayers; size--) {
      // Sliding window to find best ELO-matched group
      let bestGroup: QueuedPlayer[] | null = null;
      let bestSpread = Infinity;

      for (let i = 0; i <= sorted.length - size; i++) {
        const group = sorted.slice(i, i + size);
        const spread = group[group.length - 1].eloRating - group[0].eloRating;

        // Check if all players can match with each other
        const canMatch = this.canPlayersMatch(group);

        if (canMatch && spread < bestSpread) {
          bestSpread = spread;
          bestGroup = group;
        }
      }

      if (bestGroup) {
        return bestGroup;
      }
    }

    return null;
  }

  /**
   * Check if a group of players can match with each other
   */
  private canPlayersMatch(group: QueuedPlayer[]): boolean {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const eloDiff = Math.abs(group[i].eloRating - group[j].eloRating);
        const maxAllowed = Math.min(group[i].maxEloDiff, group[j].maxEloDiff);
        if (eloDiff > maxAllowed) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Create a match from selected players
   */
  private createMatch(queuedPlayers: QueuedPlayer[], mode: GameMode): void {
    const now = Date.now();
    const matchId = crypto.randomUUID();

    // Calculate stats
    const eloRatings = queuedPlayers.map(qp => qp.eloRating);
    const averageElo = eloRatings.reduce((a, b) => a + b, 0) / eloRatings.length;
    const eloSpread = Math.max(...eloRatings) - Math.min(...eloRatings);
    const queueTimes = queuedPlayers.map(qp => now - qp.queuedAt);
    const avgQueueTime = queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length;

    // Remove matched players from queue
    for (const qp of queuedPlayers) {
      this.queue.delete(qp.player.id);
    }

    // Update statistics
    this.stats.totalMatches++;
    this.stats.totalQueueTime += avgQueueTime;
    this.stats.totalEloSpread += eloSpread;
    this.stats.matchesLastHour.push(now);

    const match: MatchResult = {
      matchId,
      players: queuedPlayers.map(qp => qp.player),
      gameMode: mode,
      averageElo,
      matchTimeMs: avgQueueTime,
    };

    console.log(
      `Match created: ${matchId} | Mode: ${mode} | Players: ${match.players.length} | ` +
      `Avg ELO: ${averageElo.toFixed(0)} | Spread: ${eloSpread} | Queue time: ${avgQueueTime.toFixed(0)}ms`
    );

    // Notify callback
    if (this.onMatchFound) {
      this.onMatchFound(match);
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get current matchmaking statistics
   */
  getStats(): MatchmakingStats {
    const playersByMode: Record<GameMode, number> = {
      classic: 0,
      battle_royale: 0,
      teams: 0,
      duel: 0,
    };

    for (const qp of this.queue.values()) {
      playersByMode[qp.gameMode]++;
    }

    return {
      playersInQueue: this.queue.size,
      playersByMode,
      averageQueueTime: this.stats.totalMatches > 0
        ? this.stats.totalQueueTime / this.stats.totalMatches
        : 0,
      matchesLastHour: this.stats.matchesLastHour.length,
      averageEloSpread: this.stats.totalMatches > 0
        ? this.stats.totalEloSpread / this.stats.totalMatches
        : 0,
    };
  }

  /**
   * Get queue status for a player
   */
  getPlayerStatus(playerId: string): {
    inQueue: boolean;
    position: number;
    waitTimeMs: number;
    estimatedRemainingMs: number;
  } | null {
    const qp = this.queue.get(playerId);
    if (!qp) {
      return null;
    }

    const waitTimeMs = Date.now() - qp.queuedAt;
    const position = this.getQueuePosition(playerId, qp.gameMode);
    const estimatedRemainingMs = Math.max(
      0,
      this.estimateWaitTime(qp.gameMode, qp.eloRating) - waitTimeMs
    );

    return {
      inQueue: true,
      position,
      waitTimeMs,
      estimatedRemainingMs,
    };
  }
}

// ============================================================================
// ELO CALCULATION
// ============================================================================

/**
 * Calculate new ELO ratings after a match
 */
export function calculateEloChanges(
  players: Array<{ id: string; elo: number; placement: number }>,
  kFactor: number = ELO_K_FACTOR
): Map<string, { newElo: number; change: number }> {
  const results = new Map<string, { newElo: number; change: number }>();
  const n = players.length;

  for (const player of players) {
    let eloChange = 0;

    // Compare against all other players
    for (const opponent of players) {
      if (player.id === opponent.id) continue;

      // Expected score based on ELO difference
      const expectedScore = 1 / (1 + Math.pow(10, (opponent.elo - player.elo) / 400));

      // Actual score based on placement
      let actualScore: number;
      if (player.placement < opponent.placement) {
        actualScore = 1; // Won
      } else if (player.placement > opponent.placement) {
        actualScore = 0; // Lost
      } else {
        actualScore = 0.5; // Tie
      }

      // ELO change against this opponent
      eloChange += kFactor * (actualScore - expectedScore);
    }

    // Average the change across all opponents
    eloChange = Math.round(eloChange / (n - 1));

    results.set(player.id, {
      newElo: Math.max(100, player.elo + eloChange), // Min ELO of 100
      change: eloChange,
    });
  }

  return results;
}

/**
 * Calculate ELO for a 1v1 match
 */
export function calculateDuelElo(
  winner: { id: string; elo: number },
  loser: { id: string; elo: number },
  kFactor: number = ELO_K_FACTOR
): { winnerNewElo: number; loserNewElo: number; change: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  const change = Math.round(kFactor * (1 - expectedWinner));

  return {
    winnerNewElo: winner.elo + change,
    loserNewElo: Math.max(100, loser.elo - change),
    change,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MatchmakingQueue;
