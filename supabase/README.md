# Supabase Database Setup

This directory contains all database migrations, RLS policies, functions, and seed data for Bomberman Online.

## Directory Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Core tables and indexes
│   ├── 002_rls_policies.sql      # Row Level Security policies
│   └── 003_functions.sql         # Stored procedures and functions
├── seed.sql                      # Achievement and map seed data
└── README.md                     # This file
```

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link to your project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Run migrations

```bash
supabase db push
```

### 4. Seed data

```bash
supabase db seed
```

Or manually:
```bash
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase/seed.sql
```

## TypeScript Type Generation

Generate TypeScript types from your Supabase schema:

```bash
# Install the Supabase CLI types generator
npm install --save-dev supabase

# Generate types (add to package.json scripts)
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/types.ts
```

### Add to package.json

```json
{
  "scripts": {
    "db:generate": "supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/types.ts",
    "db:migrate": "supabase db push",
    "db:seed": "supabase db seed",
    "db:reset": "supabase db reset"
  }
}
```

### Using Generated Types

```typescript
import { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// With Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles synced from Clerk |
| `games` | Game session records |
| `game_players` | Players in games with stats |
| `maps` | Custom and official maps |
| `achievements` | Achievement definitions |
| `player_achievements` | Unlocked achievements |
| `replays` | Recorded game data |
| `tournaments` | Tournament definitions |
| `tournament_participants` | Tournament players |
| `friendships` | Friend relationships |
| `chat_messages` | In-game chat |
| `notifications` | User notifications |
| `matchmaking_queue` | Matchmaking system |

### Key Functions

| Function | Description |
|----------|-------------|
| `update_elo(winner, loser)` | Update ELO ratings after 1v1 |
| `update_elo_multiplayer(game_id)` | Update ELO for multiplayer games |
| `get_leaderboard(limit, offset, filter, sort)` | Efficient leaderboard query |
| `get_player_rank(player_id)` | Get player's global and tier rank |
| `match_players(player_ids[])` | Create matched game from queue |
| `create_game_room(host_id, settings)` | Create new game room |
| `join_game_by_code(code, player_id)` | Join game by room code |
| `check_achievements(player_id)` | Check and unlock achievements |

### RLS Policies Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | Public | Own | Own | - |
| maps | Public (published) | Auth | Own | Own |
| games | Participants | Auth | Host | Host (waiting) |
| game_players | Participants | Self | Self | Self (waiting) |
| achievements | Public | - | - | - |
| player_achievements | Public | System | Self | - |
| tournaments | Public | Auth | Creator | Creator (draft) |
| friendships | Involved | Self | Involved | Involved |
| chat_messages | Context | Auth | - | - |
| notifications | Own | System | Own | Own |

## Development

### Reset Database

```bash
supabase db reset
```

This will:
1. Drop all tables
2. Run all migrations
3. Run seed data

### Add New Migration

```bash
# Create new migration file
touch supabase/migrations/004_new_feature.sql

# Edit and add your SQL
# Then push to database
supabase db push
```

### Testing Locally

```bash
# Start local Supabase
supabase start

# Run migrations on local
supabase db reset

# Stop local Supabase
supabase stop
```

## Indexes

All foreign keys and frequently queried columns are indexed:

- `profiles.clerk_id` - Clerk authentication lookup
- `profiles.elo_rating` - Leaderboard sorting
- `games.status` - Finding active games
- `games.room_code` - Room code lookup
- `game_players.game_id` - Game participant lookup
- `game_players.player_id` - Player history lookup
- And many more...

## Performance Notes

1. **Leaderboard queries** use the `get_leaderboard()` function for optimized pagination
2. **ELO calculations** use K-factor that varies based on rating and experience
3. **Achievement checks** are batched and run after game completion
4. **Matchmaking** uses ELO range that expands over time for faster matches

## Security Notes

1. All tables have RLS enabled
2. Service role bypasses RLS for server operations
3. Users can only modify their own data
4. System-only operations (achievements, notifications) are INSERT restricted
5. Clerk JWT `sub` claim is used for user identification
