# Bomberman Online - Anti-Cheat Design

## Overview

The Bomberman anti-cheat system implements a **server-authoritative architecture** where the server is the single source of truth for all game state. This document outlines the security measures, validation systems, and detection mechanisms used to ensure fair play.

## Core Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANTI-CHEAT PRINCIPLES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SERVER AUTHORITY                                                        │
│     └── Server is the ONLY source of truth for game state                  │
│                                                                             │
│  2. INPUT VALIDATION                                                        │
│     └── All client inputs are validated before processing                  │
│                                                                             │
│  3. RATE LIMITING                                                           │
│     └── Actions are rate-limited to prevent spam/exploits                  │
│                                                                             │
│  4. POSITION VERIFICATION                                                   │
│     └── Server tracks and verifies all player positions                    │
│                                                                             │
│  5. REPLAY VALIDATION                                                       │
│     └── Suspicious games can be reviewed via replay system                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Server-Authoritative Movement

### How It Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    MOVEMENT VALIDATION FLOW                                 │
└────────────────────────────────────────────────────────────────────────────┘

Client                                          Server
   │                                               │
   │──── move {direction: 'right', seq: 42} ─────►│
   │                                               │
   │    [Client: Predict movement locally]         │
   │    [Client: Store pending input]              │
   │                                               │
   │                                    ┌──────────┴──────────┐
   │                                    │ VALIDATION CHECKS   │
   │                                    ├─────────────────────┤
   │                                    │ ✓ Player alive?     │
   │                                    │ ✓ Valid direction?  │
   │                                    │ ✓ Move cooldown ok? │
   │                                    │ ✓ Target walkable?  │
   │                                    │ ✓ No bomb blocking? │
   │                                    └──────────┬──────────┘
   │                                               │
   │                              ┌────────────────┴────────────────┐
   │                              │                                 │
   │                         VALID│                            INVALID
   │                              │                                 │
   │                              ▼                                 ▼
   │                    ┌─────────────────┐              ┌──────────────────┐
   │                    │ Update position │              │ Ignore input     │
   │                    │ on server       │              │ Log violation    │
   │                    └─────────────────┘              └──────────────────┘
   │                                               │
   │◄──── state {players: [...], lastInput: 42} ──│
   │                                               │
   │    [Client: Reconcile with server state]      │
   │    [Client: Correct if prediction wrong]      │
```

### Server-Side Position Tracking

```typescript
interface ServerPlayerPosition {
  // Authoritative position (grid-based)
  x: number;
  y: number;

  // Movement state
  direction: Direction;
  isMoving: boolean;
  lastMoveAt: number;
  moveCooldownMs: number;  // Based on speed powerups

  // Anti-cheat tracking
  inputsThisTick: number;
  suspiciousInputs: number;
  lastValidatedAt: number;
}
```

### Movement Validation Rules

| Check | Description | Action on Fail |
|-------|-------------|----------------|
| Alive Check | Player must be alive | Ignore input |
| Direction Valid | Must be up/down/left/right | Ignore + log |
| Cooldown Check | Must wait between moves | Ignore input |
| Collision Check | Target cell must be walkable | Ignore input |
| Distance Check | Can only move 1 cell at a time | Ignore + flag |
| Rate Check | Max 60 inputs/second | Ignore + warn |

---

## 2. Input Rate Limiting

### Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  // Movement inputs
  move: {
    maxPerSecond: 60,
    burstAllowance: 10,
    cooldownMs: 16,  // ~60 Hz max
  },

  // Action inputs
  bomb: {
    maxPerSecond: 10,
    burstAllowance: 3,
    cooldownMs: 100,
  },

  // Chat messages
  chat: {
    maxPerSecond: 5,
    burstAllowance: 3,
    cooldownMs: 200,
  },

  // General messages
  global: {
    maxPerSecond: 100,
    burstAllowance: 20,
    cooldownMs: 10,
  },
};
```

### Token Bucket Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN BUCKET RATE LIMITER                         │
└─────────────────────────────────────────────────────────────────────┘

Bucket starts full:
┌────────────────────────────────────────┐
│ ● ● ● ● ● ● ● ● ● ●   (10 tokens)     │
└────────────────────────────────────────┘

Each input consumes 1 token:
┌────────────────────────────────────────┐
│ ● ● ● ● ● ● ● ● ●     (9 tokens)      │  ← Input processed
└────────────────────────────────────────┘

Tokens refill at rate (e.g., 60/second):
┌────────────────────────────────────────┐
│ ● ● ● ● ● ● ● ● ● ●   (10 tokens)     │  ← Refilled over time
└────────────────────────────────────────┘

If bucket empty, input rejected:
┌────────────────────────────────────────┐
│                        (0 tokens)      │  ← Input REJECTED
└────────────────────────────────────────┘
```

### Rate Limit Response

```typescript
interface RateLimitExceeded {
  type: 'error';
  code: 3002;  // RATE_LIMITED
  message: 'Too many actions, slow down';
  details: {
    actionType: string;
    retryAfterMs: number;
    tokensRemaining: number;
  };
}
```

---

## 3. Position Verification

### Continuous Verification

The server continuously verifies that client-reported positions are valid:

```typescript
function verifyPlayerPosition(player: Player, reportedPos: Position): boolean {
  // Calculate maximum possible distance since last verification
  const timeSinceLastVerify = Date.now() - player.lastValidatedAt;
  const maxMovesInTime = Math.floor(timeSinceLastVerify / player.moveCooldownMs);
  const maxDistance = maxMovesInTime;  // 1 cell per move

  // Calculate actual distance
  const distance = manhattanDistance(player.position, reportedPos);

  // Verify distance is possible
  if (distance > maxDistance + 1) {  // +1 for tolerance
    flagSuspiciousPlayer(player, 'TELEPORT_DETECTED', {
      expected: maxDistance,
      actual: distance,
      timeDelta: timeSinceLastVerify,
    });
    return false;
  }

  // Verify path is valid (no walls)
  if (!isPathValid(player.position, reportedPos)) {
    flagSuspiciousPlayer(player, 'WALL_CLIP_DETECTED', {
      from: player.position,
      to: reportedPos,
    });
    return false;
  }

  return true;
}
```

### Position Correction

```
Client thinks:                     Server authoritative:
┌─────────────────┐               ┌─────────────────┐
│ . . . . . . . . │               │ . . . . . . . . │
│ . P . . . . . . │  ←──────────  │ . . . . . . . . │
│ . . . . . . . . │   Correction  │ . . P . . . . . │
│ . . . . . . . . │               │ . . . . . . . . │
└─────────────────┘               └─────────────────┘
    (Invalid)                        (Authoritative)

Client receives server state and MUST reconcile to server position.
```

---

## 4. Action Cooldown Enforcement

### Cooldown System

```typescript
interface ActionCooldowns {
  // Bomb placement
  bomb: {
    globalCooldownMs: 100,     // Between any bomb placements
    perBombCooldownMs: 2200,   // While bomb is active (fuse time)
    maxActive: number,         // Based on powerups
  };

  // Movement
  move: {
    baseCooldownMs: 120,       // Default move speed
    minCooldownMs: 60,         // Max speed with powerups
    speedModifier: number,      // From speed powerups
  };

  // Special actions
  kick: {
    cooldownMs: 500,           // Between kicks
  };

  punch: {
    cooldownMs: 800,           // Between punches
  };
}
```

### Server-Side Cooldown Tracking

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COOLDOWN STATE PER PLAYER                         │
└─────────────────────────────────────────────────────────────────────┘

Player: "player_123"
├── lastMoveAt: 1699999999900
├── lastBombAt: 1699999999500
├── lastKickAt: 1699999998000
├── activeBombs: 2
└── maxBombs: 3

Incoming Action: BOMB at 1699999999950

Check: (now - lastBombAt) >= globalCooldownMs
       (1699999999950 - 1699999999500) = 450ms >= 100ms ✓

Check: activeBombs < maxBombs
       2 < 3 ✓

Result: ALLOWED
```

---

## 5. Replay Validation

### Replay Structure

```typescript
interface ReplayData {
  version: string;
  gameId: string;
  timestamp: number;
  duration: number;
  checksum: string;  // Integrity verification

  // Initial state
  initialState: {
    map: BoardState;
    players: PlayerState[];
    seed: number;
  };

  // Tick-by-tick events
  frames: ReplayFrame[];
}

interface ReplayFrame {
  tick: number;
  timestamp: number;
  inputs: PlayerInput[];
  events: GameEvent[];
  stateHash: string;  // For verification
}
```

### Replay Verification Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REPLAY VERIFICATION PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

   Original Game                                    Verification
        │                                                │
        │  Replay File                                   │
        │  ┌───────────────────────────┐                │
        │  │ • Initial state           │                │
        │  │ • All inputs              │                │
        │  │ • State hashes per tick   │                │
        │  └─────────────┬─────────────┘                │
        │                │                              │
        │                ▼                              │
        │    ┌───────────────────────────┐              │
        │    │ Deterministic Simulation  │◄─────────────┤
        │    │ (Re-run game from inputs) │              │
        │    └─────────────┬─────────────┘              │
        │                  │                            │
        │                  ▼                            │
        │    ┌───────────────────────────┐              │
        │    │ Compare state hashes      │              │
        │    │ at each tick              │              │
        │    └─────────────┬─────────────┘              │
        │                  │                            │
        │          ┌───────┴───────┐                    │
        │          │               │                    │
        │     MATCH│          MISMATCH                  │
        │          │               │                    │
        │          ▼               ▼                    │
        │    ┌───────────┐   ┌─────────────────┐       │
        │    │ VERIFIED  │   │ FLAG FOR REVIEW │       │
        │    └───────────┘   └─────────────────┘       │
```

### Automated Cheat Detection in Replays

```typescript
interface ReplayAnalysis {
  // Movement analysis
  averageInputLatency: number;
  impossibleMoves: number;
  teleportCount: number;

  // Action analysis
  perfectDodgeCount: number;  // Suspicious if too high
  bombPlacementTiming: number[];
  reactionTimeMs: number;

  // Statistical anomalies
  winRate: number;
  killDeathRatio: number;
  suspicionScore: number;  // 0-100

  // Flags
  flags: CheatFlag[];
}

type CheatFlag =
  | 'IMPOSSIBLE_MOVEMENT'
  | 'PERFECT_PREDICTIONS'
  | 'INHUMAN_REACTIONS'
  | 'WALL_CLIPPING'
  | 'SPEED_HACKING'
  | 'INPUT_MANIPULATION'
  | 'STATE_TAMPERING';
```

---

## 6. Additional Security Measures

### Authentication Security

```typescript
// JWT validation on every connection
async function validateConnection(token: string): Promise<ValidationResult> {
  try {
    // 1. Verify Clerk JWT signature
    const payload = await clerk.verifyToken(token);

    // 2. Check token expiry
    if (payload.exp < Date.now() / 1000) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    // 3. Check user ban status
    const user = await getUserFromDB(payload.sub);
    if (user.isBanned) {
      return { valid: false, reason: 'USER_BANNED' };
    }

    // 4. Check concurrent connection limit
    const activeConnections = await getActiveConnections(payload.sub);
    if (activeConnections >= MAX_CONNECTIONS_PER_USER) {
      return { valid: false, reason: 'TOO_MANY_CONNECTIONS' };
    }

    return { valid: true, userId: payload.sub };
  } catch (error) {
    return { valid: false, reason: 'INVALID_TOKEN' };
  }
}
```

### Message Integrity

```typescript
// All messages validated against schema
const MESSAGE_SCHEMAS: Record<string, JSONSchema> = {
  move: {
    type: 'object',
    required: ['type', 'direction', 'seq'],
    properties: {
      type: { const: 'move' },
      direction: { enum: ['up', 'down', 'left', 'right'] },
      seq: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    },
    additionalProperties: false,
  },
  // ... other message schemas
};

function validateMessage(msg: unknown): ValidationResult {
  if (!msg || typeof msg !== 'object') {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const schema = MESSAGE_SCHEMAS[(msg as any).type];
  if (!schema) {
    return { valid: false, reason: 'UNKNOWN_MESSAGE_TYPE' };
  }

  return ajv.validate(schema, msg)
    ? { valid: true }
    : { valid: false, reason: 'SCHEMA_VALIDATION_FAILED' };
}
```

### DDoS Protection

```typescript
const DDOS_PROTECTION = {
  // Connection rate limiting
  connections: {
    maxPerIP: 5,
    maxPerUser: 2,
    cooldownAfterReject: 60000,  // 1 minute
  },

  // Message rate limiting (global)
  messages: {
    maxPerSecond: 100,
    maxBurstSize: 200,
  },

  // Automatic banning
  autoban: {
    thresholdViolations: 10,
    timeWindowMs: 60000,
    banDurationMs: 3600000,  // 1 hour
  },
};
```

---

## 7. Suspicious Activity Monitoring

### Monitoring Dashboard Metrics

```typescript
interface AntiCheatMetrics {
  // Real-time metrics
  activeFlags: number;
  recentViolations: Violation[];
  suspiciousPlayers: Player[];

  // Historical metrics
  violationsPerHour: number;
  bansPerDay: number;
  falsePositiveRate: number;

  // Per-player metrics
  playerRiskScores: Record<string, number>;
}
```

### Violation Severity Levels

| Level | Examples | Action |
|-------|----------|--------|
| **LOW** | Occasional rate limit hits | Log only |
| **MEDIUM** | Repeated rate limits, minor position discrepancies | Warning sent |
| **HIGH** | Impossible movement, wall clipping | Shadow flag + review |
| **CRITICAL** | Clear cheating, memory manipulation detected | Immediate ban |

### Escalation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VIOLATION ESCALATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

Violation Detected
        │
        ▼
┌───────────────┐
│ Log violation │──────────────────────────────┐
└───────┬───────┘                              │
        │                                      │
        ▼                                      │
┌───────────────┐      < 3 in hour             │
│ Check history │─────────────────► No action  │
└───────┬───────┘                              │
        │                                      │
        │ >= 3 in hour                         │
        ▼                                      │
┌───────────────┐      Low severity            │
│ Evaluate      │─────────────────► Warning    │
│ severity      │                              │
└───────┬───────┘                              │
        │                                      │
        │ High severity                        │
        ▼                                      │
┌───────────────┐      First offense           │
│ Check prior   │─────────────────► 24h ban    │
│ offenses      │                              │
└───────┬───────┘                              │
        │                                      │
        │ Repeat offender                      │
        ▼                                      │
┌───────────────┐                              │
│ Permanent ban │                              │
│ + Report      │                              │
└───────────────┘                              │
```

---

## 8. Ban System

### Ban Types

| Type | Duration | Reason | Appeal |
|------|----------|--------|--------|
| **Soft Ban** | 1-24 hours | Minor violations | Auto-lifted |
| **Hard Ban** | 7-30 days | Confirmed cheating | Reviewable |
| **Permanent** | Forever | Repeat/severe offenses | Appeal process |
| **Shadow Ban** | Varies | Investigation period | Silent |

### Ban Data Structure

```typescript
interface Ban {
  id: string;
  playerId: string;
  type: 'soft' | 'hard' | 'permanent' | 'shadow';
  reason: string;
  evidence: {
    violations: Violation[];
    replays: string[];
    logs: string[];
  };
  issuedAt: Date;
  expiresAt: Date | null;
  issuedBy: 'system' | string;  // Admin ID
  appealStatus: 'none' | 'pending' | 'approved' | 'denied';
}
```

---

## 9. Client-Side Considerations

### What the Client Handles

| Responsibility | Authoritative? | Notes |
|----------------|----------------|-------|
| Input capture | Yes | Client sends raw inputs |
| Visual prediction | No | For responsiveness only |
| Animation timing | No | Cosmetic only |
| Sound effects | No | Cosmetic only |
| UI state | Yes | Local only |

### Client Prediction Reconciliation

```typescript
class ClientPrediction {
  private pendingInputs: Map<number, Input> = new Map();
  private lastConfirmedSeq: number = 0;

  // Called when input is sent
  predict(input: Input): void {
    const seq = this.nextSeq();
    this.pendingInputs.set(seq, input);
    this.applyLocally(input);  // Optimistic update
  }

  // Called when server state received
  reconcile(serverState: GameState): void {
    // Clear confirmed inputs
    for (const [seq] of this.pendingInputs) {
      if (seq <= serverState.lastProcessedInput) {
        this.pendingInputs.delete(seq);
      }
    }

    // Reset to server state
    this.resetToServerState(serverState);

    // Re-apply pending inputs
    for (const [, input] of this.pendingInputs) {
      this.applyLocally(input);
    }
  }
}
```

---

## 10. Future Enhancements

### Planned Improvements

1. **Machine Learning Detection**
   - Train models on known cheater patterns
   - Detect new/unknown cheats automatically

2. **Hardware ID Tracking**
   - Track device fingerprints
   - Prevent ban evasion via new accounts

3. **Spectator-Based Reporting**
   - Allow spectators to flag suspicious behavior
   - Human review queue for flags

4. **Statistical Analysis**
   - Long-term player statistics
   - Detect gradual stat inflation

5. **Honey Pot Systems**
   - Fake vulnerabilities to detect exploit attempts
   - Automatic flagging of exploit users
