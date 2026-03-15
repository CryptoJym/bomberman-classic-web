# Environment Setup Guide

This guide walks you through setting up all the external services and local development environment for Bomberman Online.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clerk Setup](#clerk-setup)
- [Supabase Setup](#supabase-setup)
- [Local Development](#local-development)
- [Game Server Setup](#game-server-setup)
- [Deployment](#deployment)

---

## Prerequisites

### Required Software

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm 10+** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Recommended Tools

- **VS Code** - [Download](https://code.visualstudio.com/)
  - Extensions: ESLint, Prettier, Tailwind CSS IntelliSense
- **Supabase CLI** - `npm install -g supabase`

### Accounts Needed

- [GitHub](https://github.com) account
- [Clerk](https://clerk.com) account (free tier available)
- [Supabase](https://supabase.com) account (free tier available)
- [Vercel](https://vercel.com) account (for frontend deployment)
- [Railway](https://railway.app) account (for game server deployment)

---

## Clerk Setup

Clerk handles all authentication for the application.

### Step 1: Create Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **"Add application"**
3. Enter application name: `Bomberman Online`
4. Select sign-in methods:
   - ✅ Email
   - ✅ Google (recommended)
   - ✅ Discord (optional, good for gamers)
   - ✅ GitHub (optional, for developers)
5. Click **"Create application"**

### Step 2: Get API Keys

1. In your Clerk application, go to **API Keys**
2. Copy the following:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_test_xxx or pk_live_xxx)
   - `CLERK_SECRET_KEY` (sk_test_xxx or sk_live_xxx)

### Step 3: Configure Webhooks

Webhooks sync Clerk users to Supabase.

1. Go to **Webhooks** in Clerk Dashboard
2. Click **"Add Endpoint"**
3. Enter your webhook URL:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Production: `https://your-domain.com/api/webhooks/clerk`
4. Select events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
5. Click **"Create"**
6. Copy the **Signing Secret** (`whsec_xxx`)

### Step 4: Configure JWT Templates (Optional)

For custom JWT claims:

1. Go to **JWT Templates**
2. Click **"New template"**
3. Name: `supabase`
4. Add claims:
   ```json
   {
     "user_id": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
```

---

## Supabase Setup

Supabase provides the PostgreSQL database and real-time features.

### Step 1: Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in details:
   - **Name:** `bomberman-online`
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users
4. Click **"Create new project"**
5. Wait for project to initialize (~2 minutes)

### Step 2: Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (https://xxx.supabase.co)
   - **anon public** key (for client-side)
   - **service_role** key (for server-side, keep secret!)

### Step 3: Run Database Migrations

1. Install Supabase CLI if not already:
   ```bash
   npm install -g supabase
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

   Find your project ref in the Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

3. Run migrations:
   ```bash
   supabase db push
   ```

### Step 4: Seed Initial Data

```bash
# Run seed script for achievements, official maps, etc.
npm run db:seed
```

Or manually via SQL Editor in Supabase Dashboard:

```sql
-- Insert achievements
INSERT INTO achievements (code, name, description, icon, rarity) VALUES
  ('first_blood', 'First Blood', 'Get your first kill', '/achievements/first_blood.png', 'common'),
  ('double_kill', 'Double Kill', 'Kill 2 players with one bomb', '/achievements/double_kill.png', 'rare'),
  -- ... more achievements
```

### Step 5: Configure RLS Policies

The migrations should include RLS policies, but verify they're enabled:

1. Go to **Authentication** → **Policies**
2. Ensure each table has appropriate policies:
   - `profiles`: Public read, owner write
   - `games`: Public read, authenticated create
   - `maps`: Public read, creator write
   - etc.

### Step 6: Enable Realtime

1. Go to **Database** → **Publications**
2. Find `supabase_realtime` publication
3. Enable for tables: `games`, `game_players`, `chat_messages`

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # Server-side only, keep secret!
```

---

## Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/bomberman-online.git
cd bomberman-online
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your values
nano .env.local  # or use your preferred editor
```

Complete `.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Game Server
NEXT_PUBLIC_GAME_SERVER_URL=ws://localhost:8080
GAME_SERVER_PORT=8080
```

### Step 4: Generate Supabase Types

```bash
npm run db:generate
```

This creates TypeScript types from your database schema.

### Step 5: Start Development Servers

```bash
# Start both Next.js and game server
npm run dev:all

# Or start separately:
npm run dev        # Next.js on port 3000
npm run server     # Game server on port 8080
```

### Step 6: Expose Webhook (for Clerk)

For local webhook testing, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000
```

Update your Clerk webhook URL with the ngrok URL.

### Step 7: Verify Setup

1. Open http://localhost:3000
2. Sign up / sign in
3. Check Supabase dashboard for profile creation
4. Try creating a game room

---

## Game Server Setup

The game server handles real-time gameplay via WebSocket.

### Local Development

The game server runs alongside Next.js during development:

```bash
npm run server  # Starts on port 8080
```

### Configuration

```bash
# Game server environment
GAME_SERVER_PORT=8080
CLERK_SECRET_KEY=sk_test_xxx  # For JWT verification
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # For database access
```

### Architecture

```
/server
├── index.ts           # Entry point
├── Room.ts            # Room management
├── GameState.ts       # Authoritative game state
├── Player.ts          # Player management
├── Physics.ts         # Collision detection
├── Matchmaking.ts     # Queue management
└── ReplayRecorder.ts  # Replay system
```

---

## Deployment

### Frontend (Vercel)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository

2. **Configure Build**
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**
   Add all variables from `.env.local` to Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_GAME_SERVER_URL` (your Railway URL)

4. **Deploy**
   - Push to main branch for automatic deployment
   - Or click "Deploy" in dashboard

### Game Server (Railway)

1. **Create Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Root Directory: `/server`
   - Start Command: `npm start`

3. **Set Environment Variables**
   ```
   GAME_SERVER_PORT=8080
   CLERK_SECRET_KEY=sk_xxx
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx
   ```

4. **Get Public URL**
   - Railway provides a URL like `bomberman-server.up.railway.app`
   - Update `NEXT_PUBLIC_GAME_SERVER_URL` in Vercel to `wss://bomberman-server.up.railway.app`

5. **Configure Domain (Optional)**
   - Add custom domain in Railway settings
   - Update DNS records

### Post-Deployment Checklist

- [ ] Verify sign-in/sign-up works
- [ ] Verify Clerk webhook creates profiles
- [ ] Verify game server connects
- [ ] Test creating and joining a game
- [ ] Verify real-time updates work
- [ ] Check error monitoring (set up Sentry)

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

### Quick Fixes

**Clerk webhook not working:**
- Verify webhook URL is correct
- Check webhook signing secret
- Ensure events are selected

**Supabase connection failed:**
- Verify API keys are correct
- Check if project is paused (free tier)
- Verify RLS policies allow access

**Game server won't connect:**
- Check CORS configuration
- Verify WebSocket URL is correct (ws:// vs wss://)
- Check firewall/network settings

---

## Next Steps

After setup, you can:

1. Customize game settings in `lib/config.ts`
2. Add custom maps via the map editor
3. Configure achievements in Supabase
4. Set up monitoring with Sentry
5. Configure analytics with PostHog

Happy coding! 💣🎮
