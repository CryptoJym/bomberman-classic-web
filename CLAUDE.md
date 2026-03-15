# CLAUDE.md - Bomberman Online Multiplayer

## Project Overview

A full-featured multiplayer Bomberman game with SNES-style graphics, featuring:
- **Clerk** authentication
- **Supabase** database and real-time
- **Next.js 14** frontend with **PixiJS** game engine
- **WebSocket** dedicated game server on Railway
- Leaderboards, matchmaking, spectator mode, chat, map editor, achievements, tournaments, replays

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Game Engine | PixiJS 8.x |
| Styling | Tailwind CSS 3.x |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| Real-time Data | Supabase Realtime |
| Game Server | Node.js + ws (WebSocket) |
| Deployment | Vercel (frontend) + Railway (game server) |

## Project Structure

```
/Users/jamesbrady/Bomberman/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Auth routes (sign-in, sign-up)
│   ├── (game)/              # Game routes (play, spectate)
│   ├── (main)/              # Main app routes (lobby, profile, leaderboard)
│   ├── api/                 # API routes
│   │   ├── webhooks/        # Clerk webhooks
│   │   └── trpc/            # tRPC endpoints (if used)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── game/                # Game-specific components
│   ├── lobby/               # Lobby components
│   ├── profile/             # Profile components
│   ├── tournament/          # Tournament components
│   ├── ui/                  # Base UI components (Button, Input, Modal)
│   └── layout/              # Layout components (Navbar, Sidebar)
├── game/                    # PixiJS game engine
│   ├── engine/              # Core engine systems
│   │   ├── Game.ts          # Main game class
│   │   ├── AssetLoader.ts   # Sprite/audio loading
│   │   ├── Renderer.ts      # PixiJS rendering
│   │   ├── InputHandler.ts  # Keyboard/touch input
│   │   └── ParticleSystem.ts
│   ├── entities/            # Game entities
│   │   ├── Player.ts
│   │   ├── Bomb.ts
│   │   ├── Powerup.ts
│   │   └── Tile.ts
│   ├── systems/             # ECS-style systems
│   │   ├── MovementSystem.ts
│   │   ├── CollisionSystem.ts
│   │   └── ExplosionSystem.ts
│   └── network/             # Client networking
│       ├── GameClient.ts
│       ├── StateInterpolation.ts
│       └── InputPrediction.ts
├── server/                  # WebSocket game server
│   ├── index.ts             # Server entry point
│   ├── Room.ts              # Room management
│   ├── GameState.ts         # Authoritative game state
│   ├── Player.ts            # Server-side player
│   ├── Physics.ts           # Server physics
│   ├── Matchmaking.ts       # Matchmaking queue
│   └── ReplayRecorder.ts    # Replay system
├── lib/                     # Shared utilities
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── types.ts         # Generated types
│   ├── clerk/
│   │   └── auth.ts          # Auth utilities
│   ├── hooks/               # React hooks
│   └── utils/               # General utilities
├── types/                   # TypeScript definitions
│   ├── game.ts              # Game types
│   ├── api.ts               # API types
│   ├── websocket.ts         # WS message types
│   └── database.ts          # Supabase types
├── assets/                  # Static assets
│   ├── sprites/             # Sprite sheets
│   ├── audio/               # Sound effects and music
│   └── fonts/               # Pixel fonts
├── public/                  # Public static files
├── supabase/
│   ├── migrations/          # Database migrations
│   └── seed.sql             # Seed data
├── .github/
│   └── workflows/           # CI/CD pipelines
├── CLAUDE.md                # This file
├── PLAN.md                  # Orchestration plan
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env.example
```

## Key Patterns

### 1. Authentication Flow

```typescript
// middleware.ts - Protect routes with Clerk
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

// Webhook to sync Clerk users to Supabase
// app/api/webhooks/clerk/route.ts
export async function POST(req: Request) {
  const payload = await req.json();
  if (payload.type === 'user.created') {
    await supabase.from('profiles').insert({
      clerk_id: payload.data.id,
      username: payload.data.username,
      // ...
    });
  }
}
```

### 2. Game State Synchronization

```typescript
// Client receives state from server
gameClient.on('state', (state: GameState) => {
  // Interpolate between server states for smooth rendering
  stateBuffer.push({ state, timestamp: Date.now() });

  // Reconcile with predicted input
  if (state.lastProcessedInput) {
    inputPredictor.reconcile(state.lastProcessedInput);
  }
});

// Client sends input to server
const sendInput = (input: PlayerInput) => {
  const seq = inputPredictor.predict(input);
  gameClient.send({ type: 'input', ...input, seq });
};
```

### 3. Supabase Real-time for Lobby

```typescript
// Subscribe to lobby updates
const channel = supabase
  .channel('lobby:' + roomId)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${roomId}` },
    (payload) => {
      // Update local state
      setPlayers(current => updatePlayers(current, payload));
    }
  )
  .subscribe();
```

### 4. PixiJS Game Rendering

```typescript
// game/engine/Game.ts
export class BombermanGame {
  private app: Application;
  private renderer: GameRenderer;
  private inputHandler: InputHandler;

  async init(container: HTMLElement) {
    this.app = new Application();
    await this.app.init({
      width: 480, // 15 tiles * 32px
      height: 416, // 13 tiles * 32px
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    await this.loadAssets();
    this.startGameLoop();
  }

  private startGameLoop() {
    this.app.ticker.add((delta) => {
      this.update(delta.deltaMS);
      this.render();
    });
  }
}
```

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server (port 3000)
npm run server        # Start game server (port 8080)
npm run dev:all       # Start both concurrently

# Building
npm run build         # Build Next.js for production
npm run build:server  # Build game server

# Testing
npm run test          # Run unit tests
npm run test:e2e      # Run Playwright E2E tests
npm run test:load     # Run load tests

# Linting
npm run lint          # ESLint
npm run type-check    # TypeScript check

# Database
npm run db:generate   # Generate Supabase types
npm run db:migrate    # Run migrations
npm run db:seed       # Seed data

# Deployment
npm run deploy        # Deploy via CI/CD
```

## Environment Variables

```bash
# .env.local

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Game Server
NEXT_PUBLIC_GAME_SERVER_URL=wss://bomberman-server.railway.app
GAME_SERVER_PORT=8080

# Railway (for game server deployment)
RAILWAY_TOKEN=xxx
```

## Agent Instructions

### General Rules

1. **TypeScript Strict Mode**: All code must pass strict TypeScript checks
2. **No `any` Types**: Use proper typing, create interfaces as needed
3. **Consistent Naming**:
   - Components: PascalCase (PlayerCard.tsx)
   - Hooks: camelCase with use prefix (useGameState.ts)
   - Utils: camelCase (formatTime.ts)
   - Types: PascalCase (GameState, PlayerInput)
4. **File Organization**: Place files in their designated folders per structure above
5. **Error Handling**: Always handle errors, use error boundaries in React
6. **Comments**: Add JSDoc comments for public APIs, complex logic

### Game Development Rules

1. **Server Authority**: The game server is authoritative - never trust client state
2. **Tick Rate**: Server runs at 20Hz (50ms ticks), client renders at 60 FPS
3. **Input Prediction**: Client predicts input locally, reconciles with server
4. **State Interpolation**: Render between two server states for smoothness
5. **Network Protocol**: Use defined message types from `/types/websocket.ts`

### Supabase Rules

1. **RLS Policies**: All tables must have appropriate RLS policies
2. **Generated Types**: Always regenerate types after schema changes
3. **Migrations**: Use migrations for all schema changes, never modify directly
4. **Indexes**: Add indexes for frequently queried columns

### Clerk Rules

1. **Protected Routes**: Use middleware for route protection
2. **Webhooks**: Sync user data to Supabase via webhooks
3. **JWT Validation**: Game server validates Clerk JWTs for auth

### UI/UX Rules

1. **SNES Aesthetic**: Maintain retro pixel art style throughout
2. **Responsive**: Support desktop and mobile (touch controls)
3. **Accessibility**: Include keyboard navigation, proper contrast
4. **Loading States**: Show appropriate loading indicators
5. **Error States**: Display user-friendly error messages

## Feature Flags

```typescript
// lib/features.ts
export const features = {
  TOURNAMENTS: process.env.NEXT_PUBLIC_FF_TOURNAMENTS === 'true',
  REPLAYS: process.env.NEXT_PUBLIC_FF_REPLAYS === 'true',
  MAP_EDITOR: process.env.NEXT_PUBLIC_FF_MAP_EDITOR === 'true',
  SPECTATOR: process.env.NEXT_PUBLIC_FF_SPECTATOR === 'true',
};
```

## Testing Strategy

1. **Unit Tests**: Jest for game logic and utilities
2. **Component Tests**: React Testing Library for UI
3. **E2E Tests**: Playwright for critical user flows
4. **Load Tests**: Artillery for game server capacity

## Performance Targets

- Initial load: < 3 seconds
- Game FPS: 60 FPS steady
- Network latency: < 100ms (game server)
- Time to interactive: < 2 seconds

## Deployment Checklist

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Environment variables set in Vercel/Railway
- [ ] Database migrations applied
- [ ] Clerk webhooks configured
- [ ] SSL certificates valid
- [ ] Monitoring configured (Sentry)

## Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [PixiJS Docs](https://pixijs.com/guides)
- [Clerk Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [Supabase Docs](https://supabase.com/docs)
- [WebSocket Best Practices](https://websocket.org/guides/best-practices)

---

**Remember**: When in doubt, refer to this file. Keep it updated as patterns evolve.
