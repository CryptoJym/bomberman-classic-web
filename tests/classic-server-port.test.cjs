const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

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

test('classic server honors GAME_SERVER_PORT for local launch', async (t) => {
  const port = 18091 + Math.floor(Math.random() * 1000);
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

  const response = await waitForHttp(`http://127.0.0.1:${port}/`, child);
  const html = await response.text();

  assert.match(html, /Bomberman \(up to 16 players\)/);
  assert.match(output, new RegExp(`localhost:${port}`));
});
