# 🎮 BOMBERMAN ONLINE - Maximum Parallelization Orchestration Plan

## Executive Summary

This plan transforms the existing Bomberman game into a full-featured online multiplayer experience with:
- **Clerk Authentication** for user management
- **Supabase** for persistent data storage
- **SNES-style pixel art graphics** (Super Bomberman aesthetic)
- **Full feature set**: Lobbies, Matchmaking, Spectator, Chat, Map Editor, Achievements, Tournaments, Replays

**Architecture**: Next.js 14 + PixiJS + WebSocket (hybrid Supabase + dedicated game server)
**Deployment**: Vercel (frontend) + Railway (game server)

---

## Dependency Graph Visualization

```
LEVEL 0 (7 parallel) ─────────────────────────────────────────────────────────
│
├── [A] Infrastructure    ├── [B] Supabase Schema   ├── [C] Asset Pipeline
├── [D] Server Design     ├── [E] Type Definitions  ├── [F] CI/CD Setup
└── [G] Documentation
│
▼ SYNC POINT ────────────────────────────────────────────────────────────────
│
LEVEL 1 (5 parallel) ─────────────────────────────────────────────────────────
│
├── [H] Auth Layer        ├── [I] Game Engine       ├── [J] Game Server
├── [K] Data Access       └── [L] UI Components
│
▼ SYNC POINT ────────────────────────────────────────────────────────────────
│
LEVEL 2 (5 parallel) ─────────────────────────────────────────────────────────
│
├── [M] Lobby System      ├── [N] Core Gameplay     ├── [O] Leaderboards
├── [P] User Profiles     └── [Q] Chat System
│
▼ SYNC POINT ────────────────────────────────────────────────────────────────
│
LEVEL 3 (5 parallel) ─────────────────────────────────────────────────────────
│
├── [R] Matchmaking       ├── [S] Spectator Mode    ├── [T] Achievements
├── [U] Replay System     └── [V] Map Editor
│
▼ SYNC POINT ────────────────────────────────────────────────────────────────
│
LEVEL 4 (2 parallel) ─────────────────────────────────────────────────────────
│
├── [W] Tournament Mode   └── [X] Social Features
│
▼ SYNC POINT ────────────────────────────────────────────────────────────────
│
LEVEL 5 (3 parallel) ─────────────────────────────────────────────────────────
│
├── [Y] Integration       ├── [Z] Testing          └── [AA] Deployment
│
▼ COMPLETE ───────────────────────────────────────────────────────────────────
```

---

## Phase 1: Foundation Layer (Level 0)

### Maximum Parallelization: 7 Concurrent Workers

---

### Stream A: Infrastructure Setup
**Dependencies**: None
**Output**: Fully configured Next.js project

```markdown
## Tasks:
1. Initialize Next.js 14 with App Router
2. Configure TypeScript (strict mode)
3. Setup Tailwind CSS with custom retro theme
4. Configure ESLint + Prettier
5. Create folder structure:
   - /app (Next.js pages)
   - /components (UI components)
   - /lib (utilities, hooks)
   - /game (PixiJS game code)
   - /server (game server code)
   - /types (shared types)
   - /assets (sprites, audio)
6. Setup path aliases (@/*)
7. Configure next.config.js for WebSocket support
```

**Deliverables**:
- `package.json` with all dependencies
- `tsconfig.json` configured
- `tailwind.config.ts` with retro theme
- `.eslintrc.json` and `.prettierrc`
- Base folder structure

---

### Stream B: Supabase Schema Design
**Dependencies**: None
**Output**: Complete database schema

```sql
-- Core Tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  clerk_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER DEFAULT 1000,
  total_wins INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE,
  status TEXT CHECK (status IN ('waiting', 'playing', 'finished')),
  map_id UUID REFERENCES maps(id),
  winner_id UUID REFERENCES profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id),
  position INTEGER, -- 1-16
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  placement INTEGER, -- final position
  elo_change INTEGER DEFAULT 0
);

CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL, -- tile data
  is_official BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  criteria JSONB -- unlock conditions
);

CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

CREATE TABLE replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  data BYTEA, -- compressed replay data
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('registration', 'active', 'finished')),
  format TEXT CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin')),
  max_players INTEGER,
  prize_pool JSONB,
  bracket_data JSONB,
  starts_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id),
  seed INTEGER,
  status TEXT DEFAULT 'active',
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id),
  addressee_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- text, emoji, system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_elo ON profiles(elo_rating DESC);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);
CREATE INDEX idx_maps_creator ON maps(creator_id);
CREATE INDEX idx_maps_official ON maps(is_official);
CREATE INDEX idx_replays_game ON replays(game_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_chat_game ON chat_messages(game_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public maps are viewable by everyone"
  ON maps FOR SELECT USING (true);

CREATE POLICY "Users can create maps"
  ON maps FOR INSERT WITH CHECK (auth.uid() = creator_id);
```

**Deliverables**:
- Supabase migration files
- RLS policies
- Database functions/triggers
- Seed data for achievements

---

### Stream C: Asset Pipeline (SNES Style)
**Dependencies**: None
**Output**: Complete sprite sheets and audio

```markdown
## Asset Specifications:

### Character Sprites (32x32 pixels)
- 8 unique bomberman characters
- Animations per character:
  - Idle (4 frames)
  - Walk N/S/E/W (4 frames each)
  - Place bomb (2 frames)
  - Death (6 frames)
  - Victory (4 frames)
- Color palette: 16 colors per character (SNES limitation aesthetic)

### Bomb Sprites (32x32 pixels)
- Bomb idle (3 frames wobble)
- Fuse burning (4 frames)
- Explosion center (4 frames)
- Explosion horizontal (4 frames)
- Explosion vertical (4 frames)
- Explosion end caps (4 frames each direction)

### Tile Sprites (32x32 pixels)
- Ground tiles (4 variations)
- Indestructible walls (4 variations)
- Destructible blocks (4 variations)
- Block destruction animation (6 frames)

### Power-up Sprites (24x24 pixels)
- Bomb Up (extra bomb)
- Fire Up (explosion range)
- Speed Up (movement speed)
- Kick (kick bombs)
- Punch (throw bombs)
- Shield (one-hit protection)
- Skull (random effect)

### UI Elements
- Retro pixel font (8x8 and 16x16)
- Menu backgrounds
- Button sprites (normal, hover, pressed)
- Health/timer bars
- Scoreboard elements
- Achievement badges (48x48)

### Audio
- Background music (3 tracks, chiptune style)
- SFX: bomb place, explosion, powerup, death, victory
- Menu sounds: select, confirm, cancel
```

**Deliverables**:
- Sprite sheets in PNG format
- Audio files in MP3/OGG
- Asset manifest JSON

---

### Stream D: Game Server Architecture
**Dependencies**: None
**Output**: Server design document and protocol spec

```markdown
## WebSocket Server Design

### Architecture
- Node.js with ws library (or uWebSockets.js for performance)
- Room-based architecture
- Authoritative server (anti-cheat)
- Tick rate: 20 Hz (50ms intervals)
- Client prediction with server reconciliation

### Message Protocol (JSON)
```typescript
// Client -> Server
type ClientMessage =
  | { type: 'join', roomCode: string, token: string }
  | { type: 'move', direction: 'up' | 'down' | 'left' | 'right', seq: number }
  | { type: 'stop', seq: number }
  | { type: 'bomb', seq: number }
  | { type: 'chat', content: string }
  | { type: 'ready' }
  | { type: 'ping', timestamp: number }

// Server -> Client
type ServerMessage =
  | { type: 'state', tick: number, players: Player[], bombs: Bomb[], powerups: Powerup[] }
  | { type: 'joined', playerId: string, roomState: RoomState }
  | { type: 'player_joined', player: Player }
  | { type: 'player_left', playerId: string }
  | { type: 'game_start', countdown: number }
  | { type: 'game_end', winner: string, stats: GameStats }
  | { type: 'explosion', x: number, y: number, radius: number }
  | { type: 'death', playerId: string, killerId: string }
  | { type: 'chat', senderId: string, content: string }
  | { type: 'pong', timestamp: number, serverTime: number }
  | { type: 'error', code: string, message: string }
```

### Room Lifecycle
1. Created (waiting for players)
2. Countdown (all ready, 3-2-1)
3. Playing (game active)
4. Intermission (between rounds)
5. Finished (final results)

### Anti-Cheat Measures
- Server-authoritative movement
- Input validation (rate limiting)
- Position verification
- Action cooldown enforcement
```

**Deliverables**:
- Architecture document
- Protocol specification
- State machine diagrams

---

### Stream E: Type Definitions
**Dependencies**: None
**Output**: Shared TypeScript types

```typescript
// types/game.ts
export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  clerkId: string;
  username: string;
  position: Position;
  direction: 'up' | 'down' | 'left' | 'right';
  isAlive: boolean;
  bombCount: number;
  maxBombs: number;
  explosionRadius: number;
  speed: number;
  powerups: PowerupType[];
  color: number; // 0-7
}

export interface Bomb {
  id: string;
  ownerId: string;
  position: Position;
  radius: number;
  fuseTime: number;
  plantedAt: number;
}

export interface Powerup {
  id: string;
  type: PowerupType;
  position: Position;
}

export type PowerupType =
  | 'bomb_up'
  | 'fire_up'
  | 'speed_up'
  | 'kick'
  | 'punch'
  | 'shield'
  | 'skull';

export interface Tile {
  type: 'empty' | 'wall' | 'block';
  powerup?: PowerupType;
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoints: Position[];
}

export interface GameState {
  tick: number;
  phase: 'waiting' | 'countdown' | 'playing' | 'intermission' | 'finished';
  map: GameMap;
  players: Map<string, Player>;
  bombs: Map<string, Bomb>;
  powerups: Map<string, Powerup>;
  explosions: Explosion[];
}

export interface RoomSettings {
  maxPlayers: number;
  roundTime: number;
  roundsToWin: number;
  mapId?: string;
  isPrivate: boolean;
  allowSpectators: boolean;
}

// types/api.ts
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  avatarUrl?: string;
  eloRating: number;
  totalWins: number;
  totalGames: number;
  winRate: number;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'registration' | 'active' | 'finished';
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  maxPlayers: number;
  currentPlayers: number;
  startsAt: Date;
  bracket?: TournamentBracket;
}
```

**Deliverables**:
- `/types/game.ts`
- `/types/api.ts`
- `/types/database.ts` (Supabase generated)
- `/types/websocket.ts`

---

### Stream F: CI/CD Setup
**Dependencies**: None
**Output**: Complete deployment pipelines

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy-frontend:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-game-server:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: game-server
```

**Deliverables**:
- GitHub Actions workflows
- `vercel.json` configuration
- `railway.json` configuration
- Environment variable templates

---

### Stream G: Documentation & CLAUDE.md
**Dependencies**: None
**Output**: Project documentation

```markdown
# CLAUDE.md for Bomberman Online

## Project Overview
Multiplayer Bomberman game with Next.js, PixiJS, Clerk auth, and Supabase.

## Architecture
- Frontend: Next.js 14 + PixiJS + Tailwind
- Backend: Supabase (data) + WebSocket server (gameplay)
- Auth: Clerk
- Deployment: Vercel + Railway

## Key Patterns

### Authentication Flow
1. User signs in via Clerk
2. Clerk webhook syncs to Supabase profiles
3. Game server validates Clerk JWT

### Real-time Game Flow
1. Client connects to WebSocket server
2. Server authenticates via Clerk token
3. Client joins room by code
4. Server broadcasts state at 20Hz
5. Client renders with interpolation

### Database Access
- Use Supabase client for all data operations
- RLS policies enforce access control
- Real-time subscriptions for lobby updates

## Commands
- `npm run dev` - Start development server
- `npm run server` - Start game server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run build` - Production build

## Environment Variables
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_GAME_SERVER_URL
- RAILWAY_TOKEN (deployment)

## File Structure
```
/app - Next.js pages
/components - React components
/game - PixiJS game engine
/server - WebSocket game server
/lib - Utilities and hooks
/types - TypeScript definitions
/assets - Sprites and audio
```

## Agent Instructions
1. Always use TypeScript strict mode
2. Follow existing patterns for similar features
3. Use Supabase for persistence, WebSocket for real-time
4. Test changes locally before committing
5. Update this CLAUDE.md when adding new patterns
```

**Deliverables**:
- `CLAUDE.md` (agent instructions)
- `README.md` (project overview)
- `CONTRIBUTING.md` (contribution guide)
- API documentation

---

## Phase 2: Core Systems (Level 1)

### Maximum Parallelization: 5 Concurrent Workers

---

### Stream H: Authentication Layer
**Dependencies**: A, B, E
**Output**: Complete Clerk + Supabase auth integration

```markdown
## Tasks:
1. Install and configure Clerk for Next.js
2. Create middleware for protected routes
3. Setup Clerk webhook for Supabase sync
4. Create auth context and hooks
5. Build sign-in/sign-up pages
6. Implement user profile management
7. Add avatar upload to Supabase storage
8. Create auth utilities for game server
```

**Key Files**:
- `/middleware.ts`
- `/app/sign-in/[[...sign-in]]/page.tsx`
- `/app/sign-up/[[...sign-up]]/page.tsx`
- `/app/api/webhooks/clerk/route.ts`
- `/lib/auth.ts`
- `/hooks/useAuth.ts`

---

### Stream I: Game Engine Core
**Dependencies**: A, C, E
**Output**: PixiJS game renderer and core systems

```markdown
## Tasks:
1. Setup PixiJS with Next.js (dynamic import)
2. Create asset loading system
3. Implement sprite management
4. Build tile-based rendering
5. Create animation system
6. Implement input handling (keyboard + touch)
7. Build game loop with fixed timestep
8. Create camera/viewport system
9. Implement particle effects for explosions
```

**Key Files**:
- `/game/engine/Game.ts`
- `/game/engine/AssetLoader.ts`
- `/game/engine/SpriteManager.ts`
- `/game/engine/AnimationController.ts`
- `/game/engine/InputHandler.ts`
- `/game/engine/Renderer.ts`
- `/game/engine/ParticleSystem.ts`

---

### Stream J: Game Server Implementation
**Dependencies**: D, E
**Output**: WebSocket game server

```markdown
## Tasks:
1. Setup Node.js WebSocket server
2. Implement room management
3. Create game state machine
4. Build authoritative movement system
5. Implement bomb placement and explosions
6. Create power-up spawning system
7. Build collision detection
8. Implement death and respawn logic
9. Add spectator support
10. Create replay recording system
```

**Key Files**:
- `/server/index.ts`
- `/server/Room.ts`
- `/server/GameState.ts`
- `/server/Player.ts`
- `/server/Physics.ts`
- `/server/ReplayRecorder.ts`

---

### Stream K: Database Access Layer
**Dependencies**: A, B, E
**Output**: Supabase client and data hooks

```markdown
## Tasks:
1. Configure Supabase client
2. Generate TypeScript types from schema
3. Create data access functions
4. Build React Query hooks for data fetching
5. Implement real-time subscriptions
6. Create optimistic updates
7. Build caching layer
```

**Key Files**:
- `/lib/supabase/client.ts`
- `/lib/supabase/server.ts`
- `/lib/supabase/types.ts`
- `/hooks/useProfile.ts`
- `/hooks/useLeaderboard.ts`
- `/hooks/useMaps.ts`
- `/hooks/useGames.ts`

---

### Stream L: UI Component Library
**Dependencies**: A, C
**Output**: Retro-styled React components

```markdown
## Tasks:
1. Create base button component (pixel style)
2. Build input fields with retro styling
3. Create modal/dialog system
4. Build navigation components
5. Create loading spinners (pixel animated)
6. Build toast notifications
7. Create card components
8. Build table/list components
9. Create form components
10. Build responsive layout components
```

**Key Files**:
- `/components/ui/Button.tsx`
- `/components/ui/Input.tsx`
- `/components/ui/Modal.tsx`
- `/components/ui/Card.tsx`
- `/components/ui/Toast.tsx`
- `/components/ui/Spinner.tsx`
- `/components/layout/Navbar.tsx`
- `/components/layout/Sidebar.tsx`

---

## Phase 3: Feature Layer A (Level 2)

### Maximum Parallelization: 5 Concurrent Workers

---

### Stream M: Lobby System
**Dependencies**: H, J, K, L
**Output**: Room creation and joining

```markdown
## Features:
- Create room with settings
- Generate shareable room codes
- Join by code or browse public rooms
- Room settings (map, time, max players)
- Ready/unready system
- Host controls (kick, start)
- Real-time player list updates
```

---

### Stream N: Core Gameplay Integration
**Dependencies**: I, J
**Output**: Fully playable game

```markdown
## Features:
- Player movement synchronization
- Bomb placement and chain explosions
- Power-up collection and effects
- Death animations and respawn
- Win condition detection
- Round management
- Score tracking
```

---

### Stream O: Leaderboards
**Dependencies**: H, K, L
**Output**: Global rankings system

```markdown
## Features:
- Global ELO leaderboard
- Time-based filters (daily/weekly/monthly/all-time)
- Multiple stat leaderboards (wins, kills, games)
- Rank badges and tiers
- Personal ranking display
- Leaderboard pagination
```

---

### Stream P: User Profiles
**Dependencies**: H, K, L
**Output**: Profile pages and stats

```markdown
## Features:
- Profile page with stats
- Match history
- Achievement showcase
- Avatar customization
- Username changes
- Privacy settings
```

---

### Stream Q: Chat System
**Dependencies**: H, J, L
**Output**: In-game communication

```markdown
## Features:
- Lobby text chat
- In-game quick chat
- Emoji support
- Profanity filter
- Mute players
- Chat history
```

---

## Phase 4: Feature Layer B (Level 3)

### Maximum Parallelization: 5 Concurrent Workers

---

### Stream R: Matchmaking
**Dependencies**: M, N, O
**Output**: Automatic match finding

```markdown
## Features:
- Queue system with ELO-based matching
- Match formation algorithm
- Queue time estimates
- Rank-based tiers (Bronze to Diamond)
- Region preferences
- Party queue support
```

---

### Stream S: Spectator Mode
**Dependencies**: N, Q
**Output**: Watch live games

```markdown
## Features:
- Join as spectator
- Free camera movement
- Player focus mode
- Spectator chat
- Live game browser
- Delay for competitive integrity
```

---

### Stream T: Achievements/Badges
**Dependencies**: N, O, P
**Output**: Achievement system

```markdown
## Features:
- 50+ achievements across categories
- Progress tracking
- Unlock notifications
- Rarity tiers
- Profile badges
- Achievement showcase
```

---

### Stream U: Replay System
**Dependencies**: N, K
**Output**: Game recording and playback

```markdown
## Features:
- Automatic game recording
- Replay storage in Supabase
- Playback controls (pause, speed, seek)
- Download replays
- Share replay links
- Highlight detection
```

---

### Stream V: Map Editor
**Dependencies**: I, K, L
**Output**: Custom map creation

```markdown
## Features:
- Visual tile editor
- Spawn point placement
- Map validation
- Save to Supabase
- Browse community maps
- Rate and favorite maps
- Map versioning
```

---

## Phase 5: Premium Features (Level 4)

### Maximum Parallelization: 2 Concurrent Workers

---

### Stream W: Tournament Mode
**Dependencies**: R, T, U
**Output**: Competitive tournament system

```markdown
## Features:
- Tournament creation
- Registration system
- Bracket generation (single/double elim)
- Match scheduling
- Live bracket updates
- Tournament history
- Prize distribution tracking
```

---

### Stream X: Social Features
**Dependencies**: P, T, Q
**Output**: Social connectivity

```markdown
## Features:
- Friends list
- Friend requests
- Party system
- Invite to game
- Online status
- Activity feed
- Notifications
```

---

## Phase 6: Integration & Deployment (Level 5)

### Maximum Parallelization: 3 Concurrent Workers

---

### Stream Y: Full Integration
**Dependencies**: ALL previous
**Output**: Polished, complete game

```markdown
## Tasks:
- Cross-feature integration testing
- Performance optimization
- Memory leak fixes
- Edge case handling
- Error boundaries
- Fallback states
- Loading states
- Mobile optimization
```

---

### Stream Z: Testing Suite
**Dependencies**: ALL previous
**Output**: Comprehensive test coverage

```markdown
## Tasks:
- Unit tests for game logic
- Integration tests for API
- E2E tests with Playwright
- Load testing for game server
- Security audit
- Accessibility testing
```

---

### Stream AA: Production Deployment
**Dependencies**: Y, Z
**Output**: Live production environment

```markdown
## Tasks:
- Vercel production setup
- Railway production setup
- Domain configuration
- SSL certificates
- Monitoring (Sentry, LogRocket)
- Analytics (Posthog)
- Backup configuration
- Launch checklist
```

---

## Execution Timeline

```
Week 1: Phase 1 (Foundation) - 7 parallel workers
Week 2: Phase 2 (Core Systems) - 5 parallel workers
Week 3: Phase 3 (Feature Layer A) - 5 parallel workers
Week 4: Phase 4 (Feature Layer B) - 5 parallel workers
Week 5: Phase 5 (Premium Features) - 2 parallel workers
Week 6: Phase 6 (Integration & Deploy) - 3 parallel workers
```

**Total Duration**: ~6 weeks with maximum parallelization
**Total Work Streams**: 27
**Maximum Concurrent Workers**: 7

---

## Risk Mitigation

1. **WebSocket scalability**: Use Redis pub/sub for multi-server
2. **Asset loading**: Implement progressive loading and caching
3. **Latency**: Client-side prediction with server reconciliation
4. **Security**: Server-authoritative game state, rate limiting
5. **Cost**: Monitor Supabase and Railway usage

---

## Success Metrics

- [ ] 60 FPS gameplay on mid-range devices
- [ ] <100ms average latency for gameplay
- [ ] <3s initial load time
- [ ] 99.9% uptime
- [ ] Support 100 concurrent games
- [ ] All 27 streams completed
