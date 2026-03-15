# Game Design Document

## Overview

**Bomberman Online** is a real-time multiplayer battle game inspired by the classic Super Bomberman (SNES, 1993). Players compete in arenas, placing bombs to eliminate opponents while collecting power-ups to gain advantages.

---

## Table of Contents

- [Core Mechanics](#core-mechanics)
- [Power-ups](#power-ups)
- [Map Specifications](#map-specifications)
- [Game Modes](#game-modes)
- [Ranking System](#ranking-system)
- [Balance Considerations](#balance-considerations)

---

## Core Mechanics

### Movement

| Property | Value |
|----------|-------|
| Base speed | 2 tiles/second |
| Max speed | 5 tiles/second (with power-ups) |
| Movement | 8-directional (keyboard) / 4-directional (D-pad) |
| Collision | Tile-based (32x32 pixels) |

Players move freely within the arena but cannot pass through:
- Indestructible walls (permanent)
- Destructible blocks (until destroyed)
- Other players (soft collision)
- Unexploded bombs (unless they have Kick power-up)

### Bombs

| Property | Value |
|----------|-------|
| Fuse time | 3 seconds |
| Base explosion radius | 1 tile |
| Max explosion radius | 8 tiles |
| Chain explosion delay | 0.1 seconds |

**Bomb Mechanics:**
1. Player places bomb at current tile
2. Bomb counts against player's bomb limit
3. After fuse time, bomb explodes in 4 directions
4. Explosion stops at walls, extends through empty tiles
5. Destroyed blocks may drop power-ups
6. Players caught in explosion die (unless shielded)
7. Bombs caught in explosion trigger chain reactions

### Explosions

```
     │
     │
─────┼─────
     │
     │
```

Explosions travel from the bomb center outward in 4 directions:
- **Horizontal:** Left and Right
- **Vertical:** Up and Down

Explosion propagation rules:
- Extends up to the bomb's explosion radius
- Stops when hitting indestructible walls
- Destroys destructible blocks and stops (block absorbs explosion)
- Continues through empty tiles
- Destroys other bombs (chain reaction)
- Eliminates players

### Player Death

When a player is hit by an explosion:
1. Death animation plays (0.5 seconds)
2. Player is eliminated from the round
3. Bombs placed by dead player remain and explode normally
4. In team modes, spectator camera activates

### Win Conditions

**Standard Mode:**
- Last player alive wins the round
- First to win N rounds wins the match (configurable, default 3)
- If time runs out, player with most kills wins
- If tied, sudden death (shrinking arena)

**Team Mode:**
- Last team with surviving players wins

---

## Power-ups

Power-ups spawn when destructible blocks are destroyed. Each block has a configurable chance to contain a power-up.

### Standard Power-ups

| Icon | Name | Effect | Spawn Rate |
|------|------|--------|------------|
| 💣 | **Bomb Up** | +1 max bomb | 25% |
| 🔥 | **Fire Up** | +1 explosion radius | 25% |
| 👟 | **Speed Up** | +0.5 movement speed | 20% |
| 👢 | **Kick** | Kick bombs when walking into them | 10% |
| 🥊 | **Punch** | Throw bombs over walls (3 tiles) | 8% |
| 🛡️ | **Shield** | Survive one hit | 7% |
| 💀 | **Skull** | Random negative effect | 5% |

### Power-up Details

#### Bomb Up 💣
- Increases maximum placeable bombs by 1
- Starting: 1 bomb
- Maximum: 8 bombs
- Stacks additively

#### Fire Up 🔥
- Increases explosion radius by 1 tile in each direction
- Starting: 1 tile radius
- Maximum: 8 tile radius
- Stacks additively

#### Speed Up 👟
- Increases movement speed by 0.5 tiles/second
- Starting: 2 tiles/second
- Maximum: 5 tiles/second
- Stacks additively

#### Kick 👢
- Walk into bombs to kick them
- Kicked bombs slide until hitting obstacle
- Can kick own or enemy bombs
- Does not stack (single pickup)

#### Punch 🥊
- Press action button while stationary to pick up adjacent bomb
- Press again to throw bomb 3 tiles in facing direction
- Thrown bombs fly over obstacles
- Does not stack (single pickup)

#### Shield 🛡️
- Grants one-hit protection
- Visual indicator (flashing sprite)
- Lost when hit by explosion
- Stacks (max 1 shield at a time)

#### Skull 💀
- Applies random negative effect for 10 seconds:
  - **Slow:** Movement speed reduced to 1 tile/second
  - **Diarrhea:** Automatically places bombs
  - **Constipation:** Cannot place bombs
  - **Short Fuse:** Bombs explode after 1 second
  - **Low Power:** Explosion radius reduced to 1
- Skull can be passed to other players by touching them
- Effect shown by skull icon above player

---

## Map Specifications

### Standard Map

```
15 tiles × 13 tiles = 195 tiles
480px × 416px (at 32px per tile)
```

### Tile Types

| Type | Symbol | Properties |
|------|--------|------------|
| Empty | `.` | Players can walk through |
| Wall | `#` | Indestructible, blocks movement and explosions |
| Block | `B` | Destructible, may contain power-up |
| Spawn | `S` | Player spawn point (becomes empty) |

### Standard Layout Pattern

```
# # # # # # # # # # # # # # #
# S . B . B . B . B . B . S #
# . # . # . # . # . # . # . #
# B . B . B . B . B . B . B #
# . # . # . # . # . # . # . #
# B . B . B . B . B . B . B #
# . # . # . # . # . # . # . #
# B . B . B . B . B . B . B #
# . # . # . # . # . # . # . #
# B . B . B . B . B . B . B #
# . # . # . # . # . # . # . #
# S . B . B . B . B . B . S #
# # # # # # # # # # # # # # #
```

### Map Rules

1. **Spawn Safety Zone:** 2 tiles around each spawn point must be empty
2. **Border:** Outer edge must be indestructible walls
3. **Accessibility:** All players must be able to reach each other
4. **Symmetry:** Official maps should be symmetrical for fairness
5. **Block Density:** 30-50% of traversable tiles should be blocks

### Spawn Points

| Players | Spawn Locations |
|---------|-----------------|
| 2 | Top-left, Bottom-right (diagonal) |
| 4 | All corners |
| 8 | Corners + middle edges |
| 16 | Distributed evenly |

---

## Game Modes

### Quick Play

- Random public matchmaking
- 2-8 players
- Best of 3 rounds
- Standard maps only

### Ranked

- ELO-based matchmaking
- 2-4 players
- Best of 5 rounds
- Affects ranking

### Custom Games

- Private room with code
- 2-16 players
- Configurable settings
- Any map (official or custom)

### Tournament

- Bracket-based competition
- Single/double elimination
- 8-64 participants
- Fixed schedule

---

## Ranking System

### ELO Rating

| Tier | Rating Range | Icon |
|------|--------------|------|
| Bronze | 0 - 999 | 🥉 |
| Silver | 1000 - 1499 | 🥈 |
| Gold | 1500 - 1999 | 🥇 |
| Platinum | 2000 - 2499 | 💎 |
| Diamond | 2500+ | 👑 |

### ELO Calculation

```
New Rating = Old Rating + K × (Actual - Expected)

K = 32 (for players < 100 games)
K = 24 (for players >= 100 games)

Expected = 1 / (1 + 10^((OpponentRating - YourRating) / 400))

Actual:
  Win = 1.0
  Loss = 0.0
```

### Placement Matches

- New players start at 1000 ELO
- First 10 games are placement matches with K = 48
- After placement, tier is revealed

---

## Balance Considerations

### Power-up Balance

**Spawn Rates Rationale:**
- Bomb Up / Fire Up (25% each): Core progression, should be common
- Speed Up (20%): Powerful but not overwhelming
- Kick (10%): Strong utility, more rare
- Punch (8%): High skill ceiling, rare
- Shield (7%): Defensive, slightly rare
- Skull (5%): Risk/reward element, rare

### Speed Considerations

- Base speed allows reaction to bombs
- Max speed still allows bomb dodging
- Speed difference between players should not exceed 2x

### Explosion Radius

- Radius 1-3: Safe, allows navigation
- Radius 4-6: Dangerous, requires careful movement
- Radius 7-8: Extreme, late-game only

### Bomb Count

- 1-2 bombs: Conservative play
- 3-4 bombs: Aggressive trapping
- 5-8 bombs: Area denial

### Map-Specific Balance

**Small Maps (11x9):**
- Faster games
- Higher explosion danger
- Fewer power-ups

**Standard Maps (15x13):**
- Balanced gameplay
- Moderate power-up density
- Recommended for ranked

**Large Maps (19x15):**
- Longer games
- More strategic depth
- Team mode recommended

---

## Audio Design

### Sound Effects

| Event | Sound | Priority |
|-------|-------|----------|
| Bomb place | Short "plop" | Medium |
| Explosion | "Boom" with bass | High |
| Power-up collect | Chime/jingle | Medium |
| Player death | Defeat sound | High |
| Round win | Victory fanfare | High |
| Countdown | Beep (3-2-1) | High |
| Footsteps | Soft taps | Low |

### Music

| Context | Style | Loop |
|---------|-------|------|
| Menu | Upbeat chiptune | Yes |
| Lobby | Ambient/waiting | Yes |
| In-game | Intense chiptune | Yes |
| Victory | Triumphant | No |
| Defeat | Somber | No |

---

## Visual Design

### SNES Aesthetic

- **Resolution:** 480×416 (15:13 ratio, scaled to fit)
- **Color Palette:** 256 colors (SNES limitation aesthetic)
- **Sprites:** 32×32 pixels for characters/tiles
- **Animation:** 4-8 frames per animation cycle
- **Frame Rate:** 60 FPS rendering

### Character Design

8 unique Bomberman characters:
1. **White** - Classic bomber
2. **Black** - Ninja themed
3. **Red** - Fire themed
4. **Blue** - Water themed
5. **Green** - Nature themed
6. **Yellow** - Electric themed
7. **Pink** - Cute themed
8. **Purple** - Dark themed

Each character has:
- Idle animation (4 frames)
- Walk animation per direction (4 frames × 4 directions)
- Bomb place animation (2 frames)
- Death animation (6 frames)
- Victory animation (4 frames)

### Particle Effects

- Explosion: Fire particles, debris
- Power-up collect: Sparkles
- Death: Smoke/spirit
- Shield: Bubble/glow

---

## Future Considerations

### Potential Features

- [ ] Boss battle mode
- [ ] Story/campaign mode
- [ ] Seasonal events
- [ ] Cosmetic unlocks
- [ ] Character abilities
- [ ] Battle royale mode (larger maps, more players)

### Balancing Updates

Regular balance patches based on:
- Win rate statistics per character
- Power-up usage data
- Map performance metrics
- Community feedback

---

*This document is a living specification. Updates will be made as the game evolves.*
