import crypto from 'crypto';

const BOARD_WIDTH = 15;
const BOARD_HEIGHT = 13;
export const MAX_PLAYERS = 16;
export const CLASSIC_TICK_RATE_HZ = 20;
const TICK_RATE = CLASSIC_TICK_RATE_HZ; // Hz
const BOMB_FUSE_MS = 2200;
const EXPLOSION_MS = 600;
const MOVE_COOLDOWN_MS = 120;
const DEFAULT_BOMB_RADIUS = 2;
const MAX_BOMBS_PER_PLAYER = 1;
const INTERMISSION_MS = 3500;

const POWERUP_SPAWN_PROB = 0.25;
const POWERUP_TYPES = ['bomb', 'radius', 'speed'];
const MAX_BOMBS_CAP = 4;
const MAX_RADIUS_CAP = 6;
const MIN_COOLDOWN_MS = 60;

const TILE_EMPTY = 0;
const TILE_SOLID = 1;
const TILE_SOFT = 2;

const DEFAULT_ROOM_CODE = 'CLASSIC';
const ROOM_CODE_LENGTH = 8;

const COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  '#d2f53c', '#fabebe', '#008080', '#e6beff', '#aa6e28', '#fffac8', '#800000', '#aaffc3',
];

export function normalizeRoomCode(rawValue) {
  const cleaned = String(rawValue || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);

  return cleaned || DEFAULT_ROOM_CODE;
}

function mulberry32(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t |= 0;
    t = t + 0x6D2B79F5 | 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

function getSpawnPositions(width, height) {
  const positions = [];
  positions.push({ x: 1, y: 1 });
  positions.push({ x: width - 2, y: 1 });
  positions.push({ x: 1, y: height - 2 });
  positions.push({ x: width - 2, y: height - 2 });
  positions.push({ x: 1, y: 3 });
  positions.push({ x: 3, y: 1 });
  positions.push({ x: width - 2, y: 3 });
  positions.push({ x: width - 4, y: 1 });
  positions.push({ x: 1, y: height - 4 });
  positions.push({ x: 3, y: height - 2 });
  positions.push({ x: width - 2, y: height - 4 });
  positions.push({ x: width - 4, y: height - 2 });
  positions.push({ x: Math.floor(width / 2), y: 1 });
  positions.push({ x: 1, y: Math.floor(height / 2) });
  positions.push({ x: width - 2, y: Math.floor(height / 2) });
  positions.push({ x: Math.floor(width / 2), y: height - 2 });
  return positions.slice(0, MAX_PLAYERS);
}

function createBoard(width, height, seed) {
  const rng = mulberry32(seed);
  const tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => TILE_EMPTY));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (isBorder) {
        tiles[y][x] = TILE_SOLID;
      }
    }
  }

  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      tiles[y][x] = TILE_SOLID;
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (tiles[y][x] !== TILE_EMPTY) continue;
      if (rng() < 0.72) {
        tiles[y][x] = TILE_SOFT;
      }
    }
  }

  const spawns = getSpawnPositions(width, height);
  for (const { x, y } of spawns) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const sx = x + dx;
        const sy = y + dy;
        if (sx > 0 && sx < width - 1 && sy > 0 && sy < height - 1 && tiles[sy][sx] === TILE_SOFT) {
          tiles[sy][sx] = TILE_EMPTY;
        }
      }
    }
  }

  return { width, height, tiles };
}

function createRoom(roomCode) {
  return {
    roomCode,
    board: createBoard(BOARD_WIDTH, BOARD_HEIGHT, Math.floor(Math.random() * 1e9)),
    players: new Map(),
    connections: new Map(),
    bombs: [],
    explosions: [],
    pickups: [],
    round: {
      phase: 'playing',
      endsAt: 0,
      winnerId: null,
      roundNumber: 1,
    },
    lastTickAt: Date.now(),
  };
}

function getOrCreateRoom(rooms, roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, createRoom(roomCode));
  }
  return rooms.get(roomCode);
}

function bombAt(room, x, y) {
  return room.bombs.find((bomb) => bomb.x === x && bomb.y === y);
}

function isWalkable(room, x, y) {
  if (x < 1 || y < 1 || x >= room.board.width - 1 || y >= room.board.height - 1) return false;
  if (room.board.tiles[y][x] !== TILE_EMPTY) return false;
  return !bombAt(room, x, y);
}

function offsetPosition(x, y, direction) {
  if (direction === 'left') return { x: x - 1, y };
  if (direction === 'right') return { x: x + 1, y };
  if (direction === 'up') return { x, y: y - 1 };
  if (direction === 'down') return { x, y: y + 1 };
  return { x, y };
}

function findFreeSpawn(room) {
  const spawns = getSpawnPositions(room.board.width, room.board.height);
  for (const pos of spawns) {
    let occupied = false;
    for (const player of room.players.values()) {
      if (player.alive && player.x === pos.x && player.y === pos.y) {
        occupied = true;
        break;
      }
    }
    if (!occupied) return pos;
  }

  for (let y = 1; y < room.board.height - 1; y += 1) {
    for (let x = 1; x < room.board.width - 1; x += 1) {
      if (room.board.tiles[y][x] === TILE_EMPTY && !bombAt(room, x, y)) {
        return { x, y };
      }
    }
  }

  return { x: 1, y: 1 };
}

function maybeSpawnPowerup(room, x, y) {
  if (Math.random() > POWERUP_SPAWN_PROB) return;
  if (room.board.tiles[y]?.[x] !== TILE_EMPTY) return;
  if (room.pickups.some((pickup) => pickup.x === x && pickup.y === y)) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  room.pickups.push({ id: crypto.randomUUID(), x, y, type });
}

function resolveStepTarget(room, player) {
  const heldDirections = player.input.heldDirections || {};
  const candidates = [];

  if (player.input.direction) candidates.push(player.input.direction);
  if (player.lastMoveDirection && heldDirections[player.lastMoveDirection]) candidates.push(player.lastMoveDirection);
  for (const direction of ['up', 'down', 'left', 'right']) {
    if (heldDirections[direction]) candidates.push(direction);
  }

  const uniqueCandidates = candidates.filter((direction, index) => candidates.indexOf(direction) === index);
  for (const direction of uniqueCandidates) {
    const target = offsetPosition(player.x, player.y, direction);
    if (isWalkable(room, target.x, target.y)) {
      return { direction, ...target };
    }
  }

  return null;
}

function placeBomb(room, player) {
  if (!player.alive) return;
  if (player.activeBombs >= player.maxBombs) return;
  if (bombAt(room, player.x, player.y)) return;

  room.bombs.push({
    id: crypto.randomUUID(),
    x: player.x,
    y: player.y,
    ownerId: player.id,
    radius: player.bombRadius,
    explodeAt: Date.now() + BOMB_FUSE_MS,
    exploded: false,
  });

  player.activeBombs += 1;
}

function explodeBomb(room, bomb, triggeredAt) {
  if (bomb.exploded) return;
  bomb.exploded = true;

  const flames = new Set();
  const push = (x, y) => flames.add(`${x},${y}`);
  push(bomb.x, bomb.y);

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const { dx, dy } of directions) {
    for (let step = 1; step <= bomb.radius; step += 1) {
      const x = bomb.x + dx * step;
      const y = bomb.y + dy * step;
      const tile = room.board.tiles[y]?.[x];
      if (tile === undefined || tile === TILE_SOLID) break;
      push(x, y);
      const chainedBomb = bombAt(room, x, y);
      if (chainedBomb && !chainedBomb.exploded) {
        explodeBomb(room, chainedBomb, triggeredAt);
      }
      if (tile === TILE_SOFT) break;
    }
  }

  for (const key of flames) {
    const [x, y] = key.split(',').map(Number);
    if (room.board.tiles[y][x] === TILE_SOFT) {
      room.board.tiles[y][x] = TILE_EMPTY;
      maybeSpawnPowerup(room, x, y);
    }
  }

  room.explosions.push({
    id: crypto.randomUUID(),
    cells: Array.from(flames, (value) => {
      const [x, y] = value.split(',').map(Number);
      return { x, y };
    }),
    expiresAt: triggeredAt + EXPLOSION_MS,
  });

  const activeExplosion = room.explosions[room.explosions.length - 1];
  for (const cell of activeExplosion.cells) {
    for (const player of room.players.values()) {
      if (player.alive && player.x === cell.x && player.y === cell.y) {
        player.alive = false;
        player.respawnAt = 0;
      }
    }
  }

  const owner = room.players.get(bomb.ownerId);
  if (owner) {
    owner.activeBombs = Math.max(0, owner.activeBombs - 1);
  }
}

function stepPlayer(room, player) {
  if (!player.alive) return;
  if (!player.moveCooldownMs) player.moveCooldownMs = MOVE_COOLDOWN_MS;
  if (player.timeUntilNextMoveMs > 0) return;

  const target = resolveStepTarget(room, player);
  if (!target) {
    if (player.input.direction) {
      player.timeUntilNextMoveMs = Math.min(player.timeUntilNextMoveMs + 10, player.moveCooldownMs);
    }
    return;
  }

  player.x = target.x;
  player.y = target.y;
  player.lastMoveDirection = target.direction;
  player.timeUntilNextMoveMs = player.moveCooldownMs;
}

function collectPowerups(room, player) {
  if (!player.alive) return;
  const pickupIndex = room.pickups.findIndex((pickup) => pickup.x === player.x && pickup.y === player.y);
  if (pickupIndex === -1) return;

  const pickup = room.pickups[pickupIndex];
  room.pickups.splice(pickupIndex, 1);
  if (pickup.type === 'bomb') {
    player.maxBombs = Math.min(MAX_BOMBS_CAP, player.maxBombs + 1);
  } else if (pickup.type === 'radius') {
    player.bombRadius = Math.min(MAX_RADIUS_CAP, player.bombRadius + 1);
  } else if (pickup.type === 'speed') {
    player.moveCooldownMs = Math.max(MIN_COOLDOWN_MS, player.moveCooldownMs - 15);
    if (player.timeUntilNextMoveMs > player.moveCooldownMs) {
      player.timeUntilNextMoveMs = player.moveCooldownMs;
    }
  }
}

function resetPlayerInput(player) {
  player.input.direction = null;
  player.input.bomb = false;
  player.input.lastBomb = false;
  player.input.heldDirections = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

function resetRound(room) {
  room.board = createBoard(BOARD_WIDTH, BOARD_HEIGHT, Math.floor(Math.random() * 1e9));
  room.bombs = [];
  room.explosions = [];
  room.pickups = [];

  const spawns = getSpawnPositions(room.board.width, room.board.height);
  let spawnIndex = 0;
  for (const player of room.players.values()) {
    const spawn = spawns[spawnIndex % spawns.length];
    spawnIndex += 1;
    player.x = spawn.x;
    player.y = spawn.y;
    player.alive = true;
    player.respawnAt = 0;
    player.activeBombs = 0;
    player.bombRadius = DEFAULT_BOMB_RADIUS;
    player.maxBombs = MAX_BOMBS_PER_PLAYER;
    player.moveCooldownMs = MOVE_COOLDOWN_MS;
    player.lastMoveDirection = null;
    player.timeUntilNextMoveMs = 0;
    resetPlayerInput(player);
  }

  room.round.phase = 'playing';
  room.round.winnerId = null;
  room.round.endsAt = 0;
  room.round.roundNumber += 1;
}

function serializeState(room) {
  const now = Date.now();
  return {
    t: now,
    roomCode: room.roomCode,
    playerCount: room.players.size,
    maxPlayers: MAX_PLAYERS,
    board: room.board,
    bombs: room.bombs.map((bomb) => ({
      x: bomb.x,
      y: bomb.y,
      radius: bomb.radius,
      timeLeftMs: Math.max(0, bomb.explodeAt - now),
    })),
    explosions: room.explosions.map((explosion) => ({
      cells: explosion.cells,
      timeLeftMs: Math.max(0, explosion.expiresAt - now),
    })),
    players: Array.from(room.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
      alive: player.alive,
      wins: player.wins ?? 0,
      activeBombs: player.activeBombs,
      maxBombs: player.maxBombs,
      bombRadius: player.bombRadius,
      moveCooldownMs: player.moveCooldownMs,
    })),
    pickups: room.pickups,
    round: {
      phase: room.round.phase,
      winnerId: room.round.winnerId,
      roundNumber: room.round.roundNumber,
      timeLeftMs: room.round.phase === 'intermission' ? Math.max(0, room.round.endsAt - now) : 0,
    },
  };
}

function broadcastRoom(room, message) {
  const payload = JSON.stringify(message);
  for (const ws of room.connections.values()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

function createPlayer(room, ws) {
  const spawn = findFreeSpawn(room);
  return {
    id: crypto.randomUUID(),
    name: `P${String(room.players.size + 1).padStart(2, '0')}`,
    color: COLORS[room.players.size % COLORS.length],
    x: spawn.x,
    y: spawn.y,
    alive: true,
    respawnAt: 0,
    input: {
      direction: null,
      bomb: false,
      lastBomb: false,
      heldDirections: {
        up: false,
        down: false,
        left: false,
        right: false,
      },
    },
    lastMoveDirection: null,
    timeUntilNextMoveMs: 0,
    moveCooldownMs: MOVE_COOLDOWN_MS,
    bombRadius: DEFAULT_BOMB_RADIUS,
    maxBombs: MAX_BOMBS_PER_PLAYER,
    activeBombs: 0,
    wins: 0,
    roomCode: room.roomCode,
  };
}

function addPlayer(room, ws) {
  const player = createPlayer(room, ws);
  room.players.set(player.id, player);
  room.connections.set(player.id, ws);
  ws.send(JSON.stringify({ type: 'you', id: player.id, roomCode: room.roomCode }));
  return player;
}

function removePlayer(rooms, room, playerId) {
  room.players.delete(playerId);
  room.connections.delete(playerId);
  if (room.players.size === 0) {
    rooms.delete(room.roomCode);
  }
}

function tickRoom(room, now) {
  const dt = now - room.lastTickAt;
  room.lastTickAt = now;

  if (room.round.phase === 'intermission' && now >= room.round.endsAt) {
    resetRound(room);
  }

  for (const player of room.players.values()) {
    player.timeUntilNextMoveMs = Math.max(0, player.timeUntilNextMoveMs - dt);
    stepPlayer(room, player);
    collectPowerups(room, player);
    if (player.input.bomb && !player.input.lastBomb) {
      placeBomb(room, player);
    }
    player.input.lastBomb = player.input.bomb;
  }

  for (const bomb of room.bombs) {
    if (!bomb.exploded && now >= bomb.explodeAt) {
      explodeBomb(room, bomb, now);
    }
  }
  room.bombs = room.bombs.filter((bomb) => !bomb.exploded);
  room.explosions = room.explosions.filter((explosion) => now < explosion.expiresAt);

  if (room.round.phase === 'playing') {
    let alivePlayers = 0;
    let lastAliveId = null;
    for (const player of room.players.values()) {
      if (player.alive) {
        alivePlayers += 1;
        lastAliveId = player.id;
      }
    }
    if (alivePlayers <= 1 && room.players.size > 1) {
      room.round.phase = 'intermission';
      room.round.winnerId = lastAliveId;
      room.round.endsAt = now + INTERMISSION_MS;
      if (lastAliveId) {
        const winner = room.players.get(lastAliveId);
        if (winner) winner.wins = (winner.wins ?? 0) + 1;
      }
    }
  }

  broadcastRoom(room, { type: 'state', ...serializeState(room) });
}

function resolveRoomCodeFromRequest(req) {
  try {
    const url = new URL(req?.url || '/', `http://${req?.headers?.host || 'localhost'}`);
    return normalizeRoomCode(url.searchParams.get('room'));
  } catch {
    return DEFAULT_ROOM_CODE;
  }
}

export function attachClassicRoomServer(wss) {
  const rooms = new Map();

  wss.on('connection', (ws, req) => {
    const roomCode = resolveRoomCodeFromRequest(req);
    const room = getOrCreateRoom(rooms, roomCode);

    if (room.players.size >= MAX_PLAYERS) {
      ws.send(JSON.stringify({ type: 'full', roomCode }));
      ws.close();
      return;
    }

    const player = addPlayer(room, ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'join') {
          if (typeof msg.name === 'string' && msg.name.trim()) {
            player.name = msg.name.trim().slice(0, 16);
          }
          return;
        }

        if (msg.type === 'input') {
          const { up, down, left, right, bomb, direction: explicitDirection } = msg;
          let direction = null;
          if (explicitDirection === 'left' || explicitDirection === 'right' || explicitDirection === 'up' || explicitDirection === 'down') {
            direction = explicitDirection;
          } else if (left) direction = 'left';
          else if (right) direction = 'right';
          else if (up) direction = 'up';
          else if (down) direction = 'down';

          player.input.direction = direction;
          player.input.bomb = !!bomb;
          player.input.heldDirections = {
            up: !!up,
            down: !!down,
            left: !!left,
            right: !!right,
          };
        }
      } catch {
        // Ignore malformed client messages.
      }
    });

    ws.on('close', () => {
      removePlayer(rooms, room, player.id);
    });
  });

  const interval = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      tickRoom(room, now);
    }
  }, Math.floor(1000 / TICK_RATE));

  return {
    rooms,
    getHealthSnapshot() {
      const roomSummaries = Array.from(rooms.values())
        .map((room) => ({
          roomCode: room.roomCode,
          playerCount: room.players.size,
          phase: room.round.phase,
          roundNumber: room.round.roundNumber,
        }))
        .sort((left, right) => left.roomCode.localeCompare(right.roomCode));

      return {
        activeRooms: roomSummaries.length,
        activePlayers: roomSummaries.reduce((sum, room) => sum + room.playerCount, 0),
        rooms: roomSummaries,
      };
    },
    close() {
      clearInterval(interval);
    },
  };
}
