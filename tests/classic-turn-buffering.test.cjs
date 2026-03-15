const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');

const REPO_ROOT = '/Users/jamesbrady/Bomberman';
const DIRECTIONS = {
  up: { dx: 0, dy: -1, orthogonal: ['left', 'right'] },
  down: { dx: 0, dy: 1, orthogonal: ['left', 'right'] },
  left: { dx: -1, dy: 0, orthogonal: ['up', 'down'] },
  right: { dx: 1, dy: 0, orthogonal: ['up', 'down'] },
};

function waitForServerLog(outputRef, matcher, child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (child.exitCode !== null) {
        reject(new Error(`Server exited early with code ${child.exitCode}`));
        return;
      }
      if (matcher.test(outputRef.current)) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for server log: ${matcher}`));
        return;
      }
      setTimeout(check, 50);
    };

    check();
  });
}

function waitForSocketOpen(socket, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for socket open')), timeoutMs);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function createTracker(socket) {
  let latestState = null;
  let youId = null;
  const waiters = [];
  const identityWaiters = [];

  const flush = () => {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (latestState && waiter.predicate(latestState)) {
        clearTimeout(waiter.timer);
        waiters.splice(index, 1);
        waiter.resolve(latestState);
      }
    }
  };

  socket.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'you') {
      youId = msg.id;
      while (identityWaiters.length > 0) {
        identityWaiters.pop()(youId);
      }
      return;
    }

    if (msg.type === 'state') {
      latestState = msg;
      flush();
    }
  });

  socket.on('error', (error) => {
    while (waiters.length > 0) {
      const waiter = waiters.pop();
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  });

  return {
    getLatestState: () => latestState,
    waitForIdentity(timeoutMs = 5000) {
      if (youId) return Promise.resolve(youId);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for identity message')), timeoutMs);
        identityWaiters.push((id) => {
          clearTimeout(timer);
          resolve(id);
        });
      });
    },
    waitForState(predicate, timeoutMs = 5000) {
      if (latestState && predicate(latestState)) {
        return Promise.resolve(latestState);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((entry) => entry.timer === timer);
          if (index !== -1) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for matching state'));
        }, timeoutMs);
        waiters.push({ predicate, resolve, reject, timer });
      });
    },
  };
}

function applyDirection(position, direction) {
  const delta = DIRECTIONS[direction];
  return { x: position.x + delta.dx, y: position.y + delta.dy };
}

function isWalkable(board, x, y) {
  return board.tiles[y]?.[x] === 0;
}

function keyFor(position) {
  return `${position.x},${position.y}`;
}

function reconstructPath(parents, endKey) {
  const path = [];
  let cursor = endKey;
  while (parents.get(cursor)?.from) {
    const step = parents.get(cursor);
    path.push({ x: step.position.x, y: step.position.y, direction: step.direction });
    cursor = step.from;
  }
  return path.reverse();
}

function findBufferedTurnScenario(board, start) {
  const queue = [start];
  const parents = new Map([[keyFor(start), { from: null, direction: null, position: start }]]);
  const visited = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = applyDirection(current, direction);
      const nextKey = keyFor(next);
      if (!isWalkable(board, next.x, next.y) || parents.has(nextKey)) {
        continue;
      }
      parents.set(nextKey, { from: keyFor(current), direction, position: next });
      visited.push(next);
      queue.push(next);
    }
  }

  for (const position of visited) {
    for (const continueDirection of Object.keys(DIRECTIONS)) {
      const ahead = applyDirection(position, continueDirection);
      if (!isWalkable(board, ahead.x, ahead.y)) {
        continue;
      }

      for (const turnDirection of DIRECTIONS[continueDirection].orthogonal) {
        const turnTarget = applyDirection(position, turnDirection);
        if (isWalkable(board, turnTarget.x, turnTarget.y)) {
          continue;
        }

        return {
          path: reconstructPath(parents, keyFor(position)),
          position,
          continueDirection,
          turnDirection,
          ahead,
        };
      }
    }
  }

  return null;
}

function getPlayer(state, playerId) {
  return state.players.find((player) => player.id === playerId);
}

function emptyInput() {
  return { type: 'input', direction: null, up: false, down: false, left: false, right: false, bomb: false };
}

async function moveAlongPath(socket, tracker, playerId, path) {
  for (const step of path) {
    socket.send(JSON.stringify({
      type: 'input',
      direction: step.direction,
      up: step.direction === 'up',
      down: step.direction === 'down',
      left: step.direction === 'left',
      right: step.direction === 'right',
      bomb: false,
    }));

    await tracker.waitForState((state) => {
      const player = getPlayer(state, playerId);
      return player && player.x === step.x && player.y === step.y;
    }, 1500);

    socket.send(JSON.stringify(emptyInput()));
  }
}

test('classic server buffers turn intent so early turns keep current movement until the opening', async (t) => {
  const port = 8095;
  const env = { ...process.env, GAME_SERVER_PORT: String(port) };
  delete env.PORT;

  const outputRef = { current: '' };
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    outputRef.current += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    outputRef.current += chunk.toString();
  });

  t.after(() => {
    child.kill('SIGTERM');
  });

  await waitForServerLog(outputRef, new RegExp(`localhost:${port}`), child);

  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const tracker = createTracker(socket);
  t.after(() => socket.close());

  await waitForSocketOpen(socket);
  const playerId = await tracker.waitForIdentity();

  socket.send(JSON.stringify({ type: 'join', name: 'Turn Buffer Tester' }));
  const initialState = await tracker.waitForState((state) => !!getPlayer(state, playerId));
  const player = getPlayer(initialState, playerId);
  const scenario = findBufferedTurnScenario(initialState.board, { x: player.x, y: player.y });

  assert.ok(scenario, 'expected to find a reachable buffered-turn scenario on the current board');

  await moveAlongPath(socket, tracker, playerId, scenario.path);

  socket.send(JSON.stringify({
    type: 'input',
    direction: scenario.turnDirection,
    up: scenario.turnDirection === 'up' || scenario.continueDirection === 'up',
    down: scenario.turnDirection === 'down' || scenario.continueDirection === 'down',
    left: scenario.turnDirection === 'left' || scenario.continueDirection === 'left',
    right: scenario.turnDirection === 'right' || scenario.continueDirection === 'right',
    bomb: false,
  }));

  await tracker.waitForState((state) => {
    const currentPlayer = getPlayer(state, playerId);
    return currentPlayer && currentPlayer.x === scenario.ahead.x && currentPlayer.y === scenario.ahead.y;
  }, 500);
});
