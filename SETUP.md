# Bomberman Online - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Clerk account
- Git

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Bomberman
npm install
```

### 2. Set Up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your API keys
4. In Clerk Dashboard, go to **Webhooks**
5. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
6. Subscribe to: `user.created`, `user.updated`, `user.deleted`
7. Copy the webhook secret

### 3. Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **SQL Editor**
4. Open `supabase/schema.sql` from this project
5. Copy and paste the entire schema into SQL Editor
6. Run the SQL query
7. Go to **Settings > API** and copy your keys

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual keys:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Run Database Migrations (Alternative Method)

If you prefer using Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Bomberman/
├── app/                    # Next.js 14 app directory
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── (main)/            # Main app routes (lobby, profile, leaderboard)
│   ├── (game)/            # Game routes (play, spectate)
│   └── api/               # API routes
├── components/            # React components
│   ├── lobby/            # Lobby & matchmaking
│   ├── game/             # Game UI
│   ├── chat/             # Chat system
│   ├── profile/          # User profiles
│   ├── leaderboard/      # Rankings
│   └── ui/               # Base UI components
├── game/                  # Game engine
│   ├── engine/           # Core game loop
│   ├── entities/         # Game entities
│   ├── systems/          # ECS systems
│   ├── logic/            # Game rules
│   └── network/          # Multiplayer
├── lib/                   # Utilities
│   ├── supabase/         # Database queries
│   ├── hooks/            # React hooks
│   ├── elo/              # Ranking system
│   └── chat/             # Chat utilities
├── supabase/             # Database schema
│   ├── schema.sql        # Full schema
│   └── migrations/       # Migration files
└── public/               # Static assets
```

## Key Features

- **Authentication**: Clerk for user management
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime + WebSockets
- **ELO System**: Competitive ranking
- **Chat**: Real-time messaging with emotes
- **Game Engine**: Canvas-based multiplayer Bomberman
- **Tournaments**: Competitive brackets
- **Achievements**: Unlock system

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add environment variables from `.env.example`
4. Deploy

### Environment Variables in Production

Make sure to set all environment variables in your deployment platform:
- All Clerk keys
- All Supabase keys
- Game server URL (WebSocket endpoint)

## Database Schema Overview

### Core Tables

- `profiles` - User profiles with stats
- `matches` - Game history
- `match_participants` - Player performance per match
- `achievements` - Available achievements
- `user_achievements` - User progress
- `friendships` - Social connections
- `tournaments` - Competitive events
- `rooms` - Active game lobbies
- `chat_messages` - In-game chat
- `maps` - Game maps

### Key Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Automatic Stats Tracking**: Triggers update stats after matches
- **ELO Rating System**: Built-in rating adjustments
- **Leaderboard View**: Optimized rankings query

## Troubleshooting

### Build Errors

If you get TypeScript errors:
```bash
npm run lint:fix
```

### Database Connection Issues

1. Check Supabase project is running
2. Verify API keys in `.env.local`
3. Check RLS policies in Supabase Dashboard

### Clerk Webhook Not Working

1. Verify webhook URL is correct
2. Check webhook secret matches `.env.local`
3. Test webhook in Clerk Dashboard

### Game Server Connection Failed

1. Ensure WebSocket server is running
2. Check `NEXT_PUBLIC_GAME_SERVER_URL` in env
3. Verify firewall/CORS settings

## Next Steps

1. **Set up game assets**: Add sprites, sounds, maps to `public/`
2. **Configure game server**: Set up WebSocket server for multiplayer
3. **Test features**: Try lobby, matchmaking, and gameplay
4. **Customize**: Adjust game rules, maps, and UI themes

## Support

For issues or questions:
- Check `README.md` for additional documentation
- Review Supabase logs for database errors
- Check browser console for client errors

## License

MIT
