# Troubleshooting Guide

This guide covers common issues you might encounter while developing or playing Bomberman Online.

## Table of Contents

- [Development Issues](#development-issues)
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [Game Server Issues](#game-server-issues)
- [Gameplay Issues](#gameplay-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [Debug Tips](#debug-tips)

---

## Development Issues

### npm install fails

**Symptoms:**
- Error during package installation
- Missing peer dependencies

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# If peer dependency issues, try:
npm install --legacy-peer-deps
```

### TypeScript errors

**Symptoms:**
- Type checking fails
- IDE shows red squiggles everywhere

**Solutions:**

```bash
# Regenerate Supabase types
npm run db:generate

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Check tsconfig.json paths are correct
```

### Next.js dev server won't start

**Symptoms:**
- Port already in use
- Module not found errors

**Solutions:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
npx kill-port 3000              # Cross-platform

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm ci
```

### Environment variables not loading

**Symptoms:**
- `undefined` values for env vars
- API calls failing

**Solutions:**

1. Ensure file is named `.env.local` (not `.env`)
2. Restart dev server after changing env vars
3. For client-side vars, prefix with `NEXT_PUBLIC_`
4. Check for typos in variable names

```bash
# Verify env vars are loaded
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

---

## Authentication Issues

### Sign-in not working

**Symptoms:**
- Redirect loop after sign-in
- Session not persisting

**Solutions:**

1. **Check Clerk keys:**
   ```bash
   # Ensure keys match environment
   # Development: pk_test_xxx, sk_test_xxx
   # Production: pk_live_xxx, sk_live_xxx
   ```

2. **Clear cookies:**
   - Open DevTools → Application → Cookies
   - Delete all Clerk-related cookies

3. **Check middleware:**
   ```typescript
   // middleware.ts should not block sign-in pages
   const isPublicRoute = createRouteMatcher([
     '/',
     '/sign-in(.*)',
     '/sign-up(.*)',
   ]);
   ```

### Webhook not creating profiles

**Symptoms:**
- User signs up but no profile in Supabase
- Webhook returns 401/500

**Solutions:**

1. **Verify webhook URL:**
   - Development: Use ngrok URL
   - Production: Use your actual domain

2. **Check signing secret:**
   ```typescript
   // app/api/webhooks/clerk/route.ts
   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
   ```

3. **Verify Supabase service role key:**
   ```typescript
   // Must use service role key for webhook (bypasses RLS)
   const supabase = createClient(url, serviceRoleKey);
   ```

4. **Check Clerk webhook logs:**
   - Clerk Dashboard → Webhooks → Recent Deliveries

### JWT validation failing on game server

**Symptoms:**
- Cannot connect to game server
- "Unauthorized" errors

**Solutions:**

1. **Verify Clerk secret key on server:**
   ```bash
   # Game server must have CLERK_SECRET_KEY
   ```

2. **Check token format:**
   ```typescript
   // Client sends: "Bearer <token>"
   const token = authHeader.replace('Bearer ', '');
   ```

3. **Verify token is not expired**

---

## Database Issues

### Supabase connection failed

**Symptoms:**
- "Failed to fetch" errors
- Connection timeout

**Solutions:**

1. **Check if project is paused:**
   - Free tier projects pause after 7 days of inactivity
   - Go to Supabase Dashboard → Restore

2. **Verify API keys:**
   ```bash
   # anon key for client
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

   # service_role key for server (never expose to client!)
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx
   ```

3. **Check RLS policies:**
   - Queries may be blocked by RLS
   - Test in SQL Editor with `SET role TO 'anon'`

### RLS policies blocking access

**Symptoms:**
- Empty results when data exists
- Insert/update silently fails

**Solutions:**

1. **Debug in SQL Editor:**
   ```sql
   -- See what user sees
   SET role TO 'anon';
   SELECT * FROM profiles;

   -- See all data (admin)
   SET role TO 'postgres';
   SELECT * FROM profiles;
   ```

2. **Check policy definitions:**
   ```sql
   -- View policies
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **Verify auth.uid():**
   - Make sure user is authenticated
   - Check JWT claims match policy expectations

### Migrations failing

**Symptoms:**
- `supabase db push` errors
- Schema mismatch

**Solutions:**

```bash
# Reset local database and re-run migrations
supabase db reset

# Pull remote schema
supabase db pull

# Check migration status
supabase migration list
```

---

## Game Server Issues

### Cannot connect to WebSocket

**Symptoms:**
- Connection refused
- WebSocket handshake fails

**Solutions:**

1. **Check server is running:**
   ```bash
   npm run server
   # Should show "Game server listening on port 8080"
   ```

2. **Verify URL protocol:**
   ```bash
   # Development
   NEXT_PUBLIC_GAME_SERVER_URL=ws://localhost:8080

   # Production (must use wss://)
   NEXT_PUBLIC_GAME_SERVER_URL=wss://your-server.railway.app
   ```

3. **Check CORS:**
   ```typescript
   // server/index.ts
   const wss = new WebSocketServer({
     server,
     verifyClient: (info, done) => {
       // Allow your origins
       done(true);
     }
   });
   ```

4. **Check firewall/network:**
   - Port 8080 must be accessible
   - Some corporate networks block WebSockets

### Players desyncing

**Symptoms:**
- Players appear in different positions
- Actions not registering

**Solutions:**

1. **Check tick rate:**
   ```typescript
   // Server should tick at 20Hz (50ms)
   const TICK_RATE = 50;
   ```

2. **Verify client interpolation:**
   ```typescript
   // Client should buffer 2-3 states
   const BUFFER_SIZE = 3;
   ```

3. **Check network latency:**
   ```typescript
   // Ping test
   client.send({ type: 'ping', timestamp: Date.now() });
   ```

### Room not persisting

**Symptoms:**
- Room disappears after creation
- Players kicked unexpectedly

**Solutions:**

1. **Check room lifecycle:**
   ```typescript
   // Room should persist while players connected
   // Cleanup only after all players leave + timeout
   ```

2. **Verify Supabase sync:**
   ```typescript
   // Room should be saved to database
   await supabase.from('games').insert({ ... });
   ```

---

## Gameplay Issues

### Input lag

**Symptoms:**
- Movement feels delayed
- Actions don't register immediately

**Solutions:**

1. **Enable client prediction:**
   ```typescript
   // Apply input immediately on client
   const predictInput = (input: Input) => {
     localPlayer.applyInput(input);
     sendToServer(input);
   };
   ```

2. **Check network latency:**
   - High ping (>150ms) will cause lag
   - Consider regional servers

3. **Verify tick rate:**
   - Server: 20Hz
   - Client render: 60 FPS

### Bombs not exploding

**Symptoms:**
- Bomb placed but never explodes
- Explosion not visible

**Solutions:**

1. **Check fuse timer:**
   ```typescript
   // Bomb should explode after 3 seconds
   const FUSE_TIME = 3000;
   ```

2. **Verify server-side explosion:**
   ```typescript
   // Server must broadcast explosion
   room.broadcast({ type: 'explosion', ... });
   ```

3. **Check client-side rendering:**
   ```typescript
   // Client must handle explosion message
   client.on('explosion', handleExplosion);
   ```

### Power-ups not working

**Symptoms:**
- Collected but no effect
- Stats not updating

**Solutions:**

1. **Verify server applies power-up:**
   ```typescript
   player.maxBombs += 1; // Bomb Up
   player.explosionRadius += 1; // Fire Up
   ```

2. **Check client receives update:**
   ```typescript
   // Power-up effect should come from server state
   ```

---

## Deployment Issues

### Vercel build failing

**Symptoms:**
- Build error in deployment
- TypeScript errors

**Solutions:**

1. **Check build locally:**
   ```bash
   npm run build
   ```

2. **Verify environment variables:**
   - All `NEXT_PUBLIC_*` vars must be set in Vercel
   - Secrets must be set but not exposed

3. **Check for missing dependencies:**
   ```bash
   npm ci  # Clean install
   ```

### Railway deployment failing

**Symptoms:**
- Container won't start
- Health check failing

**Solutions:**

1. **Check start command:**
   ```json
   // package.json
   "scripts": {
     "start": "node dist/server/index.js"
   }
   ```

2. **Verify build output:**
   ```bash
   npm run build:server
   ls dist/server/  # Should have index.js
   ```

3. **Check logs in Railway dashboard**

### CORS errors in production

**Symptoms:**
- API calls blocked
- WebSocket connection refused

**Solutions:**

1. **Configure Next.js:**
   ```javascript
   // next.config.js
   async headers() {
     return [{
       source: '/api/:path*',
       headers: [
         { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' }
       ]
     }];
   }
   ```

2. **Configure game server:**
   ```typescript
   // Allow specific origins
   const ALLOWED_ORIGINS = [
     'https://yourdomain.com',
     'https://www.yourdomain.com'
   ];
   ```

---

## Performance Issues

### Low FPS

**Symptoms:**
- Game stuttering
- FPS below 60

**Solutions:**

1. **Check PixiJS settings:**
   ```typescript
   // Optimize renderer
   app.renderer.resolution = window.devicePixelRatio;
   app.renderer.autoDensity = true;
   ```

2. **Reduce particle count:**
   ```typescript
   // Limit explosion particles
   const MAX_PARTICLES = 100;
   ```

3. **Profile with Chrome DevTools:**
   - Performance tab → Record
   - Look for long tasks

### High memory usage

**Symptoms:**
- Memory climbing over time
- Browser tab crashes

**Solutions:**

1. **Clean up sprites:**
   ```typescript
   // Destroy sprites when done
   sprite.destroy();
   ```

2. **Clear event listeners:**
   ```typescript
   // Remove listeners on cleanup
   component.off('event', handler);
   ```

3. **Check for state buffer overflow:**
   ```typescript
   // Limit state history
   while (stateBuffer.length > MAX_BUFFER) {
     stateBuffer.shift();
   }
   ```

---

## Debug Tips

### Enable debug logging

```typescript
// lib/debug.ts
export const debug = {
  game: DEBUG_GAME ? console.log.bind(console, '[GAME]') : () => {},
  network: DEBUG_NETWORK ? console.log.bind(console, '[NET]') : () => {},
  auth: DEBUG_AUTH ? console.log.bind(console, '[AUTH]') : () => {},
};

// Usage
debug.network('Received state', state);
```

### Network inspection

1. **Chrome DevTools → Network → WS**
   - See all WebSocket messages
   - Filter by type

2. **Add logging middleware:**
   ```typescript
   client.onMessage((msg) => {
     console.log('←', msg);
   });
   client.onSend((msg) => {
     console.log('→', msg);
   });
   ```

### State inspection

```typescript
// Expose game state to window for debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).gameState = gameState;
}

// In console
window.gameState.players
window.gameState.bombs
```

### Supabase debugging

```typescript
// Enable Supabase logging
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  auth: { debug: true }
});
```

---

## Getting Help

If you can't resolve an issue:

1. **Search existing issues:** [GitHub Issues](https://github.com/yourusername/bomberman-online/issues)
2. **Check discussions:** [GitHub Discussions](https://github.com/yourusername/bomberman-online/discussions)
3. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Environment details
   - Console logs/errors
