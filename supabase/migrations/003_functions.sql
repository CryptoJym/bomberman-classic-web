-- ============================================================================
-- Bomberman Online - Database Functions
-- Migration: 003_functions.sql
-- Created: 2024
-- Description: Stored procedures and functions for game logic
-- ============================================================================

-- ============================================================================
-- ELO RATING FUNCTIONS
-- ============================================================================

-- Calculate expected score for ELO
CREATE OR REPLACE FUNCTION calculate_expected_score(player_rating INTEGER, opponent_rating INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10, (opponent_rating - player_rating)::DECIMAL / 400));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update ELO ratings after a match
-- K-factor varies based on rating and games played
CREATE OR REPLACE FUNCTION update_elo(
  winner_uuid UUID,
  loser_uuid UUID,
  is_ranked BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  winner_new_elo INTEGER,
  winner_elo_change INTEGER,
  loser_new_elo INTEGER,
  loser_elo_change INTEGER
) AS $$
DECLARE
  winner_current_elo INTEGER;
  loser_current_elo INTEGER;
  winner_games INTEGER;
  loser_games INTEGER;
  winner_k_factor INTEGER;
  loser_k_factor INTEGER;
  winner_expected DECIMAL;
  loser_expected DECIMAL;
  winner_change INTEGER;
  loser_change INTEGER;
BEGIN
  -- Get current ratings and games
  SELECT elo_rating, total_games INTO winner_current_elo, winner_games
  FROM profiles WHERE id = winner_uuid;

  SELECT elo_rating, total_games INTO loser_current_elo, loser_games
  FROM profiles WHERE id = loser_uuid;

  -- Only update ELO for ranked games
  IF NOT is_ranked THEN
    RETURN QUERY SELECT
      winner_current_elo,
      0,
      loser_current_elo,
      0;
    RETURN;
  END IF;

  -- Calculate K-factor based on rating and experience
  -- New players (< 30 games): K = 40
  -- Intermediate: K = 20
  -- High rated (> 2000): K = 10
  IF winner_games < 30 THEN
    winner_k_factor := 40;
  ELSIF winner_current_elo > 2000 THEN
    winner_k_factor := 10;
  ELSE
    winner_k_factor := 20;
  END IF;

  IF loser_games < 30 THEN
    loser_k_factor := 40;
  ELSIF loser_current_elo > 2000 THEN
    loser_k_factor := 10;
  ELSE
    loser_k_factor := 20;
  END IF;

  -- Calculate expected scores
  winner_expected := calculate_expected_score(winner_current_elo, loser_current_elo);
  loser_expected := calculate_expected_score(loser_current_elo, winner_current_elo);

  -- Calculate ELO changes (winner scored 1, loser scored 0)
  winner_change := ROUND(winner_k_factor * (1 - winner_expected));
  loser_change := ROUND(loser_k_factor * (0 - loser_expected));

  -- Ensure minimum change of 1 for winner
  IF winner_change < 1 THEN
    winner_change := 1;
  END IF;

  -- Ensure minimum loss of 1 for loser
  IF loser_change > -1 THEN
    loser_change := -1;
  END IF;

  -- Update winner
  UPDATE profiles SET
    elo_rating = GREATEST(100, elo_rating + winner_change), -- Minimum 100 ELO
    peak_elo = GREATEST(peak_elo, elo_rating + winner_change),
    total_wins = total_wins + 1,
    total_games = total_games + 1,
    current_win_streak = current_win_streak + 1,
    best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
    rank_tier = calculate_rank_tier(elo_rating + winner_change),
    updated_at = NOW()
  WHERE id = winner_uuid;

  -- Update loser
  UPDATE profiles SET
    elo_rating = GREATEST(100, elo_rating + loser_change), -- Minimum 100 ELO
    total_losses = total_losses + 1,
    total_games = total_games + 1,
    current_win_streak = 0, -- Reset streak
    rank_tier = calculate_rank_tier(elo_rating + loser_change),
    updated_at = NOW()
  WHERE id = loser_uuid;

  -- Return the changes
  RETURN QUERY SELECT
    (winner_current_elo + winner_change)::INTEGER,
    winner_change::INTEGER,
    (loser_current_elo + loser_change)::INTEGER,
    loser_change::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate rank tier based on ELO
CREATE OR REPLACE FUNCTION calculate_rank_tier(elo INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN elo >= 2400 THEN 'grandmaster'
    WHEN elo >= 2200 THEN 'master'
    WHEN elo >= 2000 THEN 'diamond'
    WHEN elo >= 1800 THEN 'platinum'
    WHEN elo >= 1600 THEN 'gold'
    WHEN elo >= 1400 THEN 'silver'
    ELSE 'bronze'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update ELO for multiplayer games (more than 2 players)
-- Uses placement-based scoring
CREATE OR REPLACE FUNCTION update_elo_multiplayer(game_uuid UUID)
RETURNS VOID AS $$
DECLARE
  player_record RECORD;
  opponent_record RECORD;
  player_expected DECIMAL;
  player_actual DECIMAL;
  k_factor INTEGER;
  total_players INTEGER;
  elo_change INTEGER;
  avg_opponent_elo DECIMAL;
BEGIN
  -- Get total player count
  SELECT COUNT(*) INTO total_players
  FROM game_players
  WHERE game_id = game_uuid AND NOT is_spectator;

  IF total_players < 2 THEN
    RETURN;
  END IF;

  -- Process each player
  FOR player_record IN
    SELECT gp.*, p.elo_rating, p.total_games
    FROM game_players gp
    JOIN profiles p ON p.id = gp.player_id
    WHERE gp.game_id = game_uuid AND NOT gp.is_spectator
    ORDER BY gp.placement
  LOOP
    -- Calculate actual score based on placement (1st = 1.0, last = 0.0)
    player_actual := 1.0 - ((player_record.placement - 1)::DECIMAL / (total_players - 1));

    -- Calculate average opponent ELO
    SELECT AVG(p.elo_rating) INTO avg_opponent_elo
    FROM game_players gp
    JOIN profiles p ON p.id = gp.player_id
    WHERE gp.game_id = game_uuid
      AND gp.player_id != player_record.player_id
      AND NOT gp.is_spectator;

    -- Calculate expected score
    player_expected := calculate_expected_score(player_record.elo_rating, avg_opponent_elo::INTEGER);

    -- K-factor
    IF player_record.total_games < 30 THEN
      k_factor := 40;
    ELSIF player_record.elo_rating > 2000 THEN
      k_factor := 10;
    ELSE
      k_factor := 20;
    END IF;

    -- Calculate change (scaled for number of opponents)
    elo_change := ROUND(k_factor * (total_players - 1) * (player_actual - player_expected) / 2);

    -- Update game_players with ELO change
    UPDATE game_players SET
      elo_before = player_record.elo_rating,
      elo_after = GREATEST(100, player_record.elo_rating + elo_change),
      elo_change = elo_change
    WHERE game_id = game_uuid AND player_id = player_record.player_id;

    -- Update profile
    UPDATE profiles SET
      elo_rating = GREATEST(100, elo_rating + elo_change),
      peak_elo = GREATEST(peak_elo, elo_rating + elo_change),
      total_wins = total_wins + CASE WHEN player_record.placement = 1 THEN 1 ELSE 0 END,
      total_losses = total_losses + CASE WHEN player_record.placement = total_players THEN 1 ELSE 0 END,
      total_games = total_games + 1,
      current_win_streak = CASE
        WHEN player_record.placement = 1 THEN current_win_streak + 1
        ELSE 0
      END,
      best_win_streak = CASE
        WHEN player_record.placement = 1 THEN GREATEST(best_win_streak, current_win_streak + 1)
        ELSE best_win_streak
      END,
      rank_tier = calculate_rank_tier(GREATEST(100, elo_rating + elo_change)),
      updated_at = NOW()
    WHERE id = player_record.player_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- LEADERBOARD FUNCTIONS
-- ============================================================================

-- Get global leaderboard with efficient pagination
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_time_filter TEXT DEFAULT 'all_time', -- 'daily', 'weekly', 'monthly', 'all_time'
  p_sort_by TEXT DEFAULT 'elo_rating' -- 'elo_rating', 'total_wins', 'total_kills', 'win_rate'
)
RETURNS TABLE(
  rank BIGINT,
  player_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER,
  rank_tier TEXT,
  total_wins INTEGER,
  total_games INTEGER,
  total_kills INTEGER,
  win_rate DECIMAL,
  country_code VARCHAR(2)
) AS $$
DECLARE
  time_start TIMESTAMPTZ;
BEGIN
  -- Determine time filter
  time_start := CASE p_time_filter
    WHEN 'daily' THEN NOW() - INTERVAL '1 day'
    WHEN 'weekly' THEN NOW() - INTERVAL '1 week'
    WHEN 'monthly' THEN NOW() - INTERVAL '1 month'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;

  IF p_time_filter = 'all_time' THEN
    -- Use simple query for all-time stats
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE p_sort_by
          WHEN 'elo_rating' THEN p.elo_rating
          WHEN 'total_wins' THEN p.total_wins
          WHEN 'total_kills' THEN p.total_kills
          WHEN 'win_rate' THEN CASE WHEN p.total_games > 0 THEN (p.total_wins * 100 / p.total_games) ELSE 0 END
          ELSE p.elo_rating
        END DESC
      ) AS rank,
      p.id AS player_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.elo_rating,
      p.rank_tier,
      p.total_wins,
      p.total_games,
      p.total_kills,
      CASE WHEN p.total_games > 0
        THEN ROUND((p.total_wins::DECIMAL / p.total_games) * 100, 2)
        ELSE 0.00
      END AS win_rate,
      p.country_code
    FROM profiles p
    WHERE p.total_games > 0 AND p.is_banned = FALSE
    ORDER BY
      CASE p_sort_by
        WHEN 'elo_rating' THEN p.elo_rating
        WHEN 'total_wins' THEN p.total_wins
        WHEN 'total_kills' THEN p.total_kills
        WHEN 'win_rate' THEN CASE WHEN p.total_games > 0 THEN (p.total_wins * 100 / p.total_games) ELSE 0 END
        ELSE p.elo_rating
      END DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Calculate from game history for time-based leaderboards
    RETURN QUERY
    WITH time_stats AS (
      SELECT
        gp.player_id,
        COUNT(*) AS games,
        SUM(CASE WHEN gp.placement = 1 THEN 1 ELSE 0 END) AS wins,
        SUM(gp.kills) AS kills,
        SUM(gp.elo_change) AS elo_gained
      FROM game_players gp
      JOIN games g ON g.id = gp.game_id
      WHERE g.finished_at >= time_start
        AND g.status = 'finished'
        AND NOT gp.is_spectator
      GROUP BY gp.player_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE p_sort_by
          WHEN 'elo_rating' THEN p.elo_rating
          WHEN 'total_wins' THEN ts.wins
          WHEN 'total_kills' THEN ts.kills
          WHEN 'win_rate' THEN CASE WHEN ts.games > 0 THEN (ts.wins * 100 / ts.games) ELSE 0 END
          ELSE p.elo_rating
        END DESC
      ) AS rank,
      p.id AS player_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.elo_rating,
      p.rank_tier,
      ts.wins::INTEGER AS total_wins,
      ts.games::INTEGER AS total_games,
      ts.kills::INTEGER AS total_kills,
      CASE WHEN ts.games > 0
        THEN ROUND((ts.wins::DECIMAL / ts.games) * 100, 2)
        ELSE 0.00
      END AS win_rate,
      p.country_code
    FROM profiles p
    JOIN time_stats ts ON ts.player_id = p.id
    WHERE p.is_banned = FALSE
    ORDER BY
      CASE p_sort_by
        WHEN 'elo_rating' THEN p.elo_rating
        WHEN 'total_wins' THEN ts.wins
        WHEN 'total_kills' THEN ts.kills
        WHEN 'win_rate' THEN CASE WHEN ts.games > 0 THEN (ts.wins * 100 / ts.games) ELSE 0 END
        ELSE p.elo_rating
      END DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get player's rank
CREATE OR REPLACE FUNCTION get_player_rank(player_uuid UUID)
RETURNS TABLE(
  global_rank INTEGER,
  tier_rank INTEGER,
  percentile DECIMAL
) AS $$
DECLARE
  player_elo INTEGER;
  player_tier TEXT;
  total_ranked INTEGER;
  higher_count INTEGER;
  tier_count INTEGER;
  tier_higher INTEGER;
BEGIN
  -- Get player's ELO and tier
  SELECT elo_rating, rank_tier INTO player_elo, player_tier
  FROM profiles WHERE id = player_uuid;

  IF player_elo IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0.00::DECIMAL;
    RETURN;
  END IF;

  -- Count total ranked players
  SELECT COUNT(*) INTO total_ranked
  FROM profiles WHERE total_games > 0 AND is_banned = FALSE;

  -- Count players with higher ELO
  SELECT COUNT(*) INTO higher_count
  FROM profiles
  WHERE elo_rating > player_elo AND total_games > 0 AND is_banned = FALSE;

  -- Count players in same tier
  SELECT COUNT(*) INTO tier_count
  FROM profiles
  WHERE rank_tier = player_tier AND total_games > 0 AND is_banned = FALSE;

  -- Count players with higher ELO in same tier
  SELECT COUNT(*) INTO tier_higher
  FROM profiles
  WHERE rank_tier = player_tier AND elo_rating > player_elo AND total_games > 0 AND is_banned = FALSE;

  RETURN QUERY SELECT
    (higher_count + 1)::INTEGER AS global_rank,
    (tier_higher + 1)::INTEGER AS tier_rank,
    ROUND(((total_ranked - higher_count)::DECIMAL / total_ranked) * 100, 2) AS percentile;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- MATCHMAKING FUNCTIONS
-- ============================================================================

-- Create a matched game from queue
CREATE OR REPLACE FUNCTION match_players(player_ids UUID[])
RETURNS UUID AS $$
DECLARE
  new_game_id UUID;
  player_uuid UUID;
  slot INT := 1;
BEGIN
  -- Create the game
  INSERT INTO games (
    status,
    game_type,
    settings
  ) VALUES (
    'waiting',
    'ranked',
    '{"maxPlayers": ' || array_length(player_ids, 1) || ', "roundTime": 180, "roundsToWin": 3}'::JSONB
  ) RETURNING id INTO new_game_id;

  -- Add players to the game
  FOREACH player_uuid IN ARRAY player_ids
  LOOP
    INSERT INTO game_players (game_id, player_id, slot_number, is_ready)
    VALUES (new_game_id, player_uuid, slot, TRUE);

    -- Remove from queue
    DELETE FROM matchmaking_queue WHERE player_id = player_uuid;

    slot := slot + 1;
  END LOOP;

  RETURN new_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find matches in queue (called periodically)
CREATE OR REPLACE FUNCTION process_matchmaking_queue()
RETURNS INTEGER AS $$
DECLARE
  matches_made INTEGER := 0;
  queue_entry RECORD;
  potential_match UUID[];
  match_rating_sum INTEGER;
  match_count INTEGER;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Process players in queue order
  FOR queue_entry IN
    SELECT * FROM matchmaking_queue
    WHERE status = 'searching'
    ORDER BY queued_at
  LOOP
    -- Calculate ELO range (expands over time)
    -- Base range: +/- 100, expands by 50 every 30 seconds
    DECLARE
      wait_seconds INTEGER := EXTRACT(EPOCH FROM (current_time - queue_entry.queued_at));
      elo_range INTEGER := 100 + (wait_seconds / 30) * 50;
      min_elo INTEGER := queue_entry.elo_rating - elo_range;
      max_elo INTEGER := queue_entry.elo_rating + elo_range;
    BEGIN
      -- Find other players in range
      SELECT ARRAY_AGG(player_id), SUM(elo_rating), COUNT(*)
      INTO potential_match, match_rating_sum, match_count
      FROM matchmaking_queue
      WHERE status = 'searching'
        AND player_id != queue_entry.player_id
        AND elo_rating BETWEEN min_elo AND max_elo
        AND game_type = queue_entry.game_type
      LIMIT 3; -- Need 3 other players for a 4-player match

      -- If we have enough players, create match
      IF match_count >= 3 THEN
        potential_match := array_prepend(queue_entry.player_id, potential_match[1:3]);
        PERFORM match_players(potential_match);
        matches_made := matches_made + 1;
      ELSIF wait_seconds > 30 AND queue_entry.expanded_at IS NULL THEN
        -- Mark as expanded for wider search
        UPDATE matchmaking_queue
        SET expanded_at = current_time
        WHERE player_id = queue_entry.player_id;
      END IF;
    END;
  END LOOP;

  RETURN matches_made;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GAME MANAGEMENT FUNCTIONS
-- ============================================================================

-- Create a new game room
CREATE OR REPLACE FUNCTION create_game_room(
  host_uuid UUID,
  p_settings JSONB DEFAULT '{}'
)
RETURNS TABLE(game_id UUID, room_code TEXT) AS $$
DECLARE
  new_game_id UUID;
  new_room_code TEXT;
  attempts INTEGER := 0;
BEGIN
  -- Generate unique room code (6 chars)
  LOOP
    new_room_code := upper(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM games WHERE room_code = new_room_code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique room code';
    END IF;
  END LOOP;

  -- Create game
  INSERT INTO games (room_code, host_id, status, game_type, settings)
  VALUES (new_room_code, host_uuid, 'waiting', 'custom', p_settings)
  RETURNING id INTO new_game_id;

  -- Add host as first player
  INSERT INTO game_players (game_id, player_id, slot_number, is_ready)
  VALUES (new_game_id, host_uuid, 1, FALSE);

  RETURN QUERY SELECT new_game_id, new_room_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join a game by room code
CREATE OR REPLACE FUNCTION join_game_by_code(
  p_room_code TEXT,
  player_uuid UUID
)
RETURNS TABLE(
  success BOOLEAN,
  game_id UUID,
  message TEXT
) AS $$
DECLARE
  target_game RECORD;
  next_slot INTEGER;
BEGIN
  -- Find the game
  SELECT g.*, (settings ->> 'maxPlayers')::INTEGER AS max_players
  INTO target_game
  FROM games g
  WHERE g.room_code = upper(p_room_code);

  IF target_game IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Game not found';
    RETURN;
  END IF;

  IF target_game.status != 'waiting' THEN
    RETURN QUERY SELECT FALSE, target_game.id, 'Game already in progress';
    RETURN;
  END IF;

  -- Check if already in game
  IF EXISTS (SELECT 1 FROM game_players WHERE game_id = target_game.id AND player_id = player_uuid) THEN
    RETURN QUERY SELECT TRUE, target_game.id, 'Already in game';
    RETURN;
  END IF;

  -- Find next available slot
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO next_slot
  FROM game_players
  WHERE game_id = target_game.id;

  IF next_slot > target_game.max_players THEN
    RETURN QUERY SELECT FALSE, target_game.id, 'Game is full';
    RETURN;
  END IF;

  -- Add player
  INSERT INTO game_players (game_id, player_id, slot_number)
  VALUES (target_game.id, player_uuid, next_slot);

  RETURN QUERY SELECT TRUE, target_game.id, 'Joined successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finalize game results
CREATE OR REPLACE FUNCTION finalize_game(
  game_uuid UUID,
  winner_uuid UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  game_record RECORD;
BEGIN
  -- Get game info
  SELECT * INTO game_record FROM games WHERE id = game_uuid;

  IF game_record IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Update game status
  UPDATE games SET
    status = 'finished',
    winner_id = winner_uuid,
    finished_at = NOW()
  WHERE id = game_uuid;

  -- Update ELO if ranked
  IF game_record.game_type = 'ranked' THEN
    PERFORM update_elo_multiplayer(game_uuid);
  END IF;

  -- Update map play count
  IF game_record.map_id IS NOT NULL THEN
    UPDATE maps SET play_count = play_count + 1 WHERE id = game_record.map_id;
  END IF;

  -- Update player stats
  UPDATE profiles p SET
    total_kills = p.total_kills + gp.kills,
    total_deaths = p.total_deaths + gp.deaths,
    total_bombs_placed = p.total_bombs_placed + gp.bombs_placed,
    total_powerups_collected = p.total_powerups_collected + gp.powerups_collected
  FROM game_players gp
  WHERE gp.game_id = game_uuid AND gp.player_id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ACHIEVEMENT FUNCTIONS
-- ============================================================================

-- Check and unlock achievements for a player
CREATE OR REPLACE FUNCTION check_achievements(player_uuid UUID, game_uuid UUID DEFAULT NULL)
RETURNS TABLE(achievement_id UUID, achievement_code TEXT, achievement_name TEXT) AS $$
DECLARE
  player_stats RECORD;
  ach RECORD;
  unlocked BOOLEAN;
BEGIN
  -- Get player stats
  SELECT * INTO player_stats FROM profiles WHERE id = player_uuid;

  -- Check each achievement
  FOR ach IN
    SELECT * FROM achievements
    WHERE is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM player_achievements pa
        WHERE pa.player_id = player_uuid AND pa.achievement_id = achievements.id
      )
  LOOP
    unlocked := FALSE;

    -- Check criteria based on type
    CASE ach.criteria ->> 'type'
      WHEN 'kills' THEN
        unlocked := player_stats.total_kills >= (ach.criteria ->> 'target')::INTEGER;
      WHEN 'wins' THEN
        unlocked := player_stats.total_wins >= (ach.criteria ->> 'target')::INTEGER;
      WHEN 'games' THEN
        unlocked := player_stats.total_games >= (ach.criteria ->> 'target')::INTEGER;
      WHEN 'win_streak' THEN
        unlocked := player_stats.best_win_streak >= (ach.criteria ->> 'target')::INTEGER;
      WHEN 'elo' THEN
        unlocked := player_stats.elo_rating >= (ach.criteria ->> 'target')::INTEGER;
      WHEN 'rank' THEN
        unlocked := player_stats.rank_tier = ach.criteria ->> 'target';
      ELSE
        -- Custom criteria handled elsewhere
        NULL;
    END CASE;

    -- Unlock if criteria met
    IF unlocked THEN
      INSERT INTO player_achievements (player_id, achievement_id, game_id)
      VALUES (player_uuid, ach.id, game_uuid)
      ON CONFLICT (player_id, achievement_id) DO NOTHING;

      RETURN QUERY SELECT ach.id, ach.code, ach.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Generate unique room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update profile stats after game (trigger function)
CREATE OR REPLACE FUNCTION update_profile_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.placement IS NOT NULL AND OLD.placement IS NULL THEN
    -- Game ended, update profile stats
    UPDATE profiles SET
      total_kills = total_kills + NEW.kills,
      total_deaths = total_deaths + NEW.deaths,
      total_bombs_placed = total_bombs_placed + NEW.bombs_placed,
      total_powerups_collected = total_powerups_collected + NEW.powerups_collected,
      updated_at = NOW()
    WHERE id = NEW.player_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_stats
  AFTER UPDATE ON game_players
  FOR EACH ROW
  WHEN (NEW.placement IS NOT NULL AND OLD.placement IS NULL)
  EXECUTE FUNCTION update_profile_stats_after_game();

-- Cleanup old matchmaking queue entries
CREATE OR REPLACE FUNCTION cleanup_matchmaking_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM matchmaking_queue
  WHERE queued_at < NOW() - INTERVAL '10 minutes'
    OR status = 'cancelled';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get friend suggestions based on similar skill level
CREATE OR REPLACE FUNCTION get_friend_suggestions(player_uuid UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  suggested_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER,
  common_games INTEGER
) AS $$
DECLARE
  player_elo INTEGER;
BEGIN
  SELECT elo_rating INTO player_elo FROM profiles WHERE id = player_uuid;

  RETURN QUERY
  SELECT DISTINCT
    p.id AS suggested_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.elo_rating,
    (
      SELECT COUNT(*)::INTEGER
      FROM game_players gp1
      JOIN game_players gp2 ON gp1.game_id = gp2.game_id
      WHERE gp1.player_id = player_uuid AND gp2.player_id = p.id
    ) AS common_games
  FROM profiles p
  WHERE p.id != player_uuid
    AND p.is_banned = FALSE
    AND ABS(p.elo_rating - player_elo) <= 200
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.requester_id = player_uuid AND f.addressee_id = p.id)
         OR (f.requester_id = p.id AND f.addressee_id = player_uuid)
    )
  ORDER BY ABS(p.elo_rating - player_elo), common_games DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION FUNCTIONS
-- ============================================================================

-- Send notification to user
CREATE OR REPLACE FUNCTION send_notification(
  p_player_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_action_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (player_id, type, title, body, action_url, action_data)
  VALUES (p_player_id, p_type, p_title, p_body, p_action_url, p_action_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send notification to multiple users
CREATE OR REPLACE FUNCTION send_bulk_notification(
  p_player_ids UUID[],
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_action_data JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO notifications (player_id, type, title, body, action_url, action_data)
  SELECT unnest(p_player_ids), p_type, p_title, p_body, p_action_url, p_action_data;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MAP RATING FUNCTIONS
-- ============================================================================

-- Update map average rating (trigger)
CREATE OR REPLACE FUNCTION update_map_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE maps SET
    average_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM map_ratings
      WHERE map_id = COALESCE(NEW.map_id, OLD.map_id)
    ),
    likes = (
      SELECT COUNT(*)
      FROM map_ratings
      WHERE map_id = COALESCE(NEW.map_id, OLD.map_id)
        AND rating >= 4
    ),
    dislikes = (
      SELECT COUNT(*)
      FROM map_ratings
      WHERE map_id = COALESCE(NEW.map_id, OLD.map_id)
        AND rating <= 2
    )
  WHERE id = COALESCE(NEW.map_id, OLD.map_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_map_rating
  AFTER INSERT OR UPDATE OR DELETE ON map_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_map_rating_stats();

-- ============================================================================
-- TOURNAMENT FUNCTIONS
-- ============================================================================

-- Generate tournament bracket
CREATE OR REPLACE FUNCTION generate_tournament_bracket(tournament_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  tournament_record RECORD;
  participants RECORD[];
  bracket JSONB := '{"rounds": []}'::JSONB;
  round_matches JSONB[];
  num_players INTEGER;
  num_rounds INTEGER;
  current_round INTEGER;
  match_id INTEGER := 1;
BEGIN
  -- Get tournament
  SELECT * INTO tournament_record FROM tournaments WHERE id = tournament_uuid;

  IF tournament_record IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Get shuffled participants
  SELECT ARRAY_AGG(row_to_json(tp)) INTO participants
  FROM (
    SELECT player_id, seed
    FROM tournament_participants
    WHERE tournament_id = tournament_uuid AND status IN ('registered', 'checked_in')
    ORDER BY COALESCE(seed, random() * 1000)
  ) tp;

  num_players := array_length(participants, 1);

  IF num_players < 2 THEN
    RAISE EXCEPTION 'Not enough participants';
  END IF;

  -- Calculate rounds needed
  num_rounds := CEIL(LOG(2, num_players));

  -- Generate bracket based on format
  IF tournament_record.format = 'single_elimination' THEN
    -- First round with byes
    round_matches := '[]'::JSONB;

    FOR i IN 1..CEIL(num_players / 2.0) LOOP
      IF i * 2 <= num_players THEN
        round_matches := round_matches || jsonb_build_object(
          'id', match_id,
          'round', 1,
          'player1_id', participants[i * 2 - 1]->>'player_id',
          'player2_id', participants[i * 2]->>'player_id',
          'winner_id', NULL,
          'status', 'pending'
        );
      ELSE
        -- Bye - player advances automatically
        round_matches := round_matches || jsonb_build_object(
          'id', match_id,
          'round', 1,
          'player1_id', participants[i * 2 - 1]->>'player_id',
          'player2_id', NULL,
          'winner_id', participants[i * 2 - 1]->>'player_id',
          'status', 'bye'
        );
      END IF;
      match_id := match_id + 1;
    END LOOP;

    bracket := jsonb_set(bracket, '{rounds}', jsonb_build_array(round_matches));
  END IF;

  -- Update tournament
  UPDATE tournaments SET
    bracket_data = bracket,
    total_rounds = num_rounds,
    current_round = 1,
    status = 'active',
    updated_at = NOW()
  WHERE id = tournament_uuid;

  RETURN bracket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
