# Audio Specifications for Bomberman Online

## Overview

This document defines the audio specifications for Bomberman Online, following the chiptune aesthetic of classic SNES games while maintaining modern audio quality.

## Technical Requirements

### Format Specifications
- **Primary Format**: MP3 (for broad compatibility)
- **Fallback Format**: OGG Vorbis (for browsers that prefer it)
- **Sample Rate**: 44.1 kHz
- **Bit Depth**: 16-bit
- **Channels**: Stereo for music, Mono for SFX

### Volume Guidelines
- **Master Volume**: User-adjustable (0-100%)
- **Music Volume**: Default 60% of master
- **SFX Volume**: Default 80% of master
- **Voice Volume**: Default 70% of master (if applicable)

---

## Background Music (BGM)

### Track List

#### 1. Menu Theme (`bgm_menu.mp3`)
- **Duration**: 1:30 - 2:00 (looping)
- **Tempo**: 120-130 BPM
- **Style**: Upbeat, catchy chiptune
- **Mood**: Welcoming, energetic, nostalgic
- **Loop Point**: Clean loop at measure boundary
- **Reference**: Super Bomberman title screen

#### 2. Game Theme (`bgm_game.mp3`)
- **Duration**: 2:00 - 2:30 (looping)
- **Tempo**: 140-150 BPM
- **Style**: Fast-paced chiptune with driving beat
- **Mood**: Exciting, competitive, urgent
- **Loop Point**: Clean loop with energy buildup
- **Reference**: Super Bomberman battle mode

#### 3. Tension Theme (`bgm_tension.mp3`)
- **Duration**: 0:30 - 1:00 (looping)
- **Tempo**: 160-180 BPM
- **Style**: Intense, faster variation of game theme
- **Mood**: Urgent, climactic, pressure
- **Trigger**: Last 30 seconds of round OR 2 players remaining
- **Reference**: Bomberman time running out music

#### 4. Victory Fanfare (`bgm_victory.mp3`)
- **Duration**: 0:15 - 0:20 (non-looping)
- **Tempo**: 120 BPM
- **Style**: Triumphant fanfare
- **Mood**: Celebratory, rewarding
- **Reference**: Classic victory jingles

### Music Composition Guidelines

```
Instruments to emulate:
- Square wave (lead melody)
- Triangle wave (bass)
- Noise channel (drums/percussion)
- Pulse wave (harmony)

Channel limitations (SNES aesthetic):
- 8 simultaneous voices maximum
- Simple waveforms preferred
- Limited reverb/effects
```

---

## Sound Effects (SFX)

### Priority Levels
- **High**: Player actions, deaths, explosions
- **Medium**: Power-ups, block destruction
- **Low**: UI sounds, ambient effects

### Core Gameplay SFX

#### Bomb Sounds

| Sound | File | Duration | Priority | Description |
|-------|------|----------|----------|-------------|
| Bomb Place | `bomb_place.mp3` | 0.2s | High | Thud when bomb is placed |
| Explosion | `explosion.mp3` | 0.5s | High | Main explosion sound |
| Chain Explosion | `explosion_chain.mp3` | 0.3s | High | Shorter, for chain reactions |

**Bomb Place Sound Design:**
```
- Initial: Short, muffled thump
- Character: Slightly mechanical
- Pitch: Low-mid (200-400 Hz base)
```

**Explosion Sound Design:**
```
- Attack: Sharp, punchy start
- Body: Sustained rumble
- Decay: Quick fade with crackle
- Frequency: Full spectrum with low emphasis
```

#### Player Sounds

| Sound | File | Duration | Priority | Description |
|-------|------|----------|----------|-------------|
| Death | `death.mp3` | 0.8s | High | Player elimination |
| Victory | `victory.mp3` | 1.0s | High | Round win |
| Walk | `walk.mp3` | 0.15s | Low | Footstep (loopable) |
| Kick | `kick.mp3` | 0.2s | Medium | Kicking a bomb |
| Punch | `punch.mp3` | 0.25s | Medium | Throwing a bomb |

**Death Sound Design:**
```
- Classic "boing" spinning sound
- Followed by angelic ascending tone
- Comedic, not scary
```

**Victory Sound Design:**
```
- Triumphant ascending notes
- Slight echo/reverb
- Celebratory feel
```

#### Power-up Sounds

| Sound | File | Duration | Priority | Description |
|-------|------|----------|----------|-------------|
| Collect | `powerup.mp3` | 0.3s | Medium | Generic power-up pickup |
| Shield Break | `shield_break.mp3` | 0.4s | High | Shield absorbing hit |
| Skull Effect | `skull.mp3` | 0.5s | Medium | Skull debuff activation |

**Power-up Sound Design:**
```
- Bright, positive chime
- Quick ascending arpeggio
- Sparkle/shimmer quality
```

#### Environment Sounds

| Sound | File | Duration | Priority | Description |
|-------|------|----------|----------|-------------|
| Block Destroy | `block_destroy.mp3` | 0.3s | Medium | Destructible block breaking |
| Countdown | `countdown.mp3` | 0.5s | High | Each countdown number |
| Game Start | `game_start.mp3` | 0.8s | High | "GO!" announcement |
| Time Warning | `time_warning.mp3` | 0.3s | High | Low time alert beep |

### UI Sound Effects

| Sound | File | Duration | Priority | Description |
|-------|------|----------|----------|-------------|
| Menu Select | `menu_select.mp3` | 0.1s | Low | Cursor movement |
| Menu Confirm | `menu_confirm.mp3` | 0.2s | Low | Selection confirmation |
| Menu Cancel | `menu_cancel.mp3` | 0.15s | Low | Back/cancel action |

**UI Sound Design:**
```
- Menu Select: Short blip, neutral tone
- Menu Confirm: Positive double-blip
- Menu Cancel: Lower, slightly negative tone
```

---

## Audio Implementation

### Loading Strategy

```typescript
// Priority loading order
const AUDIO_LOAD_ORDER = [
  // Critical (load immediately)
  'explosion',
  'bomb_place',
  'death',

  // High (load with game start)
  'powerup',
  'block_destroy',
  'bgm_game',

  // Medium (load in background)
  'bgm_menu',
  'victory',
  'countdown',

  // Low (lazy load)
  'menu_select',
  'menu_confirm',
  'walk',
];
```

### Playback Rules

```typescript
// Sound effect rules
const SFX_RULES = {
  // Maximum simultaneous instances
  maxInstances: {
    explosion: 4,      // Allow multiple explosions
    bomb_place: 2,     // Limit bomb sounds
    powerup: 1,        // One at a time
    walk: 1,           // Single footstep track
  },

  // Cooldown between plays (ms)
  cooldown: {
    explosion: 50,
    bomb_place: 100,
    walk: 150,
  },

  // Spatial audio settings
  spatial: {
    explosion: true,   // Position-based volume
    powerup: true,
    walk: false,       // Always local player volume
  },
};
```

### Volume Ducking

```typescript
// When these play, duck music volume
const DUCK_TRIGGERS = {
  explosion: { amount: 0.3, duration: 300 },
  death: { amount: 0.5, duration: 800 },
  victory: { amount: 0.6, duration: 1000 },
};
```

---

## Spatial Audio

### Distance-Based Volume

```typescript
// Volume falloff based on tile distance
function calculateVolume(
  sourcePos: Position,
  listenerPos: Position,
  baseVolume: number
): number {
  const distance = Math.sqrt(
    Math.pow(sourcePos.x - listenerPos.x, 2) +
    Math.pow(sourcePos.y - listenerPos.y, 2)
  );

  const maxDistance = 10; // tiles
  const minVolume = 0.2;

  const volumeFactor = Math.max(
    minVolume,
    1 - (distance / maxDistance)
  );

  return baseVolume * volumeFactor;
}
```

### Stereo Panning

```typescript
// Pan based on horizontal position relative to player
function calculatePan(
  sourceX: number,
  listenerX: number,
  maxPan: number = 0.7
): number {
  const fieldWidth = 15; // tiles
  const relativeX = (sourceX - listenerX) / fieldWidth;
  return Math.max(-maxPan, Math.min(maxPan, relativeX * 2));
}
```

---

## Audio State Machine

### Game States and Audio

```
MENU:
  - Play: bgm_menu (loop)
  - Available SFX: menu_*

LOBBY:
  - Play: bgm_menu (continue)
  - Available SFX: menu_*, chat notification

COUNTDOWN:
  - Fade: bgm_menu -> silence
  - Play: countdown (on each number)
  - Play: game_start (on "GO!")

PLAYING:
  - Play: bgm_game (loop)
  - Available SFX: all gameplay sounds

TENSION (last 30s):
  - Crossfade: bgm_game -> bgm_tension
  - Play: time_warning (periodic)

ROUND_END:
  - Stop: bgm_tension/bgm_game
  - Play: victory OR death (based on outcome)

VICTORY:
  - Play: bgm_victory (once)
  - Play: victory SFX
```

---

## Placeholder Audio

For development, use these placeholder approaches:

### Web Audio API Synthesis

```typescript
// Generate simple beep for placeholder
function generatePlaceholderBeep(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'square'
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample: number;

    switch (type) {
      case 'square':
        sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
        break;
      case 'triangle':
        sample = Math.asin(Math.sin(2 * Math.PI * frequency * t)) * 2 / Math.PI;
        break;
      default:
        sample = Math.sin(2 * Math.PI * frequency * t);
    }

    // Apply envelope
    const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
    data[i] = sample * envelope * 0.5;
  }

  return buffer;
}
```

### Placeholder Sound Mappings

```typescript
const PLACEHOLDER_SOUNDS = {
  explosion: { freq: 100, duration: 0.3, type: 'sawtooth' },
  bomb_place: { freq: 200, duration: 0.1, type: 'square' },
  powerup: { freq: 800, duration: 0.2, type: 'sine' },
  death: { freq: 400, duration: 0.5, type: 'triangle' },
  menu_select: { freq: 600, duration: 0.05, type: 'square' },
  menu_confirm: { freq: 800, duration: 0.1, type: 'square' },
};
```

---

## Asset Acquisition Notes

### Free Resources
- [Freesound.org](https://freesound.org) - Creative Commons sounds
- [OpenGameArt.org](https://opengameart.org) - Game-specific audio
- [Incompetech](https://incompetech.com) - Royalty-free music

### Recommended Tools
- **Music**: FamiTracker, LMMS, Bosca Ceoil
- **SFX**: Bfxr, ChipTone, jsfxr
- **Editing**: Audacity, Reaper

### Production Checklist
- [ ] Normalize all audio to -3dB peak
- [ ] Ensure clean loop points for looping tracks
- [ ] Test on multiple devices/speakers
- [ ] Verify format compatibility across browsers
- [ ] Create fallback OGG versions
- [ ] Compress for web delivery (<100KB per SFX)
- [ ] Document exact loop points in manifest

---

## File Size Targets

| Category | Target Size | Notes |
|----------|-------------|-------|
| Music Track | < 500KB | 2min at 32kbps |
| Major SFX | < 50KB | Explosion, death |
| Minor SFX | < 20KB | UI sounds |
| Total Audio | < 3MB | All assets combined |

---

## Browser Compatibility

### Supported Formats
- **Chrome/Edge**: MP3, OGG, WAV, WebM
- **Firefox**: MP3, OGG, WAV, WebM
- **Safari**: MP3, WAV, AAC

### Audio Context Considerations
```typescript
// Handle autoplay restrictions
let audioContext: AudioContext | null = null;

function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Resume on user interaction if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

// Call on first user click/tap
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });
```
