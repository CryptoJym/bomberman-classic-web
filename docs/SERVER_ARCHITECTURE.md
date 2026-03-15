# Bomberman Online - Server Architecture

## Overview

The Bomberman game server is a **Node.js WebSocket server** designed for real-time multiplayer gameplay. It implements a **server-authoritative architecture** to ensure fair play and prevent cheating while maintaining responsive gameplay through client-side prediction.

## Architecture Diagram

```
                                    ┌─────────────────────────────────┐
                                    │         Load Balancer           │
                                    │      (Future: HAProxy/AWS)      │
                                    └───────────────┬─────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
           ┌────────▼────────┐             ┌───────▼────────┐             ┌────────▼────────┐
           │  Game Server 1  │             │  Game Server 2  │             │  Game Server N  │
           │  (Primary)      │             │  (Replica)      │             │  (Replica)      │
           └────────┬────────┘             └────────┬────────┘             └────────┬────────┘
                    │                               │                               │
                    └───────────────────────────────┼───────────────────────────────┘
                                                    │
                                    ┌───────────────▼───────────────┐
                                    │     Redis Pub/Sub Cluster     │
                                    │  (Cross-instance messaging)   │
                                    └───────────────┬───────────────┘
                                                    │
                                    ┌───────────────▼───────────────┐
                                    │    Supabase (PostgreSQL)      │
                                    │  - User profiles              │
                                    │  - Game history               │
                                    │  - Replays                    │
                                    │  - Leaderboards               │
                                    └───────────────────────────────┘
```

## Core Components

### 1. WebSocket Server

```
┌────────────────────────────────────────────────────────────────┐
│                    WebSocket Server                             │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Connection   │  │ Auth         │  │ Message              │  │
│  │ Manager      │  │ Middleware   │  │ Router               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │                    Room Manager                            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │ Room 1  │  │ Room 2  │  │ Room 3  │  │ Room N  │      │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

#### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `TICK_RATE` | 20 Hz | Server game loop frequency (50ms intervals) |
| `MAX_PLAYERS_PER_ROOM` | 16 | Maximum players in a single room |
| `MAX_ROOMS_PER_SERVER` | 100 | Room limit per server instance |
| `SOCKET_TIMEOUT` | 30s | Connection timeout |
| `HEARTBEAT_INTERVAL` | 5s | Ping/pong interval |

### 2. Room Structure

Each room maintains isolated game state:

```
┌──────────────────────────────────────────────────────────────┐
│                           Room                                │
├──────────────────────────────────────────────────────────────┤
│  id: string                    roomCode: string               │
│  host: Player                  createdAt: Date                │
│  settings: RoomSettings        status: RoomStatus             │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐   ┌─────────────────────────────┐   │
│  │      Players        │   │       Spectators            │   │
│  │  Map<id, Player>    │   │    Map<id, Spectator>       │   │
│  └─────────────────────┘   └─────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    GameState                             │ │
│  │  - tick: number                                          │ │
│  │  - phase: GamePhase                                      │ │
│  │  - map: GameMap                                          │ │
│  │  - players: Map<id, PlayerState>                         │ │
│  │  - bombs: Map<id, Bomb>                                  │ │
│  │  - powerups: Map<id, Powerup>                            │ │
│  │  - explosions: Explosion[]                               │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐   ┌────────────────────────────┐    │
│  │   ReplayRecorder   │   │      RoundManager          │    │
│  └────────────────────┘   └────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 3. Game State Management

#### State Hierarchy

```
GameState
├── tick: number                    # Current simulation tick
├── phase: GamePhase                # waiting | countdown | playing | intermission | finished
├── map: GameMap
│   ├── width: 15
│   ├── height: 13
│   ├── tiles: Tile[][]             # 0=empty, 1=solid, 2=soft
│   └── spawnPoints: Position[]
├── players: Map<string, PlayerState>
│   └── PlayerState
│       ├── position: {x, y}
│       ├── direction: Direction
│       ├── isAlive: boolean
│       ├── stats: PlayerStats
│       └── powerups: PowerupEffects
├── bombs: Map<string, Bomb>
│   └── Bomb
│       ├── position: {x, y}
│       ├── ownerId: string
│       ├── radius: number
│       ├── fuseTime: number
│       └── plantedAt: number
├── powerups: Map<string, Powerup>
│   └── Powerup
│       ├── position: {x, y}
│       └── type: PowerupType
└── explosions: Explosion[]
    └── Explosion
        ├── cells: Position[]
        └── expiresAt: number
```

### 4. Tick-Based Game Loop

The server runs a fixed-timestep game loop at **20 Hz (50ms per tick)**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Server Tick Loop                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   1. Process Input Queue      │ ◄── Buffered client inputs
              │   (Movement, Bombs, Actions)  │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   2. Update Physics           │
              │   - Player movement           │
              │   - Collision detection       │
              │   - Bomb timers               │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   3. Process Game Events      │
              │   - Explosions                │
              │   - Deaths                    │
              │   - Powerup collection        │
              │   - Win conditions            │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   4. Record Replay Frame      │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   5. Broadcast State          │
              │   (Full state or Delta)       │
              └───────────────────────────────┘
```

#### Tick Budget

| Phase | Target Time | Max Time |
|-------|-------------|----------|
| Input Processing | 5ms | 10ms |
| Physics Update | 10ms | 15ms |
| Event Processing | 5ms | 10ms |
| State Broadcast | 5ms | 10ms |
| **Total** | **25ms** | **45ms** |
| **Headroom** | 25ms | 5ms |

## Client-Server Message Flow

### Connection Flow

```
Client                              Server
  │                                    │
  │─────── WebSocket Connect ─────────►│
  │                                    │
  │◄────── Connection Ack ─────────────│
  │                                    │
  │─────── Join {token, roomCode} ────►│
  │                                    │
  │         ┌──────────────────────────┤
  │         │ Validate Clerk JWT       │
  │         │ Find/Create Room         │
  │         │ Add Player to Room       │
  │         └──────────────────────────┤
  │                                    │
  │◄─── Joined {playerId, roomState} ──│
  │                                    │
  │◄──── PlayerJoined (to others) ─────│
  │                                    │
```

### Gameplay Flow

```
Client                              Server
  │                                    │
  │─────── Move {dir, seq} ───────────►│
  │                                    │
  │         ┌──────────────────────────┤
  │         │ Validate input           │
  │         │ Queue for next tick      │
  │         └──────────────────────────┤
  │                                    │
  │◄──────── State {tick, ...} ────────│ (every 50ms)
  │                                    │
  │─────── Bomb {seq} ────────────────►│
  │                                    │
  │◄─── State {bombs: [...]} ──────────│
  │                                    │
```

### State Synchronization Strategy

#### Full State vs Delta Updates

| Mode | When Used | Payload Size |
|------|-----------|--------------|
| **Full State** | On join, reconnect, every 1s | ~2-5 KB |
| **Delta State** | Regular ticks | ~100-500 bytes |

#### Delta Encoding Strategy

```typescript
// Delta contains only changed fields
interface StateDelta {
  tick: number;
  players?: Partial<Record<string, Partial<PlayerState>>>;
  bombs?: {
    added?: Bomb[];
    removed?: string[];  // ids
  };
  powerups?: {
    added?: Powerup[];
    removed?: string[];
  };
  explosions?: Explosion[];  // always sent in full (short-lived)
  tiles?: Array<{x: number; y: number; type: TileType}>;  // changed tiles
}
```

## Reconnection Handling

### Reconnection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Disconnects                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Server: Mark player as      │
              │   "disconnected" (not removed)│
              │   Start 30s reconnect timer   │
              └───────────────┬───────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│ Client Reconnects │                    │ Timer Expires     │
│ within 30s        │                    │ (No reconnect)    │
└─────────┬─────────┘                    └─────────┬─────────┘
          │                                        │
          ▼                                        ▼
┌───────────────────┐                    ┌───────────────────┐
│ Restore player    │                    │ Remove player     │
│ Send full state   │                    │ from game         │
│ Resume gameplay   │                    │ Notify others     │
└───────────────────┘                    └───────────────────┘
```

### Reconnection Token

```typescript
interface ReconnectToken {
  playerId: string;
  roomId: string;
  sessionId: string;
  expiresAt: number;
  signature: string;  // HMAC signature
}
```

## Scalability Architecture

### Single Server Capacity

| Metric | Target | Maximum |
|--------|--------|---------|
| Concurrent Rooms | 50 | 100 |
| Players per Room | 8 | 16 |
| Total Concurrent Players | 400 | 800 |
| Memory Usage | 512MB | 1GB |
| CPU Usage | 50% | 80% |

### Multi-Instance Architecture with Redis

```
┌────────────────────────────────────────────────────────────────┐
│                    Load Balancer (Sticky Sessions)              │
│                    (Hash by room code for affinity)             │
└────────────────────────────────┬───────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Game Server 1  │     │  Game Server 2  │     │  Game Server 3  │
│  Rooms: A,B,C   │     │  Rooms: D,E,F   │     │  Rooms: G,H,I   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Redis Cluster        │
                    │  ┌────────────────────┐ │
                    │  │ Pub/Sub Channels   │ │
                    │  │ - global:chat      │ │
                    │  │ - matchmaking      │ │
                    │  │ - server:status    │ │
                    │  └────────────────────┘ │
                    │  ┌────────────────────┐ │
                    │  │ Shared State       │ │
                    │  │ - room:* (info)    │ │
                    │  │ - player:* (loc)   │ │
                    │  │ - queue:*          │ │
                    │  └────────────────────┘ │
                    └─────────────────────────┘
```

### Redis Key Schema

```
# Room registry (which server owns which room)
room:{roomCode}:server -> "server-1"
room:{roomCode}:info -> JSON{playerCount, status, settings}

# Player location (for global operations)
player:{clerkId}:room -> "ABCD"
player:{clerkId}:server -> "server-1"

# Matchmaking queue
queue:ranked -> ZSET (score = timestamp, member = playerId)
queue:casual -> LIST

# Server health
server:{serverId}:health -> JSON{load, rooms, players, lastPing}
server:{serverId}:rooms -> SET{roomCodes}

# Global chat (lobby)
channel:global:messages -> LIST (capped at 100)
```

### Pub/Sub Channels

```typescript
// Matchmaking events
interface MatchmakingEvent {
  type: 'player_queued' | 'match_found' | 'player_left';
  payload: MatchmakingPayload;
}

// Server coordination
interface ServerEvent {
  type: 'server_online' | 'server_offline' | 'room_created' | 'room_closed';
  serverId: string;
  payload: ServerPayload;
}

// Cross-server messaging (friends, invites)
interface GlobalEvent {
  type: 'invite' | 'friend_request' | 'notification';
  targetPlayerId: string;
  payload: any;
}
```

## Error Handling

### Error Categories

| Code Range | Category | Example |
|------------|----------|---------|
| 1000-1999 | Connection | `1001: AUTH_FAILED` |
| 2000-2999 | Room | `2001: ROOM_FULL` |
| 3000-3999 | Game | `3001: INVALID_ACTION` |
| 4000-4999 | Server | `4001: SERVER_OVERLOADED` |

### Graceful Degradation

```
┌─────────────────────────────────────────────────────────────┐
│                    Health Check Cascade                      │
└─────────────────────────────────────────────────────────────┘

Normal Operation
      │
      ▼
┌─────────────────┐     ┌─────────────────┐
│ CPU > 80%       │────►│ Stop accepting  │
│ or Memory > 90% │     │ new rooms       │
└─────────────────┘     └─────────────────┘
      │
      ▼
┌─────────────────┐     ┌─────────────────┐
│ CPU > 95%       │────►│ Reduce tick     │
│ sustained 10s   │     │ rate to 15 Hz   │
└─────────────────┘     └─────────────────┘
      │
      ▼
┌─────────────────┐     ┌─────────────────┐
│ Critical state  │────►│ Graceful        │
│ sustained 30s   │     │ shutdown        │
└─────────────────┘     └─────────────────┘
```

## Monitoring & Observability

### Metrics Collection

```typescript
interface ServerMetrics {
  // Connection metrics
  activeConnections: number;
  connectionsPerSecond: number;
  disconnectsPerSecond: number;

  // Room metrics
  activeRooms: number;
  averagePlayersPerRoom: number;

  // Performance metrics
  tickDurationMs: Histogram;
  messageLatencyMs: Histogram;
  inputQueueDepth: number;

  // Game metrics
  gamesStarted: Counter;
  gamesCompleted: Counter;
  averageGameDurationMs: number;
}
```

### Logging Strategy

| Level | Use Case | Retention |
|-------|----------|-----------|
| ERROR | Exceptions, failures | 30 days |
| WARN | Rate limits, reconnects | 7 days |
| INFO | Game events, joins | 3 days |
| DEBUG | Tick details, inputs | 1 hour |

## Security Considerations

1. **JWT Validation**: All connections must provide valid Clerk JWT
2. **Rate Limiting**: Per-connection message rate limits
3. **Input Validation**: Server validates all game inputs
4. **Room Privacy**: Private rooms require invite codes
5. **DDoS Protection**: Connection throttling, IP bans

## Future Enhancements

1. **Geographic Distribution**: Deploy servers in multiple regions
2. **Replay Storage**: Move to S3/CloudFlare R2 for large replays
3. **Spectator CDN**: Stream spectator data through CDN for scale
4. **Tournament Sharding**: Dedicated servers for tournament matches
5. **WebRTC Data Channels**: For peer-to-peer voice chat
