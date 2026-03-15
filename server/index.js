import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { attachClassicRoomServer, CLASSIC_TICK_RATE_HZ } from './classic-room-server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

const fileEnv = {
  ...parseEnvFile(path.join(repoRoot, '.env')),
  ...parseEnvFile(path.join(repoRoot, '.env.local')),
};

for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT || process.env.GAME_SERVER_PORT || 8080);

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const runtime = attachClassicRoomServer(wss);
const startedAt = Date.now();

app.get('/health', (_req, res) => {
  const snapshot = runtime.getHealthSnapshot();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    uptimeMs: Date.now() - startedAt,
    tickRateHz: CLASSIC_TICK_RATE_HZ,
    ...snapshot,
  });
});

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.use(express.static(path.join(repoRoot, 'public')));

httpServer.listen(PORT, () => {
  console.log(`Bomberman server running: http://localhost:${PORT}`);
});

const shutdown = () => {
  runtime.close();
  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
