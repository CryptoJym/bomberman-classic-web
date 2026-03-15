const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');

const REPO_ROOT = '/Users/jamesbrady/Bomberman';

async function waitForHttp(url, child, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastError = new Error('Server did not start');

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`Unexpected HTTP status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError;
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

test('classic server exposes a cloud-friendly health endpoint with room stats', async (t) => {
  const port = 18500 + Math.floor(Math.random() * 500);
  const env = { ...process.env, GAME_SERVER_PORT: String(port) };
  delete env.PORT;

  let output = '';
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  t.after(() => {
    child.kill('SIGTERM');
  });

  const initialResponse = await waitForHttp(`http://127.0.0.1:${port}/health`, child);
  const initialHealth = await initialResponse.json();

  assert.equal(initialHealth.ok, true);
  assert.equal(initialHealth.activeRooms, 0);
  assert.equal(initialHealth.activePlayers, 0);
  assert.match(output, new RegExp(`localhost:${port}`));

  const socket = new WebSocket(`ws://127.0.0.1:${port}/?room=alpha42`);
  t.after(() => socket.close());

  await waitForSocketOpen(socket);
  socket.send(JSON.stringify({ type: 'join', name: 'Health Probe' }));
  await new Promise((resolve) => setTimeout(resolve, 150));

  const populatedResponse = await waitForHttp(`http://127.0.0.1:${port}/health`, child);
  const populatedHealth = await populatedResponse.json();

  assert.equal(populatedHealth.ok, true);
  assert.equal(populatedHealth.activeRooms, 1);
  assert.equal(populatedHealth.activePlayers, 1);
  assert.deepEqual(populatedHealth.rooms, [
    {
      roomCode: 'ALPHA42',
      playerCount: 1,
      phase: 'playing',
      roundNumber: 1,
    },
  ]);
  assert.equal(typeof populatedHealth.uptimeMs, 'number');
  assert.equal(typeof populatedHealth.tickRateHz, 'number');
});
