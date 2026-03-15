'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  DEFAULT_BOARD,
  createInitialState,
  setDirection,
  stepGame,
  type Direction,
  type GridPoint,
  type SnakeGameState,
} from '@/lib/snake/game';

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
  }
}

const TICK_MS = 140;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

const TOUCH_DIRECTIONS: Array<{ direction: Direction; label: string }> = [
  { direction: 'up', label: 'UP' },
  { direction: 'left', label: 'LEFT' },
  { direction: 'right', label: 'RIGHT' },
  { direction: 'down', label: 'DOWN' },
];

function createReadyState() {
  return createInitialState(DEFAULT_BOARD, () => 0.25);
}

export function SnakeGame() {
  const [gameState, setGameState] = useState<SnakeGameState>(() => createReadyState());
  const [isPaused, setIsPaused] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const stateRef = useRef(gameState);
  const pausedRef = useRef(true);
  const startedRef = useRef(false);
  const queuedDirectionRef = useRef<Direction | null>(null);

  const commitState = useCallback((nextState: SnakeGameState) => {
    stateRef.current = nextState;
    setGameState(nextState);
  }, []);

  const restartGame = useCallback(() => {
    queuedDirectionRef.current = null;
    pausedRef.current = true;
    startedRef.current = false;
    setHasStarted(false);
    setIsPaused(true);
    commitState(createReadyState());
  }, [commitState]);

  const queueDirection = useCallback((direction: Direction) => {
    const baseDirection = queuedDirectionRef.current ?? stateRef.current.direction;
    const nextDirection = setDirection(
      {
        ...stateRef.current,
        direction: baseDirection,
      },
      direction
    ).direction;

    if (nextDirection !== baseDirection) {
      queuedDirectionRef.current = nextDirection;
    }

    if (!startedRef.current && stateRef.current.status === 'playing') {
      startedRef.current = true;
      pausedRef.current = false;
      setHasStarted(true);
      setIsPaused(false);
    }
  }, []);

  const advanceTick = useCallback((random: () => number = Math.random) => {
    if (pausedRef.current || stateRef.current.status === 'game-over') {
      return stateRef.current;
    }

    const nextBaseState = queuedDirectionRef.current
      ? setDirection(stateRef.current, queuedDirectionRef.current)
      : stateRef.current;

    queuedDirectionRef.current = null;

    const nextState = stepGame(nextBaseState, random);
    commitState(nextState);
    return nextState;
  }, [commitState]);

  const togglePause = useCallback(() => {
    if (stateRef.current.status === 'game-over') {
      return;
    }

    if (!startedRef.current) {
      startedRef.current = true;
      pausedRef.current = false;
      setHasStarted(true);
      setIsPaused(false);
      return;
    }

    setIsPaused((current) => {
      const nextPaused = !current;
      pausedRef.current = nextPaused;
      return nextPaused;
    });
  }, []);

  const renderTextState = useCallback(() => {
    return JSON.stringify({
      origin: 'top-left',
      axes: 'x-right y-down',
      board: stateRef.current.board,
      status: stateRef.current.status,
      paused: pausedRef.current,
      direction: stateRef.current.direction,
      score: stateRef.current.score,
      snake: stateRef.current.snake,
      food: stateRef.current.food,
    });
  }, []);

  const advanceTime = useCallback((ms: number) => {
    const steps = Math.max(1, Math.floor(ms / TICK_MS));

    for (let index = 0; index < steps; index += 1) {
      if (pausedRef.current || stateRef.current.status === 'game-over') {
        break;
      }

      advanceTick(() => 0);
    }
  }, [advanceTick]);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    startedRef.current = hasStarted;
  }, [hasStarted]);

  useEffect(() => {
    if (isPaused || gameState.status === 'game-over') {
      return;
    }

    const intervalId = window.setInterval(() => {
      advanceTick();
    }, TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [advanceTick, gameState.status, isPaused]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[event.key];

      if (direction) {
        event.preventDefault();
        queueDirection(direction);
        return;
      }

      if (event.key === 'p' || event.key === 'P' || event.key === ' ') {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === 'r' || event.key === 'R' || event.key === 'Enter') {
        event.preventDefault();
        restartGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [queueDirection, restartGame, togglePause]);

  useEffect(() => {
    window.render_game_to_text = renderTextState;
    window.advanceTime = advanceTime;

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [advanceTime, renderTextState]);

  const snakeLookup = new Map(gameState.snake.map((segment, index) => [toCellKey(segment), index]));
  const boardCells = [];

  for (let y = 0; y < gameState.board.height; y += 1) {
    for (let x = 0; x < gameState.board.width; x += 1) {
      const cellKey = toCellKey({ x, y });
      const snakeIndex = snakeLookup.get(cellKey);
      const cellState = getCellState({ x, y }, snakeIndex, gameState.food);

      boardCells.push(
        <div
          key={cellKey}
          className={getCellClassName(cellState)}
          data-cell-state={cellState}
        />
      );
    }
  }

  return (
    <main className="min-h-screen bg-retro-darker px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="text-center">
          <p className="text-pixel text-xs text-bomber-blue">CLASSIC MODE</p>
          <h1 className="mt-3 text-pixel text-2xl text-bomber-yellow md:text-4xl">SNAKE</h1>
          <p className="text-retro mt-4 text-lg text-gray-300">
            Eat the red food, grow longer, and stay off the walls.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 border-b-2 border-game-wall/40 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Board</CardTitle>
                <CardDescription>Arrow keys or WASD move. P pauses. R restarts.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={togglePause}
                  disabled={gameState.status === 'game-over'}
                >
                  {hasStarted ? (isPaused ? 'RESUME' : 'PAUSE') : 'START'}
                </Button>
                <Button variant="primary" size="sm" onClick={restartGame}>
                  RESTART
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mx-auto w-full max-w-[34rem]">
                <div className="relative aspect-square overflow-hidden border-4 border-game-wall bg-retro-dark shadow-[6px_6px_0_0_rgba(0,0,0,0.55)]">
                  <div
                    className="grid h-full w-full bg-retro-dark"
                    style={{
                      gridTemplateColumns: `repeat(${gameState.board.width}, minmax(0, 1fr))`,
                    }}
                  >
                    {boardCells}
                  </div>

                  {(isPaused || gameState.status === 'game-over') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-retro-dark/85 px-6 text-center">
                      <div className="space-y-4">
                        <p className="text-pixel text-sm text-bomber-yellow">
                          {gameState.status === 'game-over'
                            ? 'GAME OVER'
                            : hasStarted
                              ? 'PAUSED'
                              : 'READY'}
                        </p>
                        <p className="text-retro text-xl text-gray-200">
                          {gameState.status === 'game-over'
                            ? 'Press restart to jump back in.'
                            : hasStarted
                              ? 'Press pause again to keep moving.'
                              : 'Press any direction or start to begin.'}
                        </p>
                        {gameState.status === 'game-over' ? (
                          <Button variant="primary" size="sm" onClick={restartGame}>
                            PLAY AGAIN
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={togglePause}>
                            START
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score</CardTitle>
                <CardDescription>Current run</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatTile label="POINTS" value={String(gameState.score)} />
                <StatTile label="LENGTH" value={String(gameState.snake.length)} />
                <StatTile
                  label="STATUS"
                  value={
                    gameState.status === 'game-over'
                      ? 'OVER'
                      : hasStarted
                        ? isPaused
                          ? 'PAUSED'
                          : 'LIVE'
                        : 'READY'
                  }
                />
                <StatTile label="HEADING" value={gameState.direction.toUpperCase()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rules</CardTitle>
                <CardDescription>Minimal classic Snake only</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-retro text-lg text-gray-300">
                <p>1. Move one tile per tick.</p>
                <p>2. Eat food to grow and score.</p>
                <p>3. Hitting a wall or your own body ends the run.</p>
              </CardContent>
            </Card>

            <Card className="md:hidden">
              <CardHeader>
                <CardTitle>Touch Controls</CardTitle>
                <CardDescription>Tap a direction to queue the next turn</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <div />
                <DirectionButton direction="up" onPress={queueDirection} />
                <div />
                <DirectionButton direction="left" onPress={queueDirection} />
                <Button variant="secondary" size="sm" onClick={togglePause}>
                  {hasStarted ? (isPaused ? 'GO' : 'STOP') : 'START'}
                </Button>
                <DirectionButton direction="right" onPress={queueDirection} />
                <div />
                <DirectionButton direction="down" onPress={queueDirection} />
                <div />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function DirectionButton({
  direction,
  onPress,
}: {
  direction: Direction;
  onPress: (direction: Direction) => void;
}) {
  const label = TOUCH_DIRECTIONS.find((item) => item.direction === direction)?.label ?? direction;

  return (
    <Button variant="ghost" size="sm" onClick={() => onPress(direction)}>
      {label}
    </Button>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-game-wall/40 bg-retro-dark/70 px-3 py-4 text-center shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]">
      <p className="text-pixel text-[10px] text-gray-500">{label}</p>
      <p className="text-retro mt-3 text-2xl text-white">{value}</p>
    </div>
  );
}

function getCellState(
  point: GridPoint,
  snakeIndex: number | undefined,
  food: GridPoint
): 'empty' | 'food' | 'head' | 'body' {
  if (point.x === food.x && point.y === food.y) {
    return 'food';
  }

  if (snakeIndex === 0) {
    return 'head';
  }

  if (snakeIndex !== undefined) {
    return 'body';
  }

  return 'empty';
}

function getCellClassName(cellState: 'empty' | 'food' | 'head' | 'body') {
  const baseClassName = 'aspect-square border border-black/20';

  switch (cellState) {
    case 'head':
      return `${baseClassName} bg-bomber-yellow`;
    case 'body':
      return `${baseClassName} bg-bomber-green`;
    case 'food':
      return `${baseClassName} bg-bomber-red`;
    default:
      return `${baseClassName} bg-retro-dark`;
  }
}

function toCellKey(point: GridPoint) {
  return `${point.x},${point.y}`;
}
