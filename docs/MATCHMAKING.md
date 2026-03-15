# Bomberman Online - Matchmaking Design

## Overview

The matchmaking system provides automated player matching based on skill rating (ELO), queue time, and regional preferences. It supports both casual and ranked play modes with fair match formation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MATCHMAKING SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────┘

     Client A          Client B          Client C          Client D
         │                 │                 │                 │
         │ queue_join      │ queue_join      │ queue_join      │ queue_join
         ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway / Load Balancer                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Matchmaking Service                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Queue Manager  │  │  Match Maker    │  │  Party Manager              │  │
│  │                 │  │                 │  │                             │  │
│  │  • Add/remove   │  │  • ELO matching │  │  • Party creation          │  │
│  │  • Track wait   │  │  • Range expand │  │  • Party queue             │  │
│  │  • Priority     │  │  • Balance teams│  │  • Voice coordination      │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│           └────────────────────┼──────────────────────────┘                  │
│                                │                                             │
│                    ┌───────────▼───────────┐                                 │
│                    │    Redis Cluster      │                                 │
│                    │  • Queue sorted sets  │                                 │
│                    │  • Match state        │                                 │
│                    │  • Player locations   │                                 │
│                    └───────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ match_found
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Game Server Pool                                   │
│                                                                             │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│    │  Server 1   │    │  Server 2   │    │  Server N   │                   │
│    │  Region: US │    │  Region: EU │    │  Region: AP │                   │
│    └─────────────┘    └─────────────┘    └─────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Queue System

### Queue Types

| Queue | Mode | Players | ELO Required | Description |
|-------|------|---------|--------------|-------------|
| `casual_ffa` | Free-for-All | 2-8 | No | Quick casual matches |
| `casual_team` | Team vs Team | 4-8 | No | Casual team play |
| `ranked_ffa` | Free-for-All | 4-8 | Yes | Competitive FFA |
| `ranked_2v2` | 2v2 Teams | 4 | Yes | Competitive 2v2 |
| `ranked_4v4` | 4v4 Teams | 8 | Yes | Competitive 4v4 |

### Queue Entry Structure

```typescript
interface QueueEntry {
  id: string;              // Unique queue entry ID
  playerId: string;        // Player/Party leader ID
  partyIds?: string[];     // Party member IDs (if any)
  queueType: QueueType;
  region: Region;
  eloRating: number;       // Solo or party average
  queuedAt: number;        // Timestamp
  expandLevel: number;     // Current search expansion level
  priority: number;        // Queue priority (for reconnects, etc.)
}

type Region = 'na-east' | 'na-west' | 'eu-west' | 'eu-central' | 'ap-southeast' | 'ap-northeast';
```

### Redis Queue Structure

```
# Sorted sets by region and queue type
queue:{region}:{type} -> ZSET
  score = queuedAt (timestamp for FIFO within ELO brackets)
  member = playerId

# Player queue state
player:{playerId}:queue -> JSON{queueEntry}

# ELO lookup for quick matching
elo:{region}:{type}:{elo_bucket} -> SET{playerIds}
  // elo_bucket = floor(elo / 100) * 100  (e.g., 1500 -> 1500)
```

---

## ELO-Based Matching Algorithm

### ELO System

```typescript
// Initial ELO for new players
const INITIAL_ELO = 1000;

// K-factor determines rating volatility
const K_FACTORS = {
  provisional: 40,   // First 10 games
  standard: 20,      // 10-30 games
  established: 16,   // 30+ games
};

// ELO calculation
function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  kFactor: number
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(kFactor * (actualScore - expectedScore));
}

// FFA ELO (placement-based)
function calculateFfaEloChange(
  playerElo: number,
  opponents: number[],  // Other players' ELOs
  placement: number,    // 1st, 2nd, 3rd, etc.
  totalPlayers: number,
  kFactor: number
): number {
  // Calculate expected placement based on ELO
  const avgOpponentElo = opponents.reduce((a, b) => a + b, 0) / opponents.length;
  const expectedPlacement = calculateExpectedPlacement(playerElo, avgOpponentElo, totalPlayers);

  // Placement score: 1.0 for 1st, 0.0 for last
  const actualScore = (totalPlayers - placement) / (totalPlayers - 1);
  const expectedScore = (totalPlayers - expectedPlacement) / (totalPlayers - 1);

  return Math.round(kFactor * (actualScore - expectedScore) * (totalPlayers / 4));
}
```

### Rank Tiers

| Tier | Division | ELO Range | Icon |
|------|----------|-----------|------|
| Bronze | I-IV | 0-799 | 🥉 |
| Silver | I-IV | 800-1199 | 🥈 |
| Gold | I-IV | 1200-1599 | 🥇 |
| Platinum | I-IV | 1600-1999 | 💎 |
| Diamond | I-IV | 2000-2399 | 💠 |
| Master | I-III | 2400-2799 | 👑 |
| Grandmaster | - | 2800+ | 🏆 |

### Division Breakdown

```
Gold Tier:
├── Gold IV:  1200-1299
├── Gold III: 1300-1399
├── Gold II:  1400-1499
└── Gold I:   1500-1599
```

---

## Match Formation Algorithm

### Phase 1: Initial Search

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MATCH FORMATION - PHASE 1                                │
└─────────────────────────────────────────────────────────────────────────────┘

Player joins queue (ELO: 1500)
        │
        ▼
┌───────────────────────────────────────┐
│ Search within initial range: ±100    │
│ ELO range: 1400-1600                  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Query Redis:                          │
│ ZRANGEBYSCORE queue:na-east:ranked    │
│   1400 1600 LIMIT 0 8                 │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Found 4 players:                      │
│ • Player A: 1480                      │
│ • Player B: 1520                      │
│ • Player C: 1550                      │
│ • Player D: 1500 (self)               │
└───────────────────────────────────────┘
        │
        │ Need 4-8 players for FFA
        │ Have 4 ✓
        ▼
┌───────────────────────────────────────┐
│ MATCH FOUND                           │
│ Average ELO: 1512                     │
│ ELO spread: 70                        │
└───────────────────────────────────────┘
```

### Phase 2: Range Expansion

If not enough players found, expand search range over time:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RANGE EXPANSION SCHEDULE                                │
└─────────────────────────────────────────────────────────────────────────────┘

Time in Queue    ELO Range        Expansion
─────────────────────────────────────────────
0-30 seconds     ±100             Initial
30-60 seconds    ±150             +50
60-90 seconds    ±200             +50
90-120 seconds   ±300             +100
120-180 seconds  ±400             +100
180+ seconds     ±500 (max)       Final

For player ELO 1500:
├── 0-30s:   1400-1600
├── 30-60s:  1350-1650
├── 60-90s:  1300-1700
├── 90-120s: 1200-1800
├── 120-180s: 1100-1900
└── 180s+:   1000-2000
```

### Phase 3: Match Quality Scoring

```typescript
interface MatchQuality {
  averageElo: number;
  eloSpread: number;           // Max - Min ELO
  waitTimeScore: number;       // Penalize long waits
  regionScore: number;         // Prefer same region
  partyBalanceScore: number;   // Balance parties vs solos
  overallScore: number;        // Weighted combination
}

function calculateMatchQuality(players: QueueEntry[]): MatchQuality {
  const elos = players.map(p => p.eloRating);
  const averageElo = elos.reduce((a, b) => a + b, 0) / elos.length;
  const eloSpread = Math.max(...elos) - Math.min(...elos);

  // Wait time score (higher = worse, players waited longer)
  const avgWaitTime = players.reduce((sum, p) =>
    sum + (Date.now() - p.queuedAt), 0) / players.length;
  const waitTimeScore = Math.min(avgWaitTime / 180000, 1); // Cap at 3 min

  // ELO spread score (lower spread = better match)
  const eloScore = 1 - Math.min(eloSpread / 500, 1);

  // Overall quality (0-100)
  const overallScore = (
    eloScore * 0.5 +           // 50% weight on ELO balance
    (1 - waitTimeScore) * 0.3 + // 30% weight on wait time
    regionScore * 0.1 +         // 10% weight on region
    partyBalanceScore * 0.1     // 10% weight on party balance
  ) * 100;

  return {
    averageElo,
    eloSpread,
    waitTimeScore,
    regionScore,
    partyBalanceScore,
    overallScore,
  };
}

// Minimum quality thresholds
const MIN_QUALITY_THRESHOLDS = {
  ranked: 60,     // Higher standards for ranked
  casual: 40,     // More lenient for casual
};
```

---

## Match Formation Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE MATCHMAKING FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

Player clicks "Find Match"
        │
        ▼
┌───────────────────┐
│ Add to Queue      │───────────────────────────────────────┐
│ Start search      │                                       │
└─────────┬─────────┘                                       │
          │                                                 │
          │ Every 1 second                                  │
          ▼                                                 │
┌───────────────────┐     No match                         │
│ Search for match  │────────────────────┐                 │
│ in current range  │                    │                 │
└─────────┬─────────┘                    │                 │
          │                              │                 │
          │ Match found                  │                 │
          ▼                              ▼                 │
┌───────────────────┐          ┌───────────────────┐       │
│ Validate match    │          │ Expand range      │       │
│ quality           │          │ (if time expired) │       │
└─────────┬─────────┘          └─────────┬─────────┘       │
          │                              │                 │
          │ Quality OK                   │ Loop back       │
          │                              └─────────────────┤
          ▼                                                │
┌───────────────────┐                                      │
│ Lock players      │◄─────────────────────────────────────┘
│ (prevent double   │       If queue timeout (5 min)
│ matching)         │       cancel and notify
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Notify all players│──────► "Match Found! Accept?"
│ "Match Found"     │
└─────────┬─────────┘
          │
          │ 15 second accept window
          ▼
┌───────────────────┐     Not all accept
│ All players       │────────────────────┐
│ accept?           │                    │
└─────────┬─────────┘                    │
          │                              │
          │ All accept                   │
          │                              ▼
          │                    ┌───────────────────┐
          │                    │ Re-queue          │
          │                    │ accepting players │
          │                    │ Penalize decliners│
          │                    └───────────────────┘
          ▼
┌───────────────────┐
│ Assign to server  │──────► Select optimal server
│ (best region)     │        based on player locations
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Create room       │
│ Connect players   │──────► All players join game
└───────────────────┘
```

### Accept/Decline Window

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MATCH ACCEPT WINDOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Match Found Notification:
┌─────────────────────────────────────────────┐
│                                             │
│     MATCH FOUND!                            │
│                                             │
│     Players: 8                              │
│     Average ELO: 1485                       │
│     Estimated Quality: ★★★★☆               │
│                                             │
│     ┌─────────┐        ┌─────────┐         │
│     │ ACCEPT  │        │ DECLINE │         │
│     └─────────┘        └─────────┘         │
│                                             │
│     Time remaining: 15s                     │
│                                             │
└─────────────────────────────────────────────┘

Player Status:
├── Player 1: ✓ Accepted
├── Player 2: ✓ Accepted
├── Player 3: ⏳ Pending
├── Player 4: ✓ Accepted
├── Player 5: ⏳ Pending
├── Player 6: ✓ Accepted
├── Player 7: ⏳ Pending
└── Player 8: ✓ Accepted
```

---

## Region Preferences

### Region Selection

```typescript
interface RegionPreference {
  primary: Region;           // Player's primary region
  acceptable: Region[];      // Other acceptable regions
  maxLatencyMs: number;      // Maximum acceptable latency
}

// Default region selection based on client location
function detectPlayerRegion(clientIP: string): Region {
  const geoData = geoip.lookup(clientIP);

  const regionMap: Record<string, Region> = {
    'US-East': 'na-east',
    'US-West': 'na-west',
    'EU': 'eu-west',
    'EU-Central': 'eu-central',
    'Asia-Pacific': 'ap-southeast',
    'Japan/Korea': 'ap-northeast',
  };

  return regionMap[geoData?.region] || 'na-east';
}

// Cross-region matching (when queue times are long)
function shouldCrossRegionMatch(
  player: QueueEntry,
  otherRegionPlayers: QueueEntry[]
): boolean {
  const waitTime = Date.now() - player.queuedAt;

  // Only consider cross-region after 2 minutes
  if (waitTime < 120000) return false;

  // Check if other region has enough players
  if (otherRegionPlayers.length < 4) return false;

  // Estimate latency (simplified)
  const estimatedLatency = estimateLatency(player.region, otherRegionPlayers[0].region);

  return estimatedLatency <= player.maxLatencyMs;
}
```

### Regional Server Distribution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REGIONAL SERVER DISTRIBUTION                           │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌───────────────┐
                        │   EU-WEST     │
                        │   London      │
                        └───────┬───────┘
                                │
    ┌───────────────┐          │          ┌───────────────┐
    │   NA-WEST     │          │          │  EU-CENTRAL   │
    │   Oregon      │──────────┼──────────│  Frankfurt    │
    └───────────────┘          │          └───────────────┘
                                │
    ┌───────────────┐          │          ┌───────────────┐
    │   NA-EAST     │──────────┼──────────│  AP-SOUTHEAST │
    │   Virginia    │          │          │  Singapore    │
    └───────────────┘          │          └───────────────┘
                                │
                        ┌───────┴───────┐
                        │  AP-NORTHEAST │
                        │   Tokyo       │
                        └───────────────┘

Cross-region latency estimates (ms):
NA-East ↔ NA-West:     ~60ms
NA-East ↔ EU-West:     ~90ms
EU-West ↔ EU-Central:  ~20ms
AP-Southeast ↔ AP-NE:  ~50ms
NA-West ↔ AP-NE:       ~120ms
```

---

## Party Queue Support

### Party System

```typescript
interface Party {
  id: string;
  leaderId: string;
  members: PartyMember[];
  maxSize: number;          // Based on queue type
  createdAt: number;
  queueEntry?: QueueEntry;  // When in queue
}

interface PartyMember {
  playerId: string;
  username: string;
  eloRating: number;
  isReady: boolean;
  joinedAt: number;
}

// Party ELO calculation for matching
function calculatePartyElo(party: Party): number {
  const elos = party.members.map(m => m.eloRating);

  // Use weighted average (slightly favor highest ELO to prevent boosting)
  const avgElo = elos.reduce((a, b) => a + b, 0) / elos.length;
  const maxElo = Math.max(...elos);

  // Party ELO = 70% average + 30% highest
  return Math.round(avgElo * 0.7 + maxElo * 0.3);
}
```

### Party Queue Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PARTY QUEUE FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Party Leader clicks "Find Match"
        │
        ▼
┌───────────────────┐
│ Check all members │
│ are ready         │
└─────────┬─────────┘
          │
          │ All ready
          ▼
┌───────────────────┐
│ Calculate party   │──────► partyElo = 0.7 * avg + 0.3 * max
│ ELO               │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Add party as      │
│ single queue entry│──────► Party counts as 1 entry with
└─────────┬─────────┘        multiple player slots
          │
          ▼
┌───────────────────┐
│ Match with        │
│ - Other parties   │
│ - Solo players    │
│ Balance team sizes│
└─────────┬─────────┘
          │
          │ Match found
          ▼
┌───────────────────┐
│ All party members │──────► Party leader accepts for all
│ join game together│        (members can't individually decline)
└───────────────────┘
```

---

## Queue Timeout & Penalties

### Timeout Rules

| Scenario | Timeout | Action |
|----------|---------|--------|
| Queue search | 5 minutes | Cancel, notify player |
| Match accept | 15 seconds | Decline, re-queue others |
| Ready check | 60 seconds | Kick unready, notify |

### Decline Penalties

```typescript
interface MatchmakingPenalties {
  // Consecutive declines
  declines: {
    1: { cooldownMs: 60000 },      // 1 min after 1st decline
    2: { cooldownMs: 300000 },     // 5 min after 2nd
    3: { cooldownMs: 900000 },     // 15 min after 3rd
    4: { cooldownMs: 3600000 },    // 1 hour after 4th
  };

  // Leaving during game
  leaveGame: {
    casual: { eloLoss: 0, cooldownMs: 300000 },
    ranked: { eloLoss: 25, cooldownMs: 900000 },
  };

  // AFK detection
  afk: {
    warningAfterMs: 60000,        // Warn at 1 min
    kickAfterMs: 120000,          // Kick at 2 min
    penalty: { eloLoss: 15, cooldownMs: 300000 },
  };
}
```

---

## Metrics & Monitoring

### Queue Health Metrics

```typescript
interface QueueMetrics {
  // Queue state
  playersInQueue: Record<QueueType, number>;
  averageWaitTimeMs: Record<QueueType, number>;
  matchesFormedPerMinute: number;

  // Match quality
  averageMatchQuality: number;
  averageEloSpread: number;
  crossRegionMatchRate: number;

  // Player experience
  queueAbandonRate: number;
  matchDeclineRate: number;
  averageAcceptTime: number;
}

// Alert thresholds
const QUEUE_ALERTS = {
  highWaitTime: 180000,        // Alert if avg wait > 3 min
  lowQuality: 50,              // Alert if quality < 50
  highAbandonRate: 0.15,       // Alert if > 15% abandon
};
```

### Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MATCHMAKING DASHBOARD                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  QUEUE STATUS                          MATCHES (Last Hour)                  │
│  ─────────────                         ────────────────────                 │
│  Ranked FFA:    127 players            Formed:     342                      │
│  Ranked 2v2:     43 players            Avg Quality: 78%                     │
│  Casual FFA:    215 players            Avg Wait:    45s                     │
│  Casual Team:    89 players            Declines:    12                      │
│                                                                             │
│  WAIT TIMES                            REGIONAL DISTRIBUTION                │
│  ──────────                            ────────────────────                 │
│  Ranked FFA:    52s avg                NA-East:   34%                       │
│  Ranked 2v2:    78s avg                NA-West:   22%                       │
│  Casual FFA:    23s avg                EU-West:   28%                       │
│  Casual Team:   41s avg                AP:        16%                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Wait Time Trend (24h)                                               │   │
│  │                                                                     │   │
│  │  120s │                    ╱╲                                       │   │
│  │   90s │              ╱╲   ╱  ╲                                      │   │
│  │   60s │─────────────╱──╲─╱────╲──────────────────                   │   │
│  │   30s │   ╱╲   ╱╲  ╱    ╲      ╲    ╱╲                              │   │
│  │    0s │──╱──╲─╱──╲╱──────────────╲──╱──╲─────────                   │   │
│  │       └─────────────────────────────────────────                    │   │
│  │         00:00   06:00   12:00   18:00   24:00                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Queue Management

```typescript
// Join queue
POST /api/matchmaking/queue
Request:
{
  "queueType": "ranked_ffa",
  "region": "na-east",        // Optional, auto-detected
  "partyId": "party_123"      // Optional, if in party
}
Response:
{
  "queueId": "queue_abc123",
  "position": 45,
  "estimatedWaitMs": 30000,
  "eloRange": { "min": 1400, "max": 1600 }
}

// Leave queue
DELETE /api/matchmaking/queue

// Get queue status
GET /api/matchmaking/queue/status
Response:
{
  "inQueue": true,
  "queueType": "ranked_ffa",
  "waitTimeMs": 25000,
  "currentRange": { "min": 1350, "max": 1650 },
  "expandsInMs": 5000
}

// Accept match
POST /api/matchmaking/accept
Request:
{
  "matchId": "match_xyz789"
}

// Decline match
POST /api/matchmaking/decline
Request:
{
  "matchId": "match_xyz789",
  "reason": "not_ready"       // Optional
}
```

---

## WebSocket Events

### Client -> Server

```typescript
// Join queue
{ type: 'queue_join', queueType: 'ranked_ffa' }

// Leave queue
{ type: 'queue_leave' }

// Accept match
{ type: 'match_accept', matchId: 'match_123' }

// Decline match
{ type: 'match_decline', matchId: 'match_123' }
```

### Server -> Client

```typescript
// Queue update
{ type: 'queue_update', position: 45, estimatedWaitMs: 25000 }

// Match found
{
  type: 'match_found',
  matchId: 'match_123',
  players: [...],
  averageElo: 1485,
  acceptDeadlineMs: 15000
}

// Match accepted (by another player)
{ type: 'match_player_accepted', acceptedCount: 5, totalPlayers: 8 }

// Match confirmed (all accepted)
{ type: 'match_confirmed', matchId: 'match_123', serverId: 'server_1', roomCode: 'ABCD' }

// Match cancelled (someone declined)
{ type: 'match_cancelled', reason: 'player_declined', requeued: true }
```
