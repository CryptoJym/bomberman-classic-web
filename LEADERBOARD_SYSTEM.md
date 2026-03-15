# Leaderboard System Documentation

Complete implementation of the ELO-based leaderboard system for Bomberman Online.

## Overview

The leaderboard system provides:
- **ELO Rating System** - Standard ELO algorithm for skill-based matchmaking
- **Multiple Leaderboard Types** - Rating, Wins, Kills, Games Played, Win Streaks
- **Time Filters** - Daily, Weekly, Monthly, All-Time rankings
- **Rank Tiers** - 7 tiers from Bronze to Grandmaster
- **Real-time Updates** - Live leaderboard updates
- **Player Stats** - Detailed statistics and rank progression

## Architecture

### 1. ELO System (`/lib/elo/`)

#### Calculator (`calculator.ts`)
- `calculateNewElo()` - Calculate ELO change for 1v1 matches
- `calculateMultiplayerElo()` - ELO changes for 2-4 player games
- `calculateExpectedScore()` - Win probability calculation
- K-factors: 40 (new), 32 (standard), 24 (expert), 16 (elite)

#### Ranks (`ranks.ts`)
- 7 rank tiers with ELO thresholds:
  - Bronze: 0-1099
  - Silver: 1100-1299
  - Gold: 1300-1499
  - Platinum: 1500-1699
  - Diamond: 1700-1899
  - Master: 1900-2099
  - Grandmaster: 2100+
- `getRankFromElo()` - Convert ELO to rank tier
- `calculateRankProgress()` - Progress to next rank

#### Matchmaking (`matchmaking.ts`)
- `findBestMatch()` - Find compatible opponents
- `calculateMatchQuality()` - Match fairness score
- `createBalancedTeams()` - Team balancing for multiplayer
- Expanding search range over queue time

### 2. Components (`/components/leaderboard/`)

#### Core Components
- **`Leaderboard.tsx`** - Main leaderboard with filtering and pagination
- **`LeaderboardEntry.tsx`** - Individual player row with stats
- **`LeaderboardFilters.tsx`** - Time filter buttons
- **`LeaderboardTabs.tsx`** - Category tabs
- **`RankBadge.tsx`** - Rank tier badge with icon
- **`RankProgress.tsx`** - Progress bar to next rank

#### Features
- SNES retro pixel styling
- Medal icons for top 3 players
- Rank change indicators (▲/▼)
- Country flags
- Loading states
- Empty states
- Responsive design

### 3. API Routes (`/app/api/`)

#### `/api/leaderboard` (GET)
Fetch leaderboard with filters
```typescript
Query Parameters:
- page: number (1-indexed)
- limit: number (max 100)
- type: 'elo' | 'wins' | 'kills' | 'games' | 'win_streak'
- timeFilter: 'daily' | 'weekly' | 'monthly' | 'all_time'
- rankTier?: RankTier
- country?: string

Response:
{
  success: true,
  data: {
    type: LeaderboardType,
    timeFilter: LeaderboardTimeFilter,
    entries: LeaderboardEntry[],
    pagination: PaginationMeta,
    currentUserEntry?: LeaderboardEntry,
    lastUpdated: string
  }
}
```

#### `/api/leaderboard/[userId]` (GET)
Get specific player's rank info
```typescript
Response:
{
  success: true,
  data: {
    entry: LeaderboardEntry,
    globalRank: number,
    tierRank: number,
    percentile: number
  }
}
```

#### `/api/stats` (GET)
Get player statistics
```typescript
Query Parameters:
- userId?: string (defaults to authenticated user)

Response:
{
  success: true,
  data: {
    playerId: string,
    allTime: StatPeriod,
    season: StatPeriod,
    weekly: StatPeriod,
    bestWinStreak: number,
    currentWinStreak: number,
    avgGameDuration: number,
    powerupStats: Record<string, number>
  }
}
```

### 4. Pages (`/app/(main)/leaderboard/`)

#### `/leaderboard` (Main Page)
- Full leaderboard with all filters
- Current user stats card
- Rank progress visualization
- Info cards (How ELO Works, Rank Tiers, Season Info)

#### `/leaderboard/[type]` (Dynamic Route)
- Specific leaderboard type view
- Valid types: elo, wins, kills, games, win_streak
- Time filters only (type is fixed)

### 5. Hooks (`/lib/hooks/`)

#### `useLeaderboard()`
Already exists in the project with React Query integration
```typescript
const {
  data,
  isLoading,
  error,
  refetch
} = useLeaderboard({
  limit: 50,
  offset: 0,
  sortBy: 'elo_rating'
});
```

#### `usePlayerRank()`
Already exists for fetching player rank
```typescript
const {
  data,
  isLoading,
  error,
  refetch
} = usePlayerRank(playerId);
```

## Usage Examples

### Display Leaderboard
```tsx
import { Leaderboard } from '@/components/leaderboard';

function MyPage() {
  const [type, setType] = useState<LeaderboardType>('elo');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [page, setPage] = useState(1);

  return (
    <Leaderboard
      entries={entries}
      type={type}
      timeFilter={timeFilter}
      page={page}
      totalPages={10}
      onTypeChange={setType}
      onTimeFilterChange={setTimeFilter}
      onPageChange={setPage}
    />
  );
}
```

### Show Rank Badge
```tsx
import { RankBadge } from '@/components/leaderboard';

<RankBadge
  tier="diamond"
  size="md"
  showName
  showGlow
/>
```

### Display Rank Progress
```tsx
import { RankProgress } from '@/components/leaderboard';

<RankProgress
  elo={1750}
  detailed
/>
```

### Calculate ELO Changes
```tsx
import { calculateMultiplayerElo } from '@/lib/elo';

const results = [
  { playerId: '1', currentElo: 1500, placement: 1, totalGames: 50 },
  { playerId: '2', currentElo: 1600, placement: 2, totalGames: 75 },
  { playerId: '3', currentElo: 1400, placement: 3, totalGames: 30 },
  { playerId: '4', currentElo: 1550, placement: 4, totalGames: 60 },
];

const changes = calculateMultiplayerElo(results);
// Returns ELO changes for all players
```

### Find Matchmaking Partner
```tsx
import { findBestMatch } from '@/lib/elo';

const player = {
  playerId: '1',
  username: 'Player1',
  eloRating: 1500,
  rankTier: 'platinum',
  totalGames: 50,
  queueTime: 5000
};

const pool = [...]; // Other waiting players

const match = findBestMatch(player, pool);
// Returns best matched players
```

## Styling

All components use SNES-inspired retro pixel styling:
- **Fonts**: Press Start 2P (pixel), VT323 (retro)
- **Colors**: Bomberman character colors, rank tier colors
- **Effects**: Pixel shadows, glow effects, scanlines
- **Animations**: Smooth transitions, hover effects

## Database Integration

The system integrates with existing Supabase queries:
- `getLeaderboard()` - Main leaderboard query
- `getPlayerRank()` - Player rank position
- `updateElo()` - Update player ELO after games
- `getRecentEloChanges()` - ELO history

## Future Enhancements

Potential additions:
1. **Seasonal Leaderboards** - Separate seasonal rankings
2. **Country Leaderboards** - Regional rankings
3. **Friend Rankings** - Compare with friends
4. **Achievement Integration** - Rank-based achievements
5. **ELO History Chart** - Visual ELO progression
6. **Live Updates** - Real-time rank changes via WebSocket
7. **Decay System** - ELO decay for inactive players
8. **Provisional Ratings** - Special handling for new players

## Testing

To test the leaderboard system:

1. **View Leaderboard**: Navigate to `/leaderboard`
2. **Filter by Type**: Click category tabs (Rating, Wins, Kills, etc.)
3. **Time Filters**: Select Daily, Weekly, Monthly, or All-Time
4. **Pagination**: Navigate through pages
5. **Player Profile**: Click on any player to view their profile
6. **Rank Progress**: Check your rank progress if logged in

## Performance

- **Caching**: API responses cached for 1 minute
- **Pagination**: Max 100 entries per request
- **Indexing**: Database indexes on elo_rating, total_wins, total_kills
- **Lazy Loading**: Components load progressively
- **Optimistic Updates**: Immediate UI feedback

## Security

- **Authentication**: Clerk integration for user verification
- **Rate Limiting**: API rate limits to prevent abuse
- **Input Validation**: All inputs validated and sanitized
- **RLS Policies**: Supabase Row Level Security enabled
- **CORS**: Restricted to same-origin requests

## Troubleshooting

### Leaderboard not loading
- Check API route is accessible
- Verify Supabase connection
- Check browser console for errors

### Rank not updating
- Ensure game results are being recorded
- Check ELO calculation in game server
- Verify database triggers are working

### Performance issues
- Reduce page size (limit parameter)
- Enable pagination
- Check database query performance

## Files Created

```
/lib/elo/
├── calculator.ts       # ELO calculation logic
├── ranks.ts           # Rank tiers and thresholds
├── matchmaking.ts     # Matchmaking algorithms
└── index.ts          # Main exports

/components/leaderboard/
├── Leaderboard.tsx           # Main component
├── LeaderboardEntry.tsx      # Player row
├── LeaderboardFilters.tsx    # Time filters
├── LeaderboardTabs.tsx       # Category tabs
├── RankBadge.tsx            # Rank badge
├── RankProgress.tsx         # Progress bar
└── index.ts                 # Component exports

/app/api/
├── leaderboard/
│   ├── route.ts              # GET leaderboard
│   └── [userId]/route.ts     # GET player rank
└── stats/
    └── route.ts              # GET player stats

/app/(main)/leaderboard/
├── page.tsx                  # Main leaderboard page
└── [type]/
    └── page.tsx             # Dynamic type page
```

## Summary

The leaderboard system is now fully implemented with:
- Complete ELO rating system
- 6 reusable React components
- 3 API routes
- 2 pages (main + dynamic)
- Full TypeScript support
- SNES retro styling
- Responsive design
- Loading and error states
- Pagination
- Multiple filters

The system is ready for production use and integrates seamlessly with the existing Bomberman Online infrastructure.
