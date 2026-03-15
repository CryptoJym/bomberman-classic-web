/**
 * Input Prediction for Bomberman Game
 * Client-side prediction with server reconciliation
 */

import type { Position, GameState } from '@/types/game';
import type { InputState } from '../engine/InputHandler';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictedInput {
  input: InputState;
  sequence: number;
  timestamp: number;
  predictedPosition: Position;
}

export interface InputPredictionConfig {
  /** Maximum number of pending inputs to store */
  maxPendingInputs: number;
  /** Enable prediction */
  enabled: boolean;
}

// ============================================================================
// INPUT PREDICTION CLASS
// ============================================================================

/**
 * Handles client-side input prediction and server reconciliation
 */
export class InputPrediction {
  private config: InputPredictionConfig;
  private pendingInputs: PredictedInput[] = [];
  private currentSequence = 0;

  constructor(config: Partial<InputPredictionConfig> = {}) {
    this.config = {
      maxPendingInputs: 20,
      enabled: true,
      ...config,
    };
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  /**
   * Predict input and store for reconciliation
   */
  predict(input: InputState, currentPosition: Position): number {
    if (!this.config.enabled) {
      return this.currentSequence;
    }

    this.currentSequence++;

    // Calculate predicted position
    const predictedPosition = this.predictMovement(input, currentPosition);

    // Store pending input
    const predicted: PredictedInput = {
      input: { ...input },
      sequence: this.currentSequence,
      timestamp: Date.now(),
      predictedPosition,
    };

    this.pendingInputs.push(predicted);

    // Trim old inputs
    while (this.pendingInputs.length > this.config.maxPendingInputs) {
      this.pendingInputs.shift();
    }

    return this.currentSequence;
  }

  /**
   * Reconcile with server state
   */
  reconcile(
    serverState: GameState,
    localPlayerId: string,
    lastProcessedSequence: number
  ): Position | null {
    if (!this.config.enabled) {
      return null;
    }

    const serverPlayer = serverState.players[localPlayerId];
    if (!serverPlayer) {
      return null;
    }

    // Remove processed inputs
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.sequence > lastProcessedSequence
    );

    // If no pending inputs, use server position
    if (this.pendingInputs.length === 0) {
      return serverPlayer.position;
    }

    // Re-apply pending inputs on top of server position
    let reconciledPosition = { ...serverPlayer.position };

    for (const pending of this.pendingInputs) {
      reconciledPosition = this.predictMovement(pending.input, reconciledPosition);
    }

    return reconciledPosition;
  }

  /**
   * Predict movement based on input
   */
  private predictMovement(input: InputState, currentPosition: Position): Position {
    // Simple prediction - actual movement logic is on server
    // This is just for visual feedback
    const speed = 0.05; // Approximate speed per frame
    const newPos = { ...currentPosition };

    if (input.up) {
      newPos.y -= speed;
    } else if (input.down) {
      newPos.y += speed;
    }

    if (input.left) {
      newPos.x -= speed;
    } else if (input.right) {
      newPos.x += speed;
    }

    return newPos;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get current sequence number
   */
  getCurrentSequence(): number {
    return this.currentSequence;
  }

  /**
   * Get number of pending inputs
   */
  getPendingCount(): number {
    return this.pendingInputs.length;
  }

  /**
   * Clear all pending inputs
   */
  clear(): void {
    this.pendingInputs = [];
  }

  /**
   * Reset sequence number
   */
  reset(): void {
    this.currentSequence = 0;
    this.pendingInputs = [];
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      currentSequence: this.currentSequence,
      pendingCount: this.pendingInputs.length,
      oldestPending: this.pendingInputs[0]?.sequence,
      newestPending: this.pendingInputs[this.pendingInputs.length - 1]?.sequence,
    };
  }

  /**
   * Enable/disable prediction
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
}
