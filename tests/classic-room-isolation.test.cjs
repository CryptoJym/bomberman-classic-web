const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');

const REPO_ROOT = '/Users/jamesbrady/Bomberman';

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

async function connectPlayer(port, roomCode, name) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/?room=${roomCode}`);
  const tracker = createTracker(socket);
  await waitForSocketOpen(socket);
  await tracker.waitForIdentity();
  socket.send(JSON.stringify({ type: 'join', name }));
  return { socket, tracker };
}

test('classic server isolates players by room code', async (t) => {
  const port = 8097;
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

  const alphaOne = await connectPlayer(port, 'alpha42', 'Alpha One');
  const alphaTwo = await connectPlayer(port, 'alpha42', 'Alpha Two');
  const bravoOne = await connectPlayer(port, 'bravo77', 'Bravo One');

  t.after(() => alphaOne.socket.close());
  t.after(() => alphaTwo.socket.close());
  t.after(() => bravoOne.socket.close());

  const alphaState = await alphaOne.tracker.waitForState((state) => {
    const names = (state.players || []).map((player) => player.name).sort();
    return state.roomCode === 'ALPHA42'
      && names.length === 2
      && names.includes('Alpha One')
      && names.includes('Alpha Two')
      && !names.includes('Bravo One');
  });

  const bravoState = await bravoOne.tracker.waitForState((state) => {
    const names = (state.players || []).map((player) => player.name);
    return state.roomCode === 'BRAVO77'
      && names.length === 1
      && names[0] === 'Bravo One';
  });

  assert.equal(alphaState.roomCode, 'ALPHA42');
  assert.equal(bravoState.roomCode, 'BRAVO77');
});
