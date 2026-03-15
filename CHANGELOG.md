# Changelog

All notable changes to Bomberman Online will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Core game engine with PixiJS
- WebSocket game server
- Clerk authentication integration
- Supabase database schema
- Basic lobby system
- Character movement and bomb placement
- Power-up system (7 power-up types)
- Global leaderboards
- User profiles with statistics
- In-game chat system
- Achievement system (50+ achievements)
- Replay recording and playback
- Map editor
- Spectator mode
- Matchmaking queue
- Tournament system
- Friends and social features

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## [1.0.0] - YYYY-MM-DD

### Added

#### 🎮 Core Gameplay
- Real-time multiplayer battles with up to 16 players
- Classic Bomberman mechanics (bombs, explosions, power-ups)
- 8 unique playable characters with SNES-style sprites
- Client-side prediction with server reconciliation
- 60 FPS rendering with 20Hz server tick rate

#### 🔐 Authentication & Profiles
- Clerk authentication (email, social providers)
- User profiles with customizable avatars
- Match history and statistics tracking
- Privacy settings

#### 🏆 Competitive Features
- ELO-based ranking system (Bronze to Diamond)
- Global leaderboards (daily, weekly, monthly, all-time)
- Multiple stat categories (wins, kills, games played)
- Placement matches for new players

#### 🗺️ Maps & Content
- 10 official maps
- Community map editor
- Map sharing and rating system
- Custom game settings

#### 💬 Social Features
- Friends list with online status
- Friend requests and notifications
- Party queue for ranked play
- Lobby and in-game chat
- Quick chat emotes

#### 🏅 Progression
- 50+ achievements across categories
- Rarity tiers (Common, Rare, Epic, Legendary)
- Achievement showcase on profiles
- Progress tracking

#### 📹 Replay System
- Automatic game recording
- Playback controls (pause, speed, seek)
- Replay sharing via links
- Download replays locally

#### 👁️ Spectator Mode
- Watch live games
- Free camera and player focus modes
- Spectator chat
- Browse active games

#### 🏆 Tournaments
- Single/double elimination brackets
- Registration system
- Live bracket updates
- Tournament history

### Technical
- Next.js 14 with App Router
- PixiJS 8.x game engine
- TypeScript strict mode
- Tailwind CSS styling
- Supabase PostgreSQL database
- WebSocket game server
- Vercel + Railway deployment

---

## Version History Format

Future versions will follow this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features to be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security patches
```

---

## Release Types

- **Major (X.0.0)**: Breaking changes, major new features
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements

---

## Links

- [GitHub Releases](https://github.com/yourusername/bomberman-online/releases)
- [Roadmap](https://github.com/yourusername/bomberman-online/projects)
- [Documentation](./docs/)

---

*For detailed commit history, see the [commit log](https://github.com/yourusername/bomberman-online/commits/main).*
