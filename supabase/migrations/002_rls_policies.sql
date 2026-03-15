-- ============================================================================
-- Bomberman Online - Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Created: 2024
-- Description: RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the profile ID for the current authenticated user (via Clerk JWT)
CREATE OR REPLACE FUNCTION auth.get_my_profile_id()
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id
  FROM profiles
  WHERE clerk_id = auth.jwt() ->> 'sub';
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a participant in a game
CREATE OR REPLACE FUNCTION auth.is_game_participant(game_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = game_uuid
    AND player_id = auth.get_my_profile_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a tournament participant
CREATE OR REPLACE FUNCTION auth.is_tournament_participant(tournament_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournament_participants
    WHERE tournament_id = tournament_uuid
    AND player_id = auth.get_my_profile_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if two users are friends
CREATE OR REPLACE FUNCTION auth.are_friends(other_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  my_id UUID := auth.get_my_profile_id();
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = my_id AND addressee_id = other_profile_id) OR
      (requester_id = other_profile_id AND addressee_id = my_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles (public leaderboard)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (TRUE);

-- Users can insert their own profile (via Clerk webhook)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (clerk_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- Users cannot delete profiles (handled by admin)
-- No delete policy = no deletes allowed

-- ============================================================================
-- MAPS POLICIES
-- ============================================================================

-- Anyone can view published or official maps
CREATE POLICY "maps_select_public"
  ON maps FOR SELECT
  USING (is_published = TRUE OR is_official = TRUE OR creator_id = auth.get_my_profile_id());

-- Authenticated users can create maps
CREATE POLICY "maps_insert_authenticated"
  ON maps FOR INSERT
  WITH CHECK (
    creator_id = auth.get_my_profile_id()
    AND is_official = FALSE -- Users cannot create official maps
  );

-- Users can update only their own non-official maps
CREATE POLICY "maps_update_own"
  ON maps FOR UPDATE
  USING (creator_id = auth.get_my_profile_id() AND is_official = FALSE)
  WITH CHECK (creator_id = auth.get_my_profile_id() AND is_official = FALSE);

-- Users can delete only their own non-official maps
CREATE POLICY "maps_delete_own"
  ON maps FOR DELETE
  USING (creator_id = auth.get_my_profile_id() AND is_official = FALSE);

-- ============================================================================
-- GAMES POLICIES
-- ============================================================================

-- Anyone can view public games (for spectating, history)
CREATE POLICY "games_select_public"
  ON games FOR SELECT
  USING (
    -- Public games
    (settings ->> 'isPrivate')::boolean IS NOT TRUE
    -- Or user is participant
    OR auth.is_game_participant(id)
    -- Or user is host
    OR host_id = auth.get_my_profile_id()
  );

-- Authenticated users can create games
CREATE POLICY "games_insert_authenticated"
  ON games FOR INSERT
  WITH CHECK (host_id = auth.get_my_profile_id());

-- Only host can update game settings while waiting
CREATE POLICY "games_update_host"
  ON games FOR UPDATE
  USING (host_id = auth.get_my_profile_id())
  WITH CHECK (host_id = auth.get_my_profile_id());

-- Host can delete/cancel game only while waiting
CREATE POLICY "games_delete_host"
  ON games FOR DELETE
  USING (host_id = auth.get_my_profile_id() AND status = 'waiting');

-- ============================================================================
-- GAME_PLAYERS POLICIES
-- ============================================================================

-- Participants and spectators can view game players
CREATE POLICY "game_players_select"
  ON game_players FOR SELECT
  USING (
    auth.is_game_participant(game_id)
    OR EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id
      AND (settings ->> 'isPrivate')::boolean IS NOT TRUE
    )
  );

-- Players can join games
CREATE POLICY "game_players_insert_self"
  ON game_players FOR INSERT
  WITH CHECK (
    player_id = auth.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id
      AND status = 'waiting'
    )
  );

-- Players can update their own record (ready status, etc.)
CREATE POLICY "game_players_update_self"
  ON game_players FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Players can leave games (while waiting)
CREATE POLICY "game_players_delete_self"
  ON game_players FOR DELETE
  USING (
    player_id = auth.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id
      AND status = 'waiting'
    )
  );

-- ============================================================================
-- ACHIEVEMENTS POLICIES
-- ============================================================================

-- Anyone can view achievements (public collection)
CREATE POLICY "achievements_select_public"
  ON achievements FOR SELECT
  USING (is_active = TRUE OR is_hidden = FALSE);

-- No insert/update/delete - admin only via service role

-- ============================================================================
-- PLAYER_ACHIEVEMENTS POLICIES
-- ============================================================================

-- Anyone can view player achievements (profile showcase)
CREATE POLICY "player_achievements_select_public"
  ON player_achievements FOR SELECT
  USING (TRUE);

-- System inserts achievements (via service role or trigger)
-- Players cannot manually unlock achievements
CREATE POLICY "player_achievements_insert_system"
  ON player_achievements FOR INSERT
  WITH CHECK (FALSE); -- Only service role can insert

-- Players can update notification status
CREATE POLICY "player_achievements_update_notification"
  ON player_achievements FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- ============================================================================
-- REPLAYS POLICIES
-- ============================================================================

-- Anyone can view public replays
CREATE POLICY "replays_select_public"
  ON replays FOR SELECT
  USING (
    is_public = TRUE
    OR EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = replays.game_id
      AND player_id = auth.get_my_profile_id()
    )
  );

-- Game participants can make replays private/public
CREATE POLICY "replays_update_participant"
  ON replays FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = replays.game_id
      AND player_id = auth.get_my_profile_id()
    )
  );

-- No direct insert/delete - handled by system

-- ============================================================================
-- TOURNAMENTS POLICIES
-- ============================================================================

-- Anyone can view public tournaments
CREATE POLICY "tournaments_select_public"
  ON tournaments FOR SELECT
  USING (status != 'draft' OR creator_id = auth.get_my_profile_id());

-- Authenticated users can create tournaments
CREATE POLICY "tournaments_insert_authenticated"
  ON tournaments FOR INSERT
  WITH CHECK (creator_id = auth.get_my_profile_id());

-- Creators can update their tournaments
CREATE POLICY "tournaments_update_creator"
  ON tournaments FOR UPDATE
  USING (creator_id = auth.get_my_profile_id())
  WITH CHECK (creator_id = auth.get_my_profile_id());

-- Creators can delete draft tournaments
CREATE POLICY "tournaments_delete_creator"
  ON tournaments FOR DELETE
  USING (creator_id = auth.get_my_profile_id() AND status = 'draft');

-- ============================================================================
-- TOURNAMENT_PARTICIPANTS POLICIES
-- ============================================================================

-- Anyone can view tournament participants
CREATE POLICY "tournament_participants_select_public"
  ON tournament_participants FOR SELECT
  USING (TRUE);

-- Players can register for tournaments
CREATE POLICY "tournament_participants_insert_self"
  ON tournament_participants FOR INSERT
  WITH CHECK (
    player_id = auth.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = tournament_id
      AND status = 'registration'
      AND current_players < max_players
    )
  );

-- Players can update their registration (check-in)
CREATE POLICY "tournament_participants_update_self"
  ON tournament_participants FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Players can withdraw during registration
CREATE POLICY "tournament_participants_delete_self"
  ON tournament_participants FOR DELETE
  USING (
    player_id = auth.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = tournament_id
      AND status IN ('registration', 'check_in')
    )
  );

-- ============================================================================
-- FRIENDSHIPS POLICIES
-- ============================================================================

-- Users can view friendships involving themselves
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT
  USING (
    requester_id = auth.get_my_profile_id()
    OR addressee_id = auth.get_my_profile_id()
  );

-- Users can send friend requests
CREATE POLICY "friendships_insert_requester"
  ON friendships FOR INSERT
  WITH CHECK (
    requester_id = auth.get_my_profile_id()
    AND requester_id != addressee_id
  );

-- Both parties can update status (accept, block, etc.)
CREATE POLICY "friendships_update_involved"
  ON friendships FOR UPDATE
  USING (
    requester_id = auth.get_my_profile_id()
    OR addressee_id = auth.get_my_profile_id()
  )
  WITH CHECK (
    requester_id = auth.get_my_profile_id()
    OR addressee_id = auth.get_my_profile_id()
  );

-- Either party can delete/cancel friendship
CREATE POLICY "friendships_delete_involved"
  ON friendships FOR DELETE
  USING (
    requester_id = auth.get_my_profile_id()
    OR addressee_id = auth.get_my_profile_id()
  );

-- ============================================================================
-- CHAT_MESSAGES POLICIES
-- ============================================================================

-- Game chat: participants can view
CREATE POLICY "chat_messages_select_game"
  ON chat_messages FOR SELECT
  USING (
    -- Game messages visible to participants
    (game_id IS NOT NULL AND auth.is_game_participant(game_id))
    -- Tournament messages visible to participants
    OR (tournament_id IS NOT NULL AND auth.is_tournament_participant(tournament_id))
    -- DMs visible to sender and recipient
    OR (recipient_id IS NOT NULL AND (
      sender_id = auth.get_my_profile_id()
      OR recipient_id = auth.get_my_profile_id()
    ))
  );

-- Authenticated users can send messages in appropriate contexts
CREATE POLICY "chat_messages_insert_authenticated"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.get_my_profile_id()
    AND (
      -- Game chat requires participation
      (game_id IS NOT NULL AND auth.is_game_participant(game_id))
      -- Tournament chat requires participation
      OR (tournament_id IS NOT NULL AND auth.is_tournament_participant(tournament_id))
      -- DMs require friendship (or allow all for simplicity)
      OR (recipient_id IS NOT NULL AND recipient_id != auth.get_my_profile_id())
    )
  );

-- No update on chat messages (immutable)
-- No delete for users (admin/moderation only)

-- ============================================================================
-- MAP_RATINGS POLICIES
-- ============================================================================

-- Anyone can view ratings
CREATE POLICY "map_ratings_select_public"
  ON map_ratings FOR SELECT
  USING (TRUE);

-- Authenticated users can rate maps
CREATE POLICY "map_ratings_insert_authenticated"
  ON map_ratings FOR INSERT
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can update their own ratings
CREATE POLICY "map_ratings_update_own"
  ON map_ratings FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can delete their own ratings
CREATE POLICY "map_ratings_delete_own"
  ON map_ratings FOR DELETE
  USING (player_id = auth.get_my_profile_id());

-- ============================================================================
-- MAP_FAVORITES POLICIES
-- ============================================================================

-- Users can view their own favorites
CREATE POLICY "map_favorites_select_own"
  ON map_favorites FOR SELECT
  USING (player_id = auth.get_my_profile_id());

-- Users can add favorites
CREATE POLICY "map_favorites_insert_own"
  ON map_favorites FOR INSERT
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can remove favorites
CREATE POLICY "map_favorites_delete_own"
  ON map_favorites FOR DELETE
  USING (player_id = auth.get_my_profile_id());

-- ============================================================================
-- PLAYER_REPORTS POLICIES
-- ============================================================================

-- Users cannot view reports (admin only)
-- No select policy = no reads allowed (except service role)

-- Users can create reports
CREATE POLICY "player_reports_insert_authenticated"
  ON player_reports FOR INSERT
  WITH CHECK (
    reporter_id = auth.get_my_profile_id()
    AND reporter_id != reported_id -- Cannot report self
  );

-- No update/delete for users

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (player_id = auth.get_my_profile_id());

-- System creates notifications (service role)
CREATE POLICY "notifications_insert_system"
  ON notifications FOR INSERT
  WITH CHECK (FALSE); -- Only service role

-- Users can mark notifications as read
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can delete their notifications
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (player_id = auth.get_my_profile_id());

-- ============================================================================
-- MATCHMAKING_QUEUE POLICIES
-- ============================================================================

-- Users can only view their own queue entry
CREATE POLICY "matchmaking_queue_select_own"
  ON matchmaking_queue FOR SELECT
  USING (player_id = auth.get_my_profile_id());

-- Users can join the queue
CREATE POLICY "matchmaking_queue_insert_own"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can update their queue entry
CREATE POLICY "matchmaking_queue_update_own"
  ON matchmaking_queue FOR UPDATE
  USING (player_id = auth.get_my_profile_id())
  WITH CHECK (player_id = auth.get_my_profile_id());

-- Users can leave the queue
CREATE POLICY "matchmaking_queue_delete_own"
  ON matchmaking_queue FOR DELETE
  USING (player_id = auth.get_my_profile_id());

-- ============================================================================
-- SERVICE ROLE BYPASS
-- Note: Service role automatically bypasses RLS
-- This allows the game server and webhooks to perform admin operations
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
