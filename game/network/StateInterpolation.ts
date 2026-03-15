/**
 * State Interpolation for Bomberman Game
 * Smoothly interpolates between server state updates for rendering
 */

import type { GameState, Position } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface StateSnapshot {
  state: GameState;
  timestamp: number;
  serverTick: number;
}

export interface InterpolationConfig {
  /** Buffer size (number of states to keep) */
  bufferSize: number;
  /** Render delay in ms (to have states to interpolate between) */
  renderDelay: number;
  /** Maximum extrapolation time in ms */
  maxExtrapolation: number;
}

// ============================================================================
// STATE INTERPOLATION CLASS
// ============================================================================

/**
 * Handles smooth interpolation between server state updates
 */
export class StateInterpolation {
  private config: InterpolationConfig;
  private stateBuffer: StateSnapshot[] = [];
  private lastUpdateTime = 0;

  constructor(config: Partial<InterpolationConfig> = {}) {
    this.config = {
      bufferSize: 3,
      renderDelay: 100, // Render 100ms in the past
      maxExtrapolation: 50,
      ...config,
    };
  }

  // ==========================================================================
  // BUFFER MANAGEMENT
  // ==========================================================================

  /**
   * Add new state to buffer
   */
  addState(state: GameState, serverTick: number): void {
    const snapshot: StateSnapshot = {
      state: { ...state },
      timestamp: Date.now(),
      serverTick,
    };

    this.stateBuffer.push(snapshot);

    // Keep buffer at fixed size
    while (this.stateBuffer.length > this.config.bufferSize) {
      this.stateBuffer.shift();
    }

    this.lastUpdateTime = Date.now();
  }

  /**
   * Get interpolated state for rendering
   */
  getInterpolatedState(): GameState | null {
    if (this.stateBuffer.length === 0) {
      return null;
    }

    // Single state - just return it
    if (this.stateBuffer.length === 1) {
      const singleSnapshot = this.stateBuffer[0];
      if (singleSnapshot) {
        return singleSnapshot.state;
      }
      return null;
    }

    const now = Date.now();
    const renderTime = now - this.config.renderDelay;

    // Find two states to interpolate between
    let prevSnapshot: StateSnapshot | null = null;
    let nextSnapshot: StateSnapshot | null = null;

    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      const current = this.stateBuffer[i];
      const next = this.stateBuffer[i + 1];

      if (current && next && current.timestamp <= renderTime && next.timestamp >= renderTime) {
        prevSnapshot = current;
        nextSnapshot = next;
        break;
      }
    }

    // No valid interpolation pair found
    if (!prevSnapshot || !nextSnapshot) {
      // Use most recent state
      const mostRecent = this.stateBuffer[this.stateBuffer.length - 1];
      return mostRecent ? mostRecent.state : null;
    }

    // Calculate interpolation alpha
    const timeDiff = nextSnapshot.timestamp - prevSnapshot.timestamp;
    const elapsed = renderTime - prevSnapshot.timestamp;
    const alpha = timeDiff > 0 ? elapsed / timeDiff : 0;

    // Interpolate state
    return this.interpolateStates(prevSnapshot.state, nextSnapshot.state, alpha);
  }

  // ==========================================================================
  // INTERPOLATION LOGIC
  // ==========================================================================

  /**
   * Interpolate between two game states
   */
  private interpolateStates(
    prev: GameState,
    next: GameState,
    alpha: number
  ): GameState {
    // Clamp alpha
    alpha = Math.max(0, Math.min(1, alpha));

    // Create interpolated state
    const interpolated: GameState = {
      ...next,
      players: {},
      bombs: {},
    };

    // Interpolate player positions
    for (const playerId in next.players) {
      const prevPlayer = prev.players[playerId];
      const nextPlayer = next.players[playerId];

      if (prevPlayer && nextPlayer) {
        interpolated.players[playerId] = {
          ...nextPlayer,
          position: this.interpolatePosition(
            prevPlayer.position,
            nextPlayer.position,
            alpha
          ),
        };
      } else if (nextPlayer) {
        // Player just joined or left - no interpolation
        interpolated.players[playerId] = nextPlayer;
      }
    }

    // Interpolate bomb positions (for moving bombs)
    for (const bombId in next.bombs) {
      const prevBomb = prev.bombs[bombId];
      const nextBomb = next.bombs[bombId];

      if (prevBomb && nextBomb && nextBomb.state === 'moving') {
        interpolated.bombs[bombId] = {
          ...nextBomb,
          position: this.interpolatePosition(
            prevBomb.position,
            nextBomb.position,
            alpha
          ),
        };
      } else if (nextBomb) {
        interpolated.bombs[bombId] = nextBomb;
      }
    }

    return interpolated;
  }

  /**
   * Interpolate between two positions
   */
  private interpolatePosition(
    prev: Position,
    next: Position,
    alpha: number
  ): Position {
    return {
      x: prev.x + (next.x - prev.x) * alpha,
      y: prev.y + (next.y - prev.y) * alpha,
    };
  }

  /**
   * Extrapolate position based on velocity (for dead reckoning)
   */
  extrapolatePosition(
    position: Position,
    velocity: { x: number; y: number },
    deltaMs: number
  ): Position {
    const deltaSec = Math.min(deltaMs, this.config.maxExtrapolation) / 1000;

    return {
      x: position.x + velocity.x * deltaSec,
      y: position.y + velocity.y * deltaSec,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.stateBuffer.length;
  }

  /**
   * Get time since last update
   */
  getTimeSinceLastUpdate(): number {
    return Date.now() - this.lastUpdateTime;
  }

  /**
   * Check if interpolation is healthy
   */
  isHealthy(): boolean {
    return (
      this.stateBuffer.length >= 2 &&
      this.getTimeSinceLastUpdate() < 1000 / GAME_CONSTANTS.SERVER_TICK_RATE * 2
    );
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.stateBuffer = [];
    this.lastUpdateTime = 0;
  }

  /**
   * Get latest state
   */
  getLatestState(): GameState | null {
    if (this.stateBuffer.length === 0) return null;
    const latest = this.stateBuffer[this.stateBuffer.length - 1];
    return latest ? latest.state : null;
  }

  /**
   * Get buffer status for debugging
   */
  getDebugInfo() {
    return {
      bufferSize: this.stateBuffer.length,
      timeSinceUpdate: this.getTimeSinceLastUpdate(),
      isHealthy: this.isHealthy(),
      oldestTick: this.stateBuffer[0]?.serverTick,
      latestTick: this.stateBuffer[this.stateBuffer.length - 1]?.serverTick,
    };
  }
}
