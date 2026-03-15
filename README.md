# Bomberman Classic Web

This repo currently has one version that is genuinely playable today: the classic browser Bomberman served by `server/index.js` and `public/`.

There is also an unfinished Next.js shell in the repo. Treat that as future-facing work. If you want to actually play with friends right now, use the classic server.

## What works now

- Room-based multiplayer on the web
- Shareable room links
- Authoritative server movement and bomb logic
- iPad-friendly controls with a virtual stick and large bomb button
- Health endpoints for cloud platforms: `/health` and `/healthz`

## Local play on macOS

```bash
npm install
npm run play:classic
```

That command:

- starts the classic game server,
- opens the browser automatically,
- keeps the process running until you stop it.

If you want to run the server without opening the browser:

```bash
npm run server
```

By default the server uses `GAME_SERVER_PORT` from `.env.local`, then `PORT`, then `8080`.

## How multiplayer works

Open the game, create or join a room, then share the room link.

Important detail:

- If you open the game at `http://localhost:8080`, the copied room link will also point to `localhost`, which only works on your own machine.
- If you want another person to join, open the game from your Mac's LAN IP or a public cloud URL first, then copy the room link.

Examples:

- Local-only testing: `http://localhost:8080/?room=ABCD1234`
- Same Wi-Fi testing: `http://192.168.1.20:8080/?room=ABCD1234`
- Public hosted game: `https://your-game.onrender.com/?room=ABCD1234`

## Cloud hosting on Render

This repo now includes a `render.yaml` blueprint for the playable classic server.

### One-time setup

1. Push this repo to GitHub.
2. In Render, create a new Blueprint service from the repo.
3. Let Render use the included `render.yaml`.
4. Wait for the deploy to finish.
5. Open the public URL Render gives you.

### What Render will run

- build: `npm ci --omit=dev`
- start: `npm run server`
- health check: `/health`

Because the classic server serves both the static client and the WebSocket game from one Node process, you only need one web service for the current playable version.

If you keep the default free Render plan, expect a cold-start delay after long idle periods.

## Docker hosting

A simple production Dockerfile is included.

Build and run locally:

```bash
docker build -t bomberman-classic .
docker run --rm -p 8080:8080 bomberman-classic
```

Then open:

```text
http://localhost:8080
```

## Health endpoints

These are useful for cloud platforms and basic monitoring.

- `GET /healthz`
  - returns plain `ok`
- `GET /health`
  - returns JSON with uptime, tick rate, active rooms, active players, and per-room counts

Example response shape:

```json
{
  "ok": true,
  "uptimeMs": 12345,
  "tickRateHz": 20,
  "activeRooms": 1,
  "activePlayers": 2,
  "rooms": [
    {
      "roomCode": "ABCD1234",
      "playerCount": 2,
      "phase": "playing",
      "roundNumber": 1
    }
  ]
}
```

## Main files

- `server/index.js`: HTTP entrypoint, static file serving, WebSocket boot, health routes
- `server/classic-room-server.mjs`: room system, movement, bombs, rounds, authoritative simulation
- `public/client.js`: browser client, input, rendering, multiplayer room UI
- `public/client-input.mjs`: keyboard and touch input resolution
- `public/client-state.mjs`: visual interpolation and HUD state

## Verification

Run the classic suite with:

```bash
npm run test:classic
```

That suite covers:

- server port selection
- client smoothing and input resolution
- room code generation and room isolation
- movement cadence and buffered turning
- cloud health endpoint behavior
- cloud deploy manifest wiring
