# SNES-Style Sprite Specifications for Bomberman Online

## Overview

This document defines the complete sprite specifications for the Bomberman Online game, following the aesthetic of **Super Bomberman** (Hudson Soft, 1993) on the SNES.

## Technical Constraints

### Resolution & Scale
- **Base Resolution**: 256x224 pixels (SNES native)
- **Display Scale**: 3x (768x672 rendered)
- **Tile Size**: 32x32 pixels
- **Game Field**: 15x13 tiles (480x416 pixels at scale)

### Color Limitations
- **Per Sprite**: 16 colors maximum (SNES palette constraint aesthetic)
- **Global Palette**: 256 colors total
- **Transparency**: Index 0 reserved for transparency

### Animation Guidelines
- **Walk Cycles**: 8-12 FPS (snappy, responsive)
- **Effects**: 10-15 FPS (smooth explosions)
- **Idle**: 4-6 FPS (subtle movement)

---

## Character Sprites (32x32 pixels)

### Sprite Sheet Layout
- **Dimensions**: 512x512 pixels (16 columns x 16 rows)
- **8 characters**, each using 64 frames (8 rows of 8 frames)

### Character Color Variants
| Index | Character | Primary Color | Secondary Color |
|-------|-----------|---------------|-----------------|
| 0 | White Bomber | #FFFFFF | #E0E0E0 |
| 1 | Black Bomber | #2A2A2A | #4A4A4A |
| 2 | Red Bomber | #FF4444 | #CC2222 |
| 3 | Blue Bomber | #4488FF | #2266CC |
| 4 | Green Bomber | #44CC44 | #228822 |
| 5 | Yellow Bomber | #FFCC00 | #CC9900 |
| 6 | Pink Bomber | #FF88CC | #CC6699 |
| 7 | Cyan Bomber | #44CCCC | #229999 |

### Animation Breakdown Per Character

#### Idle Animations (4 frames each, 6 FPS)
```
Row 0: idle_down  [0-3]   - Slight breathing animation
Row 0: idle_up    [4-7]   - Looking up, breathing
Row 1: idle_left  [8-11]  - Side view left, breathing
Row 1: idle_right [12-15] - Side view right, breathing
```

#### Walk Animations (4 frames each, 10 FPS)
```
Row 2: walk_down  [16-19] - Bouncy walk toward camera
Row 2: walk_up    [20-23] - Walk away from camera
Row 3: walk_left  [24-27] - Side walk left (mirrored body)
Row 3: walk_right [28-31] - Side walk right
```

#### Action Animations
```
Row 4: place_bomb [32-33] - 2 frames, quick squat
Row 4: kick       [34-35] - 2 frames, leg forward
Row 4: punch      [36-37] - 2 frames, arm forward
Row 4: hit        [38-39] - 2 frames, knockback pose
```

#### Death Animation (6 frames, 8 FPS)
```
Row 6: death [48-53]
- Frame 0: Surprised face
- Frame 1: Spinning start
- Frame 2: Spinning mid
- Frame 3: Spinning end
- Frame 4: Angel rising
- Frame 5: Angel float/fade
```

#### Victory Animation (4 frames, 6 FPS)
```
Row 7: victory [56-59]
- Frame 0: Arms raising
- Frame 1: Arms up
- Frame 2: Jump
- Frame 3: Land with fists pumped
```

### Character Sprite Details
```
+------------------+
|   HEAD (12px)    |  - Round helmet with antenna
|------------------|
|   BODY (12px)    |  - Simple torso, arms at sides
|------------------|
|   LEGS (8px)     |  - Short legs, big feet
+------------------+
```

---

## Bomb Sprites (32x32 pixels)

### Sprite Sheet Layout
- **Dimensions**: 256x128 pixels (8 columns x 4 rows)

### Bomb Animations

#### Idle/Wobble (3 frames, 4 FPS)
```
Row 0: [0-2] - Slight side-to-side wobble
- Frame 0: Center
- Frame 1: Lean left
- Frame 2: Lean right
```

#### Fuse Burning (4 frames, 8 FPS)
```
Row 1: [8-11] - Fuse spark animation
- Spark travels down fuse
- Bomb slightly pulses
```

### Explosion Sprites

#### Center Explosion (4 frames, 12 FPS)
```
Row 2: [16-19]
- Frame 0: Initial burst
- Frame 1: Full expansion
- Frame 2: Peak intensity
- Frame 3: Fade out
```

#### Horizontal Beam (4 frames, 12 FPS)
```
Row 2: [20-23] - Seamless horizontal tile
```

#### Vertical Beam (4 frames, 12 FPS)
```
Row 3: [24-27] - Seamless vertical tile
```

#### End Caps (4 frames each, 12 FPS)
```
Row 3-4: End caps for each direction
- [28-31] End Up
- [32-35] End Down
- [36-39] End Left
- [40-43] End Right
```

### Explosion Color Gradient
```
Inner:  #FFFFFF (white)
Mid:    #FFFF44 (yellow)
Outer:  #FF8800 (orange)
Edge:   #FF4400 (red-orange)
```

---

## Tile Sprites (32x32 pixels)

### Sprite Sheet Layout
- **Dimensions**: 256x128 pixels (8 columns x 4 rows)

### Ground Tiles (Row 0)
```
[0] ground_default  - Basic floor
[1] ground_shadow   - Shadow variant (near walls)
[2] ground_light    - Lighter variant
[3] ground_detail   - With small detail
```

### Wall Tiles (Row 1)
```
[8]  wall_default   - Standard indestructible wall
[9]  wall_corner    - Corner variant
[10] wall_edge      - Edge detail
[11] wall_special   - Decorative wall
```

### Destructible Blocks (Row 2)
```
[16] block_default  - Standard breakable block
[17] block_cracked  - Slightly damaged appearance
[18] block_variant1 - Color variation
[19] block_variant2 - Pattern variation
```

### Block Destruction Animation (Row 3, 6 frames, 10 FPS)
```
[24-29] destroy
- Frame 0: Initial crack
- Frame 1: More cracks
- Frame 2: Breaking apart
- Frame 3: Debris flying
- Frame 4: Debris settling
- Frame 5: Gone (transparent)
```

### Tile Color Palette (Green Theme - Default)
```
Ground: #4A8C4A, #3A7C3A, #5A9C5A
Walls:  #8B8B8B, #6B6B6B, #ABABAB
Blocks: #CD853F, #A0522D, #DEB887
```

---

## Power-up Sprites (24x24 pixels)

### Sprite Sheet Layout
- **Dimensions**: 192x48 pixels (8 columns x 2 rows)
- Row 0: Normal state
- Row 1: Glow state (for pulsing animation)

### Power-up Types

| Index | Type | Icon | Effect |
|-------|------|------|--------|
| 0 | Bomb Up | Bomb with + | +1 max bombs |
| 1 | Fire Up | Flame | +1 explosion range |
| 2 | Speed Up | Boot | +0.5 movement speed |
| 3 | Kick | Foot | Kick bombs |
| 4 | Punch | Fist | Throw bombs |
| 5 | Shield | Star | One-hit protection |
| 6 | Skull | Skull | Random negative effect |
| 7 | Full Fire | Big flame | Maximum explosion range |

### Glow Animation (2 frames, 4 FPS)
- Frame 0: Normal brightness
- Frame 1: Glowing/pulsing (brighter outline)

### Power-up Color Scheme
```
Bomb Up:    #4488FF (blue)
Fire Up:    #FF8844 (orange)
Speed Up:   #44FF44 (green)
Kick:       #FFFF44 (yellow)
Punch:      #FF4444 (red)
Shield:     #FFFFFF (white/silver)
Skull:      #8844FF (purple)
Full Fire:  #FF0000 (bright red)
```

---

## Effects Sprites (32x32 pixels)

### Sprite Sheet Layout
- **Dimensions**: 256x128 pixels (8 columns x 4 rows)

### Spawn Effect (6 frames, 10 FPS)
```
[0-5] - Player teleporting in
- Sparkle ring expanding
- Character fading in
```

### Teleport Effect (6 frames, 10 FPS)
```
[8-13] - Quick teleport flash
```

### Shield Hit (4 frames, 12 FPS)
```
[16-19] - Shield absorbing damage
- Flash of white
- Shield cracking
- Particles dispersing
```

### Power-up Collect (4 frames, 10 FPS)
```
[24-27] - Sparkle burst on collection
```

### Dust Cloud (4 frames, 8 FPS)
```
[28-31] - Small dust when landing/stopping
```

---

## UI Elements

### Sprite Sheet Layout
- **Dimensions**: 256x256 pixels
- Mixed element sizes

### Buttons (96x32 pixels)
```
Row 0: Normal state
Row 1: Hover state
Row 2: Pressed state
Row 3: Disabled state
```

### 9-Slice Panel (16x16 per piece)
```
Corners: TL, TR, BL, BR
Edges: Top, Bottom, Left, Right
Center: Repeatable fill
```

### HUD Elements
```
Health Bar: 64x8 pixels (background + fill)
Timer: 48x16 pixels
Score Display: 128x48 pixels
Player Indicator: 16x16 pixels
Icons: 16x16 pixels (crown, skull, bomb, fire, speed)
```

### UI Color Palette
```
Primary:    #2A2A5A (dark blue)
Secondary:  #4A4A8A (medium blue)
Accent:     #FFCC00 (gold)
Text:       #FFFFFF (white)
Shadow:     #1A1A3A (very dark blue)
```

---

## Font Specifications

### Small Font (8x8 pixels)
- **Characters**: A-Z, 0-9, common punctuation
- **Use**: In-game labels, small text
- **Color**: White with 1px black outline

### Large Font (16x16 pixels)
- **Characters**: A-Z, 0-9, common punctuation
- **Use**: Titles, scores, important text
- **Color**: Gradient or solid with 2px outline

### Font Character Map
```
 !"#$%&'()*+,-./
0123456789:;<=>?
@ABCDEFGHIJKLMNO
PQRSTUVWXYZ[\]^_
`abcdefghijklmno
pqrstuvwxyz{|}~
```

---

## Achievement Badges (48x48 pixels)

### Sprite Sheet Layout
- **Dimensions**: 384x384 pixels (8 columns x 8 rows)
- **Total Badges**: 64 slots

### Rarity Borders
```
Common:    Silver border (#C0C0C0)
Rare:      Gold border (#FFD700)
Epic:      Purple border (#9932CC)
Legendary: Rainbow animated border
```

---

## Map Themes

### Theme 1: Classic Green
```
Ground: Grass green (#4A8C4A)
Walls: Gray stone (#8B8B8B)
Blocks: Brown crates (#CD853F)
```

### Theme 2: Ice World
```
Ground: Light blue (#B0E0E6)
Walls: Ice blue (#4169E1)
Blocks: Snow white (#FFFAFA)
```

### Theme 3: Lava Zone
```
Ground: Dark red (#8B0000)
Walls: Black rock (#2F2F2F)
Blocks: Obsidian (#3D3D3D)
```

### Theme 4: Tech Lab
```
Ground: Metal gray (#708090)
Walls: Steel (#4682B4)
Blocks: Crates (#DEB887)
```

---

## File Naming Convention

```
sprites/
  characters.png      - All 8 character variants
  bombs.png           - Bombs and explosions
  tiles.png           - Ground, walls, blocks
  powerups.png        - All power-up items
  effects.png         - Visual effects
  ui.png              - UI elements
  achievements.png    - Achievement badges

audio/
  bgm_menu.mp3
  bgm_game.mp3
  bgm_victory.mp3
  bgm_tension.mp3
  sfx/
    bomb_place.mp3
    explosion.mp3
    powerup.mp3
    death.mp3
    victory.mp3
    ...

fonts/
  pixel_small.fnt
  pixel_small.png
  pixel_large.fnt
  pixel_large.png
```

---

## Asset Creation Notes

### For Artists
1. Use indexed color mode (16 colors per sprite)
2. Keep consistent lighting (top-left light source)
3. Maintain 1px black outline on characters
4. Test animations at target frame rates
5. Export as PNG with transparency

### For Placeholder Generation
- Use solid colored rectangles with character initials
- Simple geometric shapes for power-ups
- Gradient fills for effects
- Border patterns for UI elements

### Reference Games
- Super Bomberman (SNES) - Primary reference
- Bomberman '94 (TurboGrafx-16)
- Saturn Bomberman
- Bomberman 64

---

## Placeholder Asset Priority

### Phase 1 (MVP - Required)
1. Character sprites (at least 1 color variant)
2. Bomb and explosion sprites
3. Basic tile set
4. Essential power-ups (bomb_up, fire_up, speed_up)

### Phase 2 (Beta)
1. All 8 character variants
2. Full power-up set
3. All effects
4. UI elements
5. Audio

### Phase 3 (Release)
1. Achievement badges
2. Additional map themes
3. Polish and refinements
4. Additional audio tracks
