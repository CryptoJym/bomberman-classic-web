# API Documentation

This document describes the REST API endpoints and WebSocket protocol for Bomberman Online.

## Table of Contents

- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Protocol](#websocket-protocol)
- [Error Codes](#error-codes)

---

## Authentication

Bomberman Online uses [Clerk](https://clerk.com) for authentication. All authenticated endpoints require a valid Clerk session token.

### Session Token

Include the session token in the Authorization header:

```http
Authorization: Bearer <clerk_session_token>
```

### Flow Overview

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│ Client  │──────│  Clerk  │──────│ Supabase │──────│  Game    │
│         │      │         │      │          │      │  Server  │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬─────┘
     │                │                │                  │
     │  1. Sign In    │                │                  │
     │───────────────>│                │                  │
     │                │                │                  │
     │  2. JWT Token  │                │                  │
     │<───────────────│                │                  │
     │                │                │                  │
     │  3. Webhook    │                │                  │
     │                │───────────────>│                  │
     │                │  (sync user)   │                  │
     │                │                │                  │
     │  4. API Request (with JWT)      │                  │
     │────────────────────────────────>│                  │
     │                │                │                  │
     │  5. Connect to Game Server (with JWT)              │
     │───────────────────────────────────────────────────>│
     │                │                │                  │
     │  6. Verify JWT │                │                  │
     │                │<──────────────────────────────────│
     │                │                │                  │
```

---

## REST API Endpoints

Base URL: `https://your-domain.com/api`

### Profiles

#### Get Current User Profile

```http
GET /api/profile
```

**Response:**
```json
{
  "id": "uuid",
  "clerk_id": "user_xxx",
  "username": "BombMaster",
  "display_name": "Bomb Master",
  "avatar_url": "https://...",
  "elo_rating": 1250,
  "total_wins": 42,
  "total_games": 100,
  "total_kills": 356,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get User Profile by ID

```http
GET /api/profile/:id
```

#### Update Profile

```http
PATCH /api/profile
```

**Request:**
```json
{
  "display_name": "New Name",
  "avatar_url": "https://..."
}
```

### Leaderboards

#### Get Global Leaderboard

```http
GET /api/leaderboard
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stat` | string | `elo` | Stat to rank by: `elo`, `wins`, `kills`, `games` |
| `period` | string | `all` | Time period: `daily`, `weekly`, `monthly`, `all` |
| `limit` | number | `50` | Results per page (max 100) |
| `offset` | number | `0` | Pagination offset |

**Response:**
```json
{
  "entries": [
    {
      "rank": 1,
      "player_id": "uuid",
      "username": "TopPlayer",
      "avatar_url": "https://...",
      "elo_rating": 2100,
      "total_wins": 500,
      "total_games": 600,
      "win_rate": 0.833
    }
  ],
  "total": 10000,
  "period": "all"
}
```

### Games

#### Create Game Room

```http
POST /api/games
```

**Request:**
```json
{
  "settings": {
    "max_players": 4,
    "round_time": 180,
    "rounds_to_win": 3,
    "map_id": "uuid",
    "is_private": true,
    "allow_spectators": true
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "room_code": "ABCD1234",
  "status": "waiting",
  "settings": { ... },
  "server_url": "wss://game.bomberman.online"
}
```

#### Get Game by Code

```http
GET /api/games/:code
```

#### List Public Games

```http
GET /api/games
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `waiting` | Game status filter |
| `limit` | number | `20` | Results per page |

### Maps

#### List Maps

```http
GET /api/maps
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `official` | boolean | - | Filter official maps |
| `creator_id` | string | - | Filter by creator |
| `sort` | string | `popular` | Sort: `popular`, `recent`, `likes` |
| `limit` | number | `20` | Results per page |

#### Get Map

```http
GET /api/maps/:id
```

#### Create Map

```http
POST /api/maps
```

**Request:**
```json
{
  "name": "My Custom Map",
  "description": "A fun map with lots of blocks",
  "data": {
    "width": 15,
    "height": 13,
    "tiles": [[...]]
  }
}
```

### Achievements

#### List All Achievements

```http
GET /api/achievements
```

**Response:**
```json
{
  "achievements": [
    {
      "id": "uuid",
      "code": "first_blood",
      "name": "First Blood",
      "description": "Get your first kill",
      "icon": "/achievements/first_blood.png",
      "rarity": "common"
    }
  ]
}
```

#### Get User Achievements

```http
GET /api/achievements/me
```

**Response:**
```json
{
  "achievements": [
    {
      "id": "uuid",
      "code": "first_blood",
      "name": "First Blood",
      "unlocked_at": "2024-01-15T12:00:00Z"
    }
  ],
  "total_unlocked": 15,
  "total_available": 50
}
```

### Replays

#### List Replays

```http
GET /api/replays
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `player_id` | string | Filter by player |
| `game_id` | string | Filter by game |
| `limit` | number | Results per page |

#### Get Replay

```http
GET /api/replays/:id
```

### Tournaments

#### List Tournaments

```http
GET /api/tournaments
```

#### Get Tournament

```http
GET /api/tournaments/:id
```

#### Join Tournament

```http
POST /api/tournaments/:id/join
```

### Friends

#### List Friends

```http
GET /api/friends
```

#### Send Friend Request

```http
POST /api/friends/request
```

**Request:**
```json
{
  "addressee_id": "uuid"
}
```

#### Accept/Reject Friend Request

```http
PATCH /api/friends/request/:id
```

**Request:**
```json
{
  "status": "accepted" | "rejected"
}
```

---

## WebSocket Protocol

Connect to the game server for real-time gameplay.

### Connection

```
wss://game.bomberman.online?token=<clerk_jwt>
```

### Message Format

All messages are JSON with a `type` field:

```typescript
interface Message {
  type: string;
  [key: string]: any;
}
```

### Client → Server Messages

#### Join Room

```json
{
  "type": "join",
  "roomCode": "ABCD1234",
  "token": "<clerk_jwt>"
}
```

#### Movement

```json
{
  "type": "move",
  "direction": "up" | "down" | "left" | "right",
  "seq": 123
}
```

#### Stop Moving

```json
{
  "type": "stop",
  "seq": 124
}
```

#### Place Bomb

```json
{
  "type": "bomb",
  "seq": 125
}
```

#### Ready Toggle

```json
{
  "type": "ready"
}
```

#### Chat Message

```json
{
  "type": "chat",
  "content": "Hello!"
}
```

#### Ping

```json
{
  "type": "ping",
  "timestamp": 1704067200000
}
```

### Server → Client Messages

#### Game State (sent at 20Hz)

```json
{
  "type": "state",
  "tick": 1000,
  "players": [
    {
      "id": "uuid",
      "x": 64,
      "y": 64,
      "direction": "down",
      "isAlive": true,
      "bombCount": 2,
      "maxBombs": 3,
      "explosionRadius": 2
    }
  ],
  "bombs": [
    {
      "id": "uuid",
      "ownerId": "uuid",
      "x": 96,
      "y": 64,
      "fuseTime": 2500
    }
  ],
  "powerups": [
    {
      "id": "uuid",
      "type": "bomb_up",
      "x": 128,
      "y": 64
    }
  ],
  "lastProcessedInput": {
    "playerId": "uuid",
    "seq": 123
  }
}
```

#### Room Joined

```json
{
  "type": "joined",
  "playerId": "uuid",
  "roomState": {
    "code": "ABCD1234",
    "phase": "waiting",
    "players": [...],
    "settings": {...}
  }
}
```

#### Player Joined

```json
{
  "type": "player_joined",
  "player": {
    "id": "uuid",
    "username": "NewPlayer",
    "isReady": false
  }
}
```

#### Player Left

```json
{
  "type": "player_left",
  "playerId": "uuid"
}
```

#### Game Start

```json
{
  "type": "game_start",
  "countdown": 3,
  "map": {...}
}
```

#### Game End

```json
{
  "type": "game_end",
  "winner": "uuid",
  "stats": {
    "players": [
      {
        "id": "uuid",
        "kills": 3,
        "deaths": 1,
        "placement": 1,
        "eloChange": 25
      }
    ]
  }
}
```

#### Explosion

```json
{
  "type": "explosion",
  "bombId": "uuid",
  "x": 96,
  "y": 64,
  "radius": 2,
  "destroyedTiles": [[3, 2], [3, 3]],
  "hitPlayers": ["uuid"]
}
```

#### Player Death

```json
{
  "type": "death",
  "playerId": "uuid",
  "killerId": "uuid"
}
```

#### Chat Message

```json
{
  "type": "chat",
  "senderId": "uuid",
  "senderName": "Player1",
  "content": "Hello!",
  "timestamp": 1704067200000
}
```

#### Pong

```json
{
  "type": "pong",
  "timestamp": 1704067200000,
  "serverTime": 1704067200005
}
```

#### Error

```json
{
  "type": "error",
  "code": "ROOM_FULL",
  "message": "The room is full"
}
```

### State Interpolation

The client receives state updates at 20Hz but renders at 60 FPS. Use interpolation between the two most recent states:

```typescript
function interpolatePosition(
  prev: Position,
  next: Position,
  alpha: number
): Position {
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha
  };
}
```

### Input Prediction

Client predicts movement locally and reconciles with server:

1. Apply input locally immediately
2. Send input to server with sequence number
3. When server confirms, reconcile position
4. Replay any unconfirmed inputs

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Application Error Codes

| Code | Description |
|------|-------------|
| `AUTH_INVALID` | Invalid or expired authentication token |
| `AUTH_REQUIRED` | Authentication required |
| `ROOM_NOT_FOUND` | Game room does not exist |
| `ROOM_FULL` | Game room is at capacity |
| `ROOM_STARTED` | Game has already started |
| `ALREADY_IN_ROOM` | Player is already in another room |
| `NOT_IN_ROOM` | Player is not in the room |
| `NOT_HOST` | Only the host can perform this action |
| `INVALID_INPUT` | Invalid input data |
| `RATE_LIMITED` | Too many requests |
| `MAP_INVALID` | Map data is invalid |
| `TOURNAMENT_FULL` | Tournament registration is full |
| `TOURNAMENT_STARTED` | Tournament has already started |

### Error Response Format

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The game room does not exist or has been closed",
    "details": {}
  }
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Authentication | 10 req/min |
| API (general) | 100 req/min |
| Game actions | 60 req/sec |
| Chat messages | 5 msg/sec |

---

## Versioning

The API version is included in the base URL:

```
https://your-domain.com/api/v1/...
```

Breaking changes will increment the version number.
