-- Bomberman Online Database Schema
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if any (for clean setup)
DROP TABLE IF EXISTS match_participants CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS replays CASCADE;
DROP TABLE IF EXISTS maps CASCADE;
DROP TABLE IF EXISTS power_ups CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  elo_rating INTEGER DEFAULT 1200,
  rank TEXT DEFAULT 'bronze',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_bombs_placed INTEGER DEFAULT 0,
  total_powerups_collected INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_elo_rating ON profiles(elo_rating DESC);

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  map_id UUID,
  game_mode TEXT CHECK (game_mode IN ('classic', 'team', 'tournament', 'custom')) DEFAULT 'classic',
  max_players INTEGER DEFAULT 4,
  status TEXT CHECK (status IN ('waiting', 'active', 'finished', 'abandoned')) DEFAULT 'waiting',
  winner_id UUID REFERENCES profiles(id),
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_room_code ON matches(room_code);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- ============================================
-- MATCH PARTICIPANTS TABLE
-- ============================================
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team TEXT,
  placement INTEGER,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  bombs_placed INTEGER DEFAULT 0,
  powerups_collected INTEGER DEFAULT 0,
  elo_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_player_id ON match_participants(player_id);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('combat', 'skill', 'social', 'milestone')) DEFAULT 'milestone',
  icon_url TEXT,
  points INTEGER DEFAULT 10,
  requirement_type TEXT,
  requirement_value INTEGER,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- ============================================
-- TOURNAMENTS TABLE
-- ============================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  format TEXT CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin')) DEFAULT 'single_elimination',
  max_participants INTEGER DEFAULT 16,
  entry_fee INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('upcoming', 'registration', 'active', 'finished', 'cancelled')) DEFAULT 'upcoming',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_starts_at ON tournaments(starts_at);

-- ============================================
-- TOURNAMENT PARTICIPANTS TABLE
-- ============================================
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seed INTEGER,
  placement INTEGER,
  eliminated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_player_id ON tournament_participants(player_id);

-- ============================================
-- MAPS TABLE
-- ============================================
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  thumbnail_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  created_by UUID REFERENCES profiles(id),
  is_official BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maps_name ON maps(name);
CREATE INDEX idx_maps_difficulty ON maps(difficulty);
CREATE INDEX idx_maps_is_official ON maps(is_official);

-- ============================================
-- REPLAYS TABLE
-- ============================================
CREATE TABLE replays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  replay_data JSONB NOT NULL,
  duration_seconds INTEGER NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replays_match_id ON replays(match_id);

-- ============================================
-- ROOMS TABLE (Active Game Lobbies)
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  map_id UUID REFERENCES maps(id),
  game_mode TEXT CHECK (game_mode IN ('classic', 'team', 'tournament', 'custom')) DEFAULT 'classic',
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  status TEXT CHECK (status IN ('waiting', 'starting', 'active')) DEFAULT 'waiting',
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_is_private ON rooms(is_private);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'system', 'emote', 'command')) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, users can update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Friendships: Users can manage their own friendships
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
         OR friend_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their friendships"
  ON friendships FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
         OR friend_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Matches: Public read, system write
CREATE POLICY "Matches are viewable by everyone"
  ON matches FOR SELECT
  USING (true);

-- Match Participants: Public read
CREATE POLICY "Match participants are viewable by everyone"
  ON match_participants FOR SELECT
  USING (true);

-- Achievements: Public read
CREATE POLICY "Achievements are viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

-- User Achievements: Users can view their own and others' unlocked achievements
CREATE POLICY "User achievements are viewable"
  ON user_achievements FOR SELECT
  USING (true);

-- Tournaments: Public read
CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  USING (true);

-- Tournament Participants: Public read
CREATE POLICY "Tournament participants are viewable by everyone"
  ON tournament_participants FOR SELECT
  USING (true);

-- Maps: Public read
CREATE POLICY "Maps are viewable by everyone"
  ON maps FOR SELECT
  USING (true);

-- Replays: Public read
CREATE POLICY "Replays are viewable by everyone"
  ON replays FOR SELECT
  USING (true);

-- Rooms: Public read
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (true);

-- Chat Messages: Users can read messages from rooms they're in
CREATE POLICY "Chat messages are viewable in rooms"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can send chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update updated_at timestamp
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

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update profile stats after match
CREATE OR REPLACE FUNCTION update_profile_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    total_matches = total_matches + 1,
    wins = wins + CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN NEW.placement > 1 THEN 1 ELSE 0 END,
    total_kills = total_kills + NEW.kills,
    total_deaths = total_deaths + NEW.deaths,
    total_bombs_placed = total_bombs_placed + NEW.bombs_placed,
    total_powerups_collected = total_powerups_collected + NEW.powerups_collected,
    elo_rating = elo_rating + NEW.elo_change,
    win_streak = CASE WHEN NEW.placement = 1 THEN win_streak + 1 ELSE 0 END,
    best_win_streak = CASE
      WHEN NEW.placement = 1 AND win_streak + 1 > best_win_streak
      THEN win_streak + 1
      ELSE best_win_streak
    END
  WHERE id = NEW.player_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_stats
  AFTER INSERT ON match_participants
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats_after_match();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default achievements
INSERT INTO achievements (name, description, category, points, requirement_type, requirement_value) VALUES
  ('First Blood', 'Get your first kill', 'combat', 10, 'kills', 1),
  ('Bomber', 'Place 100 bombs', 'combat', 20, 'bombs_placed', 100),
  ('Survivor', 'Win without dying', 'skill', 30, 'win_no_deaths', 1),
  ('Master Bomber', 'Place 1000 bombs', 'combat', 50, 'bombs_placed', 1000),
  ('Winning Streak', 'Win 5 games in a row', 'milestone', 40, 'win_streak', 5),
  ('Social Butterfly', 'Add 10 friends', 'social', 15, 'friends', 10),
  ('Tournament Victor', 'Win a tournament', 'milestone', 100, 'tournament_wins', 1),
  ('Untouchable', 'Win 10 games without dying', 'skill', 75, 'flawless_wins', 10),
  ('Collector', 'Collect 500 powerups', 'milestone', 25, 'powerups_collected', 500),
  ('Veteran', 'Play 100 matches', 'milestone', 50, 'total_matches', 100);

-- Insert default maps
INSERT INTO maps (name, description, layout, difficulty, is_official) VALUES
  ('Classic Arena', 'The original Bomberman map', '{"width": 15, "height": 13, "walls": []}', 'easy', true),
  ('Maze Runner', 'Navigate through tight corridors', '{"width": 17, "height": 15, "walls": []}', 'medium', true),
  ('Open Field', 'Wide open spaces for strategic play', '{"width": 19, "height": 17, "walls": []}', 'easy', true),
  ('Death Trap', 'Dangerous layout with limited escape routes', '{"width": 15, "height": 13, "walls": []}', 'hard', true);

-- ============================================
-- VIEWS
-- ============================================

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  elo_rating,
  rank,
  wins,
  losses,
  total_matches,
  CASE
    WHEN total_matches > 0 THEN ROUND((wins::DECIMAL / total_matches) * 100, 2)
    ELSE 0
  END as win_rate,
  win_streak,
  best_win_streak
FROM profiles
ORDER BY elo_rating DESC;

COMMENT ON TABLE profiles IS 'User profiles with stats and rankings';
COMMENT ON TABLE matches IS 'Game matches with results';
COMMENT ON TABLE achievements IS 'Available achievements in the game';
COMMENT ON TABLE tournaments IS 'Competitive tournaments';
COMMENT ON TABLE maps IS 'Game maps and layouts';
COMMENT ON TABLE rooms IS 'Active game lobbies';
