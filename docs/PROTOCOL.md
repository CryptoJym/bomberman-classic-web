# Bomberman Online - WebSocket Protocol Specification

## Overview

This document defines the WebSocket message protocol between the Bomberman game client and server. All messages are JSON-encoded and transmitted over WebSocket connections.

## Connection

### Endpoint

```
Production: wss://bomberman-server.railway.app
Development: ws://localhost:8080
```

### Connection Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Clerk JWT for authentication |
| `version` | string | No | Client version for compatibility |

### Connection URL Example

```
wss://bomberman-server.railway.app?token=eyJ...&version=1.0.0
```

---

## Message Format

### Base Message Structure

```typescript
interface BaseMessage {
  type: string;
  timestamp?: number;  // Client-side timestamp for latency calculation
}
```

---

## Client -> Server Messages

### 1. `join` - Join a Room

Request to join or create a game room.

```typescript
interface JoinMessage {
  type: 'join';
  roomCode?: string;     // Optional: join existing room
  createPrivate?: boolean; // Create private room
  settings?: RoomSettings; // Only if creating
}

interface RoomSettings {
  maxPlayers: number;      // 2-16, default: 4
  roundTime: number;       // seconds, default: 180
  roundsToWin: number;     // default: 3
  mapId?: string;          // custom map ID
  allowSpectators: boolean;
}
```

**Example:**
```json
{
  "type": "join",
  "roomCode": "ABCD",
  "timestamp": 1699999999999
}
```

---

### 2. `move` - Movement Input

Send player movement direction with sequence number for reconciliation.

```typescript
interface MoveMessage {
  type: 'move';
  direction: 'up' | 'down' | 'left' | 'right';
  seq: number;  // Input sequence number
}
```

**Example:**
```json
{
  "type": "move",
  "direction": "right",
  "seq": 42
}
```

**Rate Limit:** Maximum 60 messages/second

---

### 3. `stop` - Stop Movement

Signal that player has stopped moving.

```typescript
interface StopMessage {
  type: 'stop';
  seq: number;
}
```

**Example:**
```json
{
  "type": "stop",
  "seq": 43
}
```

---

### 4. `bomb` - Place Bomb

Request to place a bomb at current position.

```typescript
interface BombMessage {
  type: 'bomb';
  seq: number;
}
```

**Example:**
```json
{
  "type": "bomb",
  "seq": 44
}
```

**Validation:**
- Player must be alive
- Player must not exceed max bomb count
- No bomb already at position
- Cooldown: 100ms between bomb placements

---

### 5. `chat` - Send Chat Message

Send a text chat message to the room.

```typescript
interface ChatMessage {
  type: 'chat';
  content: string;   // Max 200 characters
  channel: 'room' | 'team' | 'spectator';
}
```

**Example:**
```json
{
  "type": "chat",
  "content": "Good luck!",
  "channel": "room"
}
```

**Rate Limit:** Maximum 5 messages/second
**Validation:** Profanity filter applied server-side

---

### 6. `ready` - Ready to Start

Signal that player is ready to begin the game.

```typescript
interface ReadyMessage {
  type: 'ready';
  ready: boolean;
}
```

**Example:**
```json
{
  "type": "ready",
  "ready": true
}
```

---

### 7. `spectate` - Join as Spectator

Join a room as a spectator (view-only).

```typescript
interface SpectateMessage {
  type: 'spectate';
  roomCode: string;
  targetPlayerId?: string;  // Optional: focus on specific player
}
```

**Example:**
```json
{
  "type": "spectate",
  "roomCode": "ABCD"
}
```

---

### 8. `ping` - Latency Measurement

Ping message for round-trip latency measurement.

```typescript
interface PingMessage {
  type: 'ping';
  timestamp: number;  // Client timestamp in ms
}
```

**Example:**
```json
{
  "type": "ping",
  "timestamp": 1699999999999
}
```

---

### 9. `settings` - Update Room Settings (Host Only)

Update room settings before game starts.

```typescript
interface SettingsMessage {
  type: 'settings';
  settings: Partial<RoomSettings>;
}
```

---

### 10. `kick` - Kick Player (Host Only)

Kick a player from the room.

```typescript
interface KickMessage {
  type: 'kick';
  playerId: string;
  reason?: string;
}
```

---

### 11. `leave` - Leave Room

Voluntarily leave the current room.

```typescript
interface LeaveMessage {
  type: 'leave';
}
```

---

### 12. `input` - Combined Input (Legacy/Optimization)

Combined input message for reduced message frequency.

```typescript
interface InputMessage {
  type: 'input';
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  bomb: boolean;
  seq: number;
}
```

---

## Server -> Client Messages

### 1. `state` - Full Game State

Complete game state broadcast. Sent every tick (50ms) or at reduced frequency for optimization.

```typescript
interface StateMessage {
  type: 'state';
  tick: number;              // Server tick number
  serverTime: number;        // Server timestamp
  lastProcessedInput: number; // Last processed input seq for reconciliation

  phase: 'waiting' | 'countdown' | 'playing' | 'intermission' | 'finished';

  players: PlayerState[];
  bombs: BombState[];
  powerups: PowerupState[];
  explosions: ExplosionState[];

  // Only sent periodically or on change
  board?: BoardState;

  round: RoundState;
}

interface PlayerState {
  id: string;
  name: string;
  color: string;
  x: number;          // Grid position
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isAlive: boolean;
  stats: {
    kills: number;
    deaths: number;
    wins: number;
  };
  // Powerup effects (visible to others)
  maxBombs: number;
  bombRadius: number;
  speed: number;
  hasShield: boolean;
}

interface BombState {
  id: string;
  x: number;
  y: number;
  ownerId: string;
  radius: number;
  fuseTimeMs: number;  // Time until explosion
}

interface PowerupState {
  id: string;
  x: number;
  y: number;
  type: 'bomb_up' | 'fire_up' | 'speed_up' | 'kick' | 'punch' | 'shield' | 'skull';
}

interface ExplosionState {
  id: string;
  cells: Array<{x: number; y: number}>;
  remainingMs: number;
}

interface BoardState {
  width: number;
  height: number;
  tiles: number[][];  // 0=empty, 1=solid, 2=soft
}

interface RoundState {
  number: number;
  phase: string;
  countdownMs?: number;
  winnerId?: string;
  scores: Record<string, number>;
}
```

**Example:**
```json
{
  "type": "state",
  "tick": 1234,
  "serverTime": 1699999999999,
  "lastProcessedInput": 42,
  "phase": "playing",
  "players": [
    {
      "id": "p1",
      "name": "Player1",
      "color": "#e6194b",
      "x": 1,
      "y": 1,
      "direction": "down",
      "isAlive": true,
      "stats": {"kills": 2, "deaths": 1, "wins": 0},
      "maxBombs": 2,
      "bombRadius": 3,
      "speed": 1.0,
      "hasShield": false
    }
  ],
  "bombs": [
    {
      "id": "b1",
      "x": 3,
      "y": 5,
      "ownerId": "p1",
      "radius": 3,
      "fuseTimeMs": 1500
    }
  ],
  "powerups": [],
  "explosions": [],
  "round": {
    "number": 1,
    "phase": "playing",
    "scores": {"p1": 0, "p2": 0}
  }
}
```

---

### 2. `delta` - State Delta (Optimization)

Partial state update containing only changes since last state.

```typescript
interface DeltaMessage {
  type: 'delta';
  tick: number;
  baseTick: number;  // Reference tick this delta applies to

  players?: Partial<Record<string, Partial<PlayerState> | null>>;  // null = removed
  bombs?: {
    added?: BombState[];
    removed?: string[];
  };
  powerups?: {
    added?: PowerupState[];
    removed?: string[];
  };
  explosions?: ExplosionState[];
  tiles?: Array<{x: number; y: number; type: number}>;
}
```

---

### 3. `joined` - Room Join Confirmation

Sent when successfully joining a room.

```typescript
interface JoinedMessage {
  type: 'joined';
  playerId: string;
  roomCode: string;
  isHost: boolean;
  roomState: {
    settings: RoomSettings;
    players: PlayerInfo[];
    spectators: SpectatorInfo[];
    phase: string;
  };
  reconnectToken?: string;  // For reconnection
}
```

---

### 4. `player_joined` - Player Join Notification

Broadcast when a new player joins the room.

```typescript
interface PlayerJoinedMessage {
  type: 'player_joined';
  player: PlayerInfo;
}

interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  eloRating: number;
  isReady: boolean;
}
```

---

### 5. `player_left` - Player Leave Notification

Broadcast when a player leaves or disconnects.

```typescript
interface PlayerLeftMessage {
  type: 'player_left';
  playerId: string;
  reason: 'left' | 'kicked' | 'disconnected' | 'timeout';
  newHostId?: string;  // If host changed
}
```

---

### 6. `game_start` - Game Starting

Broadcast when the game is about to start.

```typescript
interface GameStartMessage {
  type: 'game_start';
  countdownMs: number;  // Countdown duration in ms
  map: BoardState;
  spawnPositions: Record<string, {x: number; y: number}>;
}
```

---

### 7. `game_end` - Game Finished

Broadcast when the game/round ends.

```typescript
interface GameEndMessage {
  type: 'game_end';
  winnerId: string | null;  // null if draw
  winnerName: string | null;
  reason: 'elimination' | 'timeout' | 'forfeit';
  finalScores: Record<string, number>;
  stats: GameStats;
  eloChanges: Record<string, number>;  // ELO rating changes
  replayId?: string;  // Replay available
}

interface GameStats {
  duration: number;
  totalKills: number;
  bombsPlaced: number;
  powerupsCollected: number;
  mvpId: string;
  playerStats: Record<string, PlayerGameStats>;
}
```

---

### 8. `explosion` - Explosion Event

Immediate explosion notification (for sound/effects timing).

```typescript
interface ExplosionMessage {
  type: 'explosion';
  bombId: string;
  cells: Array<{x: number; y: number}>;
  chainCount: number;  // For chain explosion effects
}
```

---

### 9. `death` - Player Death

Player death notification with attribution.

```typescript
interface DeathMessage {
  type: 'death';
  playerId: string;
  playerName: string;
  killerId: string | null;  // null if self-kill or environment
  killerName: string | null;
  position: {x: number; y: number};
  placement: number;  // e.g., "4th place"
}
```

---

### 10. `powerup_spawn` - Powerup Spawned

Notification when a powerup appears.

```typescript
interface PowerupSpawnMessage {
  type: 'powerup_spawn';
  powerup: PowerupState;
}
```

---

### 11. `powerup_collect` - Powerup Collected

Notification when a powerup is collected.

```typescript
interface PowerupCollectMessage {
  type: 'powerup_collect';
  powerupId: string;
  playerId: string;
  playerName: string;
  type: string;
}
```

---

### 12. `chat` - Chat Message Broadcast

Chat message from another player.

```typescript
interface ChatBroadcast {
  type: 'chat';
  senderId: string;
  senderName: string;
  content: string;
  channel: 'room' | 'team' | 'spectator' | 'system';
  timestamp: number;
}
```

---

### 13. `pong` - Latency Response

Response to ping message.

```typescript
interface PongMessage {
  type: 'pong';
  clientTimestamp: number;  // Echo of client timestamp
  serverTimestamp: number;  // Server time for clock sync
}
```

---

### 14. `error` - Error Message

Error notification from server.

```typescript
interface ErrorMessage {
  type: 'error';
  code: number;
  message: string;
  details?: any;
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1001 | `AUTH_FAILED` | Invalid or expired JWT token |
| 1002 | `AUTH_REQUIRED` | Action requires authentication |
| 1003 | `CONNECTION_LIMIT` | Too many connections from IP |
| 2001 | `ROOM_NOT_FOUND` | Room code does not exist |
| 2002 | `ROOM_FULL` | Room has reached max players |
| 2003 | `ROOM_IN_PROGRESS` | Cannot join game in progress |
| 2004 | `ROOM_CLOSED` | Room has been closed |
| 2005 | `NOT_HOST` | Action requires host privileges |
| 3001 | `INVALID_ACTION` | Action not allowed in current state |
| 3002 | `RATE_LIMITED` | Too many actions, slow down |
| 3003 | `INVALID_INPUT` | Malformed or invalid input |
| 4001 | `SERVER_FULL` | Server at capacity |
| 4002 | `SERVER_ERROR` | Internal server error |
| 4003 | `MAINTENANCE` | Server under maintenance |

---

### 15. `settings_updated` - Room Settings Changed

Notification when host changes room settings.

```typescript
interface SettingsUpdatedMessage {
  type: 'settings_updated';
  settings: RoomSettings;
}
```

---

### 16. `ready_state` - Ready State Update

Broadcast when a player's ready state changes.

```typescript
interface ReadyStateMessage {
  type: 'ready_state';
  playerId: string;
  ready: boolean;
  allReady: boolean;  // True if all players ready
}
```

---

### 17. `countdown` - Countdown Tick

Countdown tick during game start.

```typescript
interface CountdownMessage {
  type: 'countdown';
  secondsRemaining: number;  // 3, 2, 1, 0
}
```

---

### 18. `spectator_joined` / `spectator_left`

Spectator notifications.

```typescript
interface SpectatorMessage {
  type: 'spectator_joined' | 'spectator_left';
  spectator: {
    id: string;
    name: string;
  };
  totalSpectators: number;
}
```

---

### 19. `achievement_unlocked` - Achievement Notification

Real-time achievement unlock notification.

```typescript
interface AchievementUnlockedMessage {
  type: 'achievement_unlocked';
  playerId: string;
  playerName: string;
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
  };
}
```

---

## Message Flow Diagrams

### Game Start Sequence

```
Client A        Client B        Server
   │               │               │
   │──── ready ───────────────────►│
   │               │               │
   │               │◄── ready ─────│
   │               │               │
   │◄─ ready_state {allReady:false}│
   │               │               │
   │               │──── ready ───►│
   │               │               │
   │◄─ ready_state {allReady:true}─│
   │               │               │
   │◄───── game_start {countdown} ─│
   │               │               │
   │◄───── countdown {3} ──────────│
   │◄───── countdown {2} ──────────│
   │◄───── countdown {1} ──────────│
   │◄───── countdown {0} ──────────│
   │               │               │
   │◄───── state {phase: playing} ─│
```

### Input Processing

```
Client                              Server
   │                                   │
   │─── move {dir: 'right', seq: 1} ──►│
   │                                   │
   │   [Client: Predict movement]      │
   │                                   │
   │◄── state {lastProcessedInput: 1} ─│
   │                                   │
   │   [Client: Reconcile if needed]   │
```

---

## Binary Protocol (Future Optimization)

For high-performance scenarios, a binary protocol using MessagePack or Protocol Buffers may be implemented:

```typescript
// Message header (4 bytes)
// [2 bytes: message type][2 bytes: payload length]

// Payload follows immediately after header
```

---

## Versioning

Protocol version is negotiated during connection:

```
Client connects with ?version=1.2.0
Server responds with supported version in joined message
```

### Version Compatibility

| Client Version | Server Version | Compatible |
|----------------|----------------|------------|
| 1.x.x | 1.x.x | Yes |
| 1.x.x | 2.x.x | No (upgrade required) |
| 2.x.x | 2.x.x | Yes |

---

## Rate Limits

| Message Type | Limit | Window |
|--------------|-------|--------|
| `move` | 60/s | per second |
| `bomb` | 10/s | per second |
| `chat` | 5/s | per second |
| `ping` | 2/s | per second |
| All others | 30/s | per second |

Exceeding limits results in `error` message with code `3002`.
