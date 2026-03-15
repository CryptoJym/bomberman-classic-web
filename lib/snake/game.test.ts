import { describe, expect, test } from '@jest/globals';
import {
  createInitialState,
  setDirection,
  spawnFood,
  stepGame,
  type SnakeGameState,
} from './game';

describe('Snake game logic', () => {
  test('creates a centered opening snake with score at zero', () => {
    const state = createInitialState({ width: 12, height: 10 }, () => 0);

    expect(state.score).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.direction).toBe('right');
    expect(state.snake).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(state.food).not.toEqual(expect.objectContaining({ x: 6, y: 5 }));
  });

  test('moves forward one cell and drops the tail when no food is eaten', () => {
    const state: SnakeGameState = {
      board: { width: 8, height: 8 },
      direction: 'right',
      food: { x: 6, y: 6 },
      score: 0,
      snake: [
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
      status: 'playing',
    };

    const nextState = stepGame(state, () => 0);

    expect(nextState.snake).toEqual([
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
    ]);
    expect(nextState.score).toBe(0);
  });

  test('ignores an immediate reversal but accepts a perpendicular turn', () => {
    const state = createInitialState({ width: 12, height: 10 }, () => 0);

    const reversed = setDirection(state, 'left');
    const turned = setDirection(state, 'up');

    expect(reversed.direction).toBe('right');
    expect(turned.direction).toBe('up');
  });

  test('grows and increments the score when the snake eats food', () => {
    const state: SnakeGameState = {
      board: { width: 8, height: 8 },
      direction: 'right',
      food: { x: 4, y: 2 },
      score: 0,
      snake: [
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
      status: 'playing',
    };

    const nextState = stepGame(state, () => 0);

    expect(nextState.score).toBe(1);
    expect(nextState.snake).toEqual([
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ]);
    expect(nextState.food).toEqual({ x: 0, y: 0 });
  });

  test('marks the game over when the snake hits a wall', () => {
    const state: SnakeGameState = {
      board: { width: 5, height: 5 },
      direction: 'right',
      food: { x: 0, y: 0 },
      score: 2,
      snake: [
        { x: 4, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 2 },
      ],
      status: 'playing',
    };

    const nextState = stepGame(state, () => 0);

    expect(nextState.status).toBe('game-over');
    expect(nextState.snake).toEqual(state.snake);
  });

  test('marks the game over when the snake runs into itself', () => {
    const state: SnakeGameState = {
      board: { width: 6, height: 6 },
      direction: 'up',
      food: { x: 5, y: 5 },
      score: 4,
      snake: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      status: 'playing',
    };

    const nextState = stepGame(state, () => 0);

    expect(nextState.status).toBe('game-over');
  });

  test('spawns food only on empty cells', () => {
    const food = spawnFood(
      { width: 3, height: 2 },
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ],
      () => 0.99
    );

    expect(food).toEqual({ x: 2, y: 1 });
  });
});
