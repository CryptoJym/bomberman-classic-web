const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');

const REPO_ROOT = '/Users/jamesbrady/Bomberman';

async function waitForServerLog(outputRef, matcher, child, timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    if (matcher.test(outputRef.current)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timed out waiting for server log: ${matcher}`);
}

async function waitForPlayerX(socket, playerId, targetX, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for player x=${targetX}`)), timeoutMs);

    socket.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type !== 'state') return;
      const player = msg.players.find((entry) => entry.id === playerId);
      if (player && player.x >= targetX) {
        clearTimeout(timer);
        resolve(Date.now());
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

test('classic movement cadence keeps held-direction steps under 180ms', async (t) => {
  const port = 8094;
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
  t.after(() => socket.close());

  const youId = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for identity message')), 5000);
    socket.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'you') {
        clearTimeout(timer);
        resolve(msg.id);
      }
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  socket.send(JSON.stringify({ type: 'join', name: 'Cadence Tester' }));
  socket.send(JSON.stringify({ type: 'input', direction: 'right', right: true, bomb: false }));

  const firstStepAt = await waitForPlayerX(socket, youId, 2);
  const secondStepAt = await waitForPlayerX(socket, youId, 3);
  const secondStepDeltaMs = secondStepAt - firstStepAt;

  assert.ok(
    secondStepDeltaMs < 180,
    `held-direction second step should stay under 180ms, got ${secondStepDeltaMs}ms`
  );
});
