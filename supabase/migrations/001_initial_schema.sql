-- ============================================================================
-- Bomberman Online - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2024
-- Description: Core tables for multiplayer Bomberman game
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- PROFILES TABLE
-- User profiles synced from Clerk authentication
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country_code VARCHAR(2),

  -- ELO and Ranking
  elo_rating INTEGER DEFAULT 1000 NOT NULL,
  peak_elo INTEGER DEFAULT 1000 NOT NULL,
  rank_tier TEXT DEFAULT 'bronze' CHECK (rank_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster')),

  -- Lifetime Statistics
  total_wins INTEGER DEFAULT 0 NOT NULL,
  total_losses INTEGER DEFAULT 0 NOT NULL,
  total_games INTEGER DEFAULT 0 NOT NULL,
  total_kills INTEGER DEFAULT 0 NOT NULL,
  total_deaths INTEGER DEFAULT 0 NOT NULL,
  total_bombs_placed INTEGER DEFAULT 0 NOT NULL,
  total_powerups_collected INTEGER DEFAULT 0 NOT NULL,
  total_playtime_seconds INTEGER DEFAULT 0 NOT NULL,

  -- Streaks
  current_win_streak INTEGER DEFAULT 0 NOT NULL,
  best_win_streak INTEGER DEFAULT 0 NOT NULL,

  -- Preferences
  preferred_color INTEGER DEFAULT 0 CHECK (preferred_color >= 0 AND preferred_color <= 7),
  settings JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- MAPS TABLE
-- Custom and official game maps
-- ============================================================================
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Map Info
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Map Data
  width INTEGER NOT NULL DEFAULT 15 CHECK (width >= 9 AND width <= 31),
  height INTEGER NOT NULL DEFAULT 13 CHECK (height >= 9 AND height <= 25),
  tiles JSONB NOT NULL, -- 2D array of tile types
  spawn_points JSONB NOT NULL, -- Array of {x, y} positions
  powerup_distribution JSONB DEFAULT '{}'::jsonb, -- Probability weights for powerups

  -- Flags
  is_official BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Stats
  play_count INTEGER DEFAULT 0 NOT NULL,
  likes INTEGER DEFAULT 0 NOT NULL,
  dislikes INTEGER DEFAULT 0 NOT NULL,
  average_rating DECIMAL(3,2) DEFAULT 0.00,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_map_id UUID REFERENCES maps(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ
);

-- ============================================================================
-- GAMES TABLE
-- Game session records
-- ============================================================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Room Info
  room_code TEXT UNIQUE,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'playing', 'intermission', 'finished', 'cancelled')),

  -- Game Configuration
  map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{
    "maxPlayers": 4,
    "roundTime": 180,
    "roundsToWin": 3,
    "suddenDeathTime": 60,
    "powerupSpawnRate": 0.3,
    "allowSpectators": true
  }'::jsonb,

  -- Results
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rounds_played INTEGER DEFAULT 0,

  -- Match Type
  game_type TEXT DEFAULT 'casual' CHECK (game_type IN ('casual', 'ranked', 'custom', 'tournament', 'private')),
  tournament_id UUID, -- FK added after tournaments table
  tournament_round INTEGER,
  tournament_match INTEGER,

  -- Server Info
  server_region TEXT,
  server_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- ============================================================================
-- GAME_PLAYERS TABLE
-- Players participating in games with stats
-- ============================================================================
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Position/Slot
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 16),
  character_color INTEGER DEFAULT 0 CHECK (character_color >= 0 AND character_color <= 7),
  team_id INTEGER, -- For team modes

  -- Status
  is_ready BOOLEAN DEFAULT FALSE,
  is_spectator BOOLEAN DEFAULT FALSE,
  connection_status TEXT DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'reconnecting')),

  -- Game Stats (per match)
  kills INTEGER DEFAULT 0 NOT NULL,
  deaths INTEGER DEFAULT 0 NOT NULL,
  self_destructs INTEGER DEFAULT 0 NOT NULL,
  bombs_placed INTEGER DEFAULT 0 NOT NULL,
  powerups_collected INTEGER DEFAULT 0 NOT NULL,
  blocks_destroyed INTEGER DEFAULT 0 NOT NULL,
  damage_dealt INTEGER DEFAULT 0 NOT NULL,

  -- Round Stats
  rounds_won INTEGER DEFAULT 0 NOT NULL,
  rounds_survived INTEGER DEFAULT 0 NOT NULL,

  -- Final Results
  placement INTEGER, -- 1st, 2nd, 3rd, etc.
  elo_before INTEGER,
  elo_after INTEGER,
  elo_change INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ,

  UNIQUE(game_id, player_id),
  UNIQUE(game_id, slot_number)
);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- Achievement definitions
-- ============================================================================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('combat', 'survival', 'social', 'progression', 'special', 'seasonal', 'secret')),

  -- Display
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,

  -- Rarity and Points
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 10 NOT NULL,

  -- Unlock Criteria
  criteria JSONB NOT NULL, -- { "type": "kills", "target": 100 } etc.
  is_hidden BOOLEAN DEFAULT FALSE, -- Secret achievements
  is_repeatable BOOLEAN DEFAULT FALSE, -- Can unlock multiple times

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PLAYER_ACHIEVEMENTS TABLE
-- Unlocked achievements per player
-- ============================================================================
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  -- Progress (for progressive achievements)
  progress INTEGER DEFAULT 0,
  progress_max INTEGER DEFAULT 1,

  -- Unlock Info
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  game_id UUID REFERENCES games(id) ON DELETE SET NULL, -- Game where it was unlocked

  -- For repeatable achievements
  unlock_count INTEGER DEFAULT 1,

  -- Notification
  is_notified BOOLEAN DEFAULT FALSE,

  UNIQUE(player_id, achievement_id)
);

-- ============================================================================
-- REPLAYS TABLE
-- Recorded game data for playback
-- ============================================================================
CREATE TABLE replays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID UNIQUE REFERENCES games(id) ON DELETE CASCADE,

  -- Replay Info
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,

  -- Data
  data BYTEA, -- Compressed replay data
  data_url TEXT, -- Alternative: URL to stored replay file
  format_version INTEGER DEFAULT 1,

  -- Stats
  duration_seconds INTEGER NOT NULL,
  tick_count INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  file_size_bytes INTEGER,

  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Stats
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,

  -- Highlights (timestamps of interesting moments)
  highlights JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ -- Auto-delete old replays
);

-- ============================================================================
-- TOURNAMENTS TABLE
-- Tournament definitions and state
-- ============================================================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'check_in', 'active', 'finished', 'cancelled')),

  -- Format
  format TEXT NOT NULL CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss')),
  game_settings JSONB DEFAULT '{}'::jsonb,
  map_pool JSONB DEFAULT '[]'::jsonb, -- Array of map IDs

  -- Players
  min_players INTEGER DEFAULT 4,
  max_players INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,

  -- Prizes
  prize_pool JSONB DEFAULT '{}'::jsonb, -- { "1st": "...", "2nd": "..." }
  entry_fee INTEGER DEFAULT 0,

  -- Bracket Data
  bracket_data JSONB DEFAULT '{}'::jsonb,
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER,

  -- Rules
  rules_text TEXT,
  check_in_required BOOLEAN DEFAULT FALSE,
  check_in_duration_minutes INTEGER DEFAULT 30,

  -- Timestamps
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  check_in_opens_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK to games table now that tournaments exists
ALTER TABLE games ADD CONSTRAINT games_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;

-- ============================================================================
-- TOURNAMENT_PARTICIPANTS TABLE
-- Players registered for tournaments
-- ============================================================================
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Registration
  seed INTEGER, -- Seeding position
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  checked_in_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'active', 'eliminated', 'winner', 'disqualified', 'no_show')),

  -- Results
  final_placement INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,

  -- Double elimination specific
  bracket_position TEXT, -- 'winners', 'losers'

  UNIQUE(tournament_id, player_id)
);

-- ============================================================================
-- FRIENDSHIPS TABLE
-- Friend relationships between players
-- ============================================================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),

  -- Metadata
  message TEXT, -- Optional friend request message

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,

  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- In-game and lobby chat messages
-- ============================================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context (one must be set)
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For DMs

  -- Sender
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'quick_chat')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Moderation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- At least one context must be set
  CHECK (game_id IS NOT NULL OR tournament_id IS NOT NULL OR recipient_id IS NOT NULL)
);

-- ============================================================================
-- MAP_RATINGS TABLE
-- User ratings for community maps
-- ============================================================================
CREATE TABLE map_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(map_id, player_id)
);

-- ============================================================================
-- MAP_FAVORITES TABLE
-- User favorited maps
-- ============================================================================
CREATE TABLE map_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(map_id, player_id)
);

-- ============================================================================
-- PLAYER_REPORTS TABLE
-- Player reports for moderation
-- ============================================================================
CREATE TABLE player_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,

  reason TEXT NOT NULL CHECK (reason IN ('cheating', 'harassment', 'inappropriate_name', 'griefing', 'other')),
  description TEXT,
  evidence_urls JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- User notifications
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type and Content
  type TEXT NOT NULL CHECK (type IN (
    'friend_request', 'friend_accepted',
    'game_invite', 'tournament_invite',
    'tournament_starting', 'tournament_match_ready',
    'achievement_unlocked', 'rank_changed',
    'system_message'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Action
  action_url TEXT,
  action_data JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ
);

-- ============================================================================
-- MATCHMAKING_QUEUE TABLE
-- Players waiting for matches
-- ============================================================================
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Preferences
  game_type TEXT NOT NULL DEFAULT 'ranked' CHECK (game_type IN ('casual', 'ranked')),
  region_preferences JSONB DEFAULT '["auto"]'::jsonb,

  -- Matching Data
  elo_rating INTEGER NOT NULL,
  elo_range_min INTEGER,
  elo_range_max INTEGER,

  -- Party
  party_id UUID, -- Players in same party
  party_leader BOOLEAN DEFAULT TRUE,

  -- Status
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matching', 'found', 'cancelled')),

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expanded_at TIMESTAMPTZ, -- When search criteria expanded
  matched_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_elo_rating ON profiles(elo_rating DESC);
CREATE INDEX idx_profiles_rank_tier ON profiles(rank_tier);
CREATE INDEX idx_profiles_total_wins ON profiles(total_wins DESC);
CREATE INDEX idx_profiles_total_games ON profiles(total_games DESC);
CREATE INDEX idx_profiles_is_online ON profiles(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Maps
CREATE INDEX idx_maps_creator_id ON maps(creator_id);
CREATE INDEX idx_maps_is_official ON maps(is_official) WHERE is_official = TRUE;
CREATE INDEX idx_maps_is_published ON maps(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_maps_is_featured ON maps(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_maps_play_count ON maps(play_count DESC);
CREATE INDEX idx_maps_likes ON maps(likes DESC);
CREATE INDEX idx_maps_created_at ON maps(created_at DESC);
CREATE INDEX idx_maps_name_trgm ON maps USING gin(name gin_trgm_ops);

-- Games
CREATE INDEX idx_games_room_code ON games(room_code) WHERE room_code IS NOT NULL;
CREATE INDEX idx_games_host_id ON games(host_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_status_waiting ON games(status) WHERE status = 'waiting';
CREATE INDEX idx_games_game_type ON games(game_type);
CREATE INDEX idx_games_tournament_id ON games(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_finished_at ON games(finished_at DESC) WHERE finished_at IS NOT NULL;

-- Game Players
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_id ON game_players(player_id);
CREATE INDEX idx_game_players_placement ON game_players(placement) WHERE placement IS NOT NULL;

-- Achievements
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_is_active ON achievements(is_active) WHERE is_active = TRUE;

-- Player Achievements
CREATE INDEX idx_player_achievements_player_id ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_achievement_id ON player_achievements(achievement_id);
CREATE INDEX idx_player_achievements_unlocked_at ON player_achievements(unlocked_at DESC);

-- Replays
CREATE INDEX idx_replays_game_id ON replays(game_id);
CREATE INDEX idx_replays_is_public ON replays(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_replays_is_featured ON replays(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_replays_created_at ON replays(created_at DESC);
CREATE INDEX idx_replays_view_count ON replays(view_count DESC);

-- Tournaments
CREATE INDEX idx_tournaments_creator_id ON tournaments(creator_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX idx_tournaments_registration ON tournaments(status, registration_closes_at)
  WHERE status = 'registration';

-- Tournament Participants
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_player_id ON tournament_participants(player_id);
CREATE INDEX idx_tournament_participants_status ON tournament_participants(status);

-- Friendships
CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_pending ON friendships(addressee_id, status) WHERE status = 'pending';

-- Chat Messages
CREATE INDEX idx_chat_messages_game_id ON chat_messages(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX idx_chat_messages_tournament_id ON chat_messages(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Map Ratings
CREATE INDEX idx_map_ratings_map_id ON map_ratings(map_id);
CREATE INDEX idx_map_ratings_player_id ON map_ratings(player_id);

-- Map Favorites
CREATE INDEX idx_map_favorites_map_id ON map_favorites(map_id);
CREATE INDEX idx_map_favorites_player_id ON map_favorites(player_id);

-- Player Reports
CREATE INDEX idx_player_reports_reported_id ON player_reports(reported_id);
CREATE INDEX idx_player_reports_status ON player_reports(status) WHERE status = 'pending';

-- Notifications
CREATE INDEX idx_notifications_player_id ON notifications(player_id);
CREATE INDEX idx_notifications_unread ON notifications(player_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Matchmaking Queue
CREATE INDEX idx_matchmaking_queue_player_id ON matchmaking_queue(player_id);
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue(status) WHERE status = 'searching';
CREATE INDEX idx_matchmaking_queue_elo ON matchmaking_queue(elo_rating);
CREATE INDEX idx_matchmaking_queue_party ON matchmaking_queue(party_id) WHERE party_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_map_ratings_updated_at
  BEFORE UPDATE ON map_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
