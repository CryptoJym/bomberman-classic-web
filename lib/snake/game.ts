export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GridPoint {
  x: number;
  y: number;
}

export interface BoardSize {
  width: number;
  height: number;
}

export interface SnakeGameState {
  board: BoardSize;
  direction: Direction;
  food: GridPoint;
  score: number;
  snake: GridPoint[];
  status: 'playing' | 'game-over';
}

export type RandomSource = () => number;

export const DEFAULT_BOARD: BoardSize = {
  width: 16,
  height: 16,
};

const DIRECTION_VECTORS: Record<Direction, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createInitialState(
  board: BoardSize = DEFAULT_BOARD,
  random: RandomSource = Math.random
): SnakeGameState {
  const centerX = Math.floor(board.width / 2);
  const centerY = Math.floor(board.height / 2);
  const snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];

  return {
    board,
    direction: 'right',
    food: spawnFood(board, snake, random),
    score: 0,
    snake,
    status: 'playing',
  };
}

export function setDirection(state: SnakeGameState, nextDirection: Direction): SnakeGameState {
  if (OPPOSITE_DIRECTIONS[state.direction] === nextDirection) {
    return state;
  }

  return {
    ...state,
    direction: nextDirection,
  };
}

export function stepGame(
  state: SnakeGameState,
  random: RandomSource = Math.random
): SnakeGameState {
  if (state.status === 'game-over') {
    return state;
  }

  const head = state.snake[0];
  if (!head) {
    return {
      ...state,
      status: 'game-over',
    };
  }

  const vector = DIRECTION_VECTORS[state.direction];
  const nextHead = {
    x: head.x + vector.x,
    y: head.y + vector.y,
  };
  const ateFood = isSamePoint(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (isOutsideBoard(nextHead, state.board) || pointExists(nextHead, collisionBody)) {
    return {
      ...state,
      status: 'game-over',
    };
  }

  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  return {
    ...state,
    food: ateFood ? spawnFood(state.board, nextSnake, random) : state.food,
    score: ateFood ? state.score + 1 : state.score,
    snake: nextSnake,
  };
}

export function spawnFood(
  board: BoardSize,
  snake: GridPoint[],
  random: RandomSource = Math.random
): GridPoint {
  const availableCells: GridPoint[] = [];
  const fallbackCell = snake[0] ?? { x: 0, y: 0 };

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const candidate = { x, y };

      if (!pointExists(candidate, snake)) {
        availableCells.push(candidate);
      }
    }
  }

  if (availableCells.length === 0) {
    return fallbackCell;
  }

  const index = Math.min(availableCells.length - 1, Math.floor(random() * availableCells.length));
  return availableCells[index] ?? fallbackCell;
}

function pointExists(point: GridPoint, cells: GridPoint[]): boolean {
  return cells.some((cell) => isSamePoint(point, cell));
}

function isSamePoint(left: GridPoint, right: GridPoint): boolean {
  return left.x === right.x && left.y === right.y;
}

function isOutsideBoard(point: GridPoint, board: BoardSize): boolean {
  return point.x < 0 || point.y < 0 || point.x >= board.width || point.y >= board.height;
}
