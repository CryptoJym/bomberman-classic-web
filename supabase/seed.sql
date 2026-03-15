-- ============================================================================
-- Bomberman Online - Seed Data
-- File: seed.sql
-- Created: 2024
-- Description: Initial data for achievements, official maps, and test data
-- ============================================================================

-- ============================================================================
-- ACHIEVEMENTS (50+ achievements across categories)
-- ============================================================================

-- Clear existing achievements (for re-seeding)
TRUNCATE TABLE achievements CASCADE;

-- Combat Achievements (15)
INSERT INTO achievements (code, category, name, description, icon, rarity, points, criteria, sort_order) VALUES
('first_blood', 'combat', 'First Blood', 'Get your first kill', 'skull', 'common', 10, '{"type": "kills", "target": 1}', 1),
('serial_killer', 'combat', 'Serial Killer', 'Get 10 kills in your career', 'skull_fire', 'common', 15, '{"type": "kills", "target": 10}', 2),
('massacre', 'combat', 'Massacre', 'Get 50 kills in your career', 'skull_crossbones', 'uncommon', 25, '{"type": "kills", "target": 50}', 3),
('terminator', 'combat', 'Terminator', 'Get 100 kills in your career', 'robot', 'rare', 50, '{"type": "kills", "target": 100}', 4),
('death_incarnate', 'combat', 'Death Incarnate', 'Get 500 kills in your career', 'reaper', 'epic', 100, '{"type": "kills", "target": 500}', 5),
('god_of_war', 'combat', 'God of War', 'Get 1000 kills in your career', 'crown_skull', 'legendary', 200, '{"type": "kills", "target": 1000}', 6),
('triple_kill', 'combat', 'Triple Kill', 'Kill 3 players with a single bomb', 'bomb_triple', 'rare', 50, '{"type": "multi_kill", "target": 3}', 7),
('quad_kill', 'combat', 'Quad Kill', 'Kill 4 players with a single bomb', 'bomb_quad', 'epic', 100, '{"type": "multi_kill", "target": 4}', 8),
('chain_reaction', 'combat', 'Chain Reaction', 'Trigger a chain of 5+ bomb explosions', 'chain', 'rare', 40, '{"type": "chain_bombs", "target": 5}', 9),
('revenge', 'combat', 'Revenge', 'Kill the player who killed you in the same game', 'sword_revenge', 'uncommon', 20, '{"type": "revenge_kill", "target": 1}', 10),
('domination', 'combat', 'Domination', 'Kill the same player 3 times in one game', 'crown', 'rare', 35, '{"type": "domination", "target": 3}', 11),
('untouchable', 'combat', 'Untouchable', 'Win a game without dying', 'shield_star', 'epic', 75, '{"type": "flawless_win", "target": 1}', 12),
('killing_spree', 'combat', 'Killing Spree', 'Get 5 kills without dying in a game', 'fire_streak', 'rare', 45, '{"type": "kill_streak", "target": 5}', 13),
('rampage', 'combat', 'Rampage', 'Get 8 kills in a single game', 'explosion', 'epic', 60, '{"type": "kills_in_game", "target": 8}', 14),
('bomb_master', 'combat', 'Bomb Master', 'Place 1000 bombs in your career', 'bomb_gold', 'rare', 40, '{"type": "bombs_placed", "target": 1000}', 15),

-- Survival Achievements (10)
('survivor', 'survival', 'Survivor', 'Survive for 2 minutes in a single round', 'heart', 'common', 10, '{"type": "survival_time", "target": 120}', 20),
('last_man_standing', 'survival', 'Last Man Standing', 'Be the last player alive', 'trophy', 'common', 15, '{"type": "wins", "target": 1}', 21),
('cockroach', 'survival', 'Cockroach', 'Survive sudden death for 30 seconds', 'bug', 'uncommon', 25, '{"type": "sudden_death_survival", "target": 30}', 22),
('close_call', 'survival', 'Close Call', 'Escape an explosion with less than 1 second to spare', 'clock', 'rare', 35, '{"type": "narrow_escape", "target": 1}', 23),
('pacifist', 'survival', 'Pacifist', 'Win a round without placing any bombs', 'dove', 'epic', 75, '{"type": "pacifist_win", "target": 1}', 24),
('immortal', 'survival', 'Immortal', 'Use a shield powerup to survive a fatal explosion', 'shield', 'uncommon', 20, '{"type": "shield_save", "target": 1}', 25),
('escape_artist', 'survival', 'Escape Artist', 'Escape from being surrounded by explosions', 'running', 'rare', 40, '{"type": "surrounded_escape", "target": 1}', 26),
('marathon', 'survival', 'Marathon Runner', 'Play for a total of 10 hours', 'timer', 'rare', 50, '{"type": "playtime", "target": 36000}', 27),
('veteran', 'survival', 'Veteran', 'Play for a total of 50 hours', 'medal', 'epic', 100, '{"type": "playtime", "target": 180000}', 28),
('die_hard', 'survival', 'Die Hard', 'Come back from last place to win a game', 'phoenix', 'epic', 80, '{"type": "comeback_win", "target": 1}', 29),

-- Progression Achievements (15)
('rookie', 'progression', 'Rookie', 'Play your first game', 'star_empty', 'common', 5, '{"type": "games", "target": 1}', 30),
('regular', 'progression', 'Regular', 'Play 10 games', 'star_half', 'common', 10, '{"type": "games", "target": 10}', 31),
('dedicated', 'progression', 'Dedicated', 'Play 50 games', 'star_full', 'uncommon', 25, '{"type": "games", "target": 50}', 32),
('addicted', 'progression', 'Addicted', 'Play 100 games', 'star_double', 'rare', 50, '{"type": "games", "target": 100}', 33),
('no_life', 'progression', 'No Life', 'Play 500 games', 'star_triple', 'epic', 100, '{"type": "games", "target": 500}', 34),
('legend', 'progression', 'Legend', 'Play 1000 games', 'star_legend', 'legendary', 200, '{"type": "games", "target": 1000}', 35),
('winner', 'progression', 'Winner', 'Win your first game', 'trophy_bronze', 'common', 10, '{"type": "wins", "target": 1}', 36),
('champion', 'progression', 'Champion', 'Win 10 games', 'trophy_silver', 'uncommon', 25, '{"type": "wins", "target": 10}', 37),
('conqueror', 'progression', 'Conqueror', 'Win 50 games', 'trophy_gold', 'rare', 50, '{"type": "wins", "target": 50}', 38),
('unstoppable', 'progression', 'Unstoppable', 'Win 100 games', 'trophy_platinum', 'epic', 100, '{"type": "wins", "target": 100}', 39),
('immortal_champion', 'progression', 'Immortal Champion', 'Win 500 games', 'trophy_diamond', 'legendary', 250, '{"type": "wins", "target": 500}', 40),
('on_a_roll', 'progression', 'On a Roll', 'Win 3 games in a row', 'fire', 'uncommon', 20, '{"type": "win_streak", "target": 3}', 41),
('hot_streak', 'progression', 'Hot Streak', 'Win 5 games in a row', 'fire_double', 'rare', 40, '{"type": "win_streak", "target": 5}', 42),
('unstoppable_force', 'progression', 'Unstoppable Force', 'Win 10 games in a row', 'fire_triple', 'epic', 100, '{"type": "win_streak", "target": 10}', 43),
('perfect_streak', 'progression', 'Perfect Streak', 'Win 20 games in a row', 'infinity', 'legendary', 250, '{"type": "win_streak", "target": 20}', 44),

-- Ranking Achievements (7)
('bronze_tier', 'progression', 'Bronze Bomber', 'Reach Bronze tier', 'rank_bronze', 'common', 5, '{"type": "rank", "target": "bronze"}', 50),
('silver_tier', 'progression', 'Silver Striker', 'Reach Silver tier (1400 ELO)', 'rank_silver', 'common', 15, '{"type": "elo", "target": 1400}', 51),
('gold_tier', 'progression', 'Gold Guardian', 'Reach Gold tier (1600 ELO)', 'rank_gold', 'uncommon', 30, '{"type": "elo", "target": 1600}', 52),
('platinum_tier', 'progression', 'Platinum Punisher', 'Reach Platinum tier (1800 ELO)', 'rank_platinum', 'rare', 50, '{"type": "elo", "target": 1800}', 53),
('diamond_tier', 'progression', 'Diamond Destroyer', 'Reach Diamond tier (2000 ELO)', 'rank_diamond', 'epic', 100, '{"type": "elo", "target": 2000}', 54),
('master_tier', 'progression', 'Master of Mayhem', 'Reach Master tier (2200 ELO)', 'rank_master', 'epic', 150, '{"type": "elo", "target": 2200}', 55),
('grandmaster_tier', 'progression', 'Grandmaster', 'Reach Grandmaster tier (2400 ELO)', 'rank_grandmaster', 'legendary', 300, '{"type": "elo", "target": 2400}', 56),

-- Social Achievements (8)
('social_butterfly', 'social', 'Social Butterfly', 'Add your first friend', 'friends', 'common', 10, '{"type": "friends", "target": 1}', 60),
('popular', 'social', 'Popular', 'Have 10 friends', 'friends_group', 'uncommon', 20, '{"type": "friends", "target": 10}', 61),
('influencer', 'social', 'Influencer', 'Have 50 friends', 'star_social', 'rare', 50, '{"type": "friends", "target": 50}', 62),
('party_starter', 'social', 'Party Starter', 'Create your first game room', 'party', 'common', 10, '{"type": "rooms_created", "target": 1}', 63),
('host_master', 'social', 'Host with the Most', 'Host 50 games', 'crown_host', 'rare', 40, '{"type": "games_hosted", "target": 50}', 64),
('map_maker', 'social', 'Map Maker', 'Create your first custom map', 'map', 'common', 15, '{"type": "maps_created", "target": 1}', 65),
('cartographer', 'social', 'Cartographer', 'Create 10 custom maps', 'map_stack', 'rare', 50, '{"type": "maps_created", "target": 10}', 66),
('featured_creator', 'social', 'Featured Creator', 'Have a map reach 1000 plays', 'trophy_map', 'epic', 100, '{"type": "map_plays", "target": 1000}', 67),

-- Special Achievements (10)
('first_tournament', 'special', 'Tournament Debut', 'Participate in your first tournament', 'tournament', 'common', 15, '{"type": "tournaments", "target": 1}', 70),
('tournament_winner', 'special', 'Tournament Champion', 'Win a tournament', 'tournament_trophy', 'epic', 150, '{"type": "tournament_wins", "target": 1}', 71),
('powerup_collector', 'special', 'Collector', 'Collect 100 powerups in your career', 'powerup', 'common', 15, '{"type": "powerups", "target": 100}', 72),
('powerup_hoarder', 'special', 'Hoarder', 'Collect 1000 powerups in your career', 'powerup_gold', 'rare', 50, '{"type": "powerups", "target": 1000}', 73),
('kick_master', 'special', 'Kick Master', 'Score a kill using a kicked bomb', 'boot', 'uncommon', 25, '{"type": "kick_kills", "target": 1}', 74),
('throw_master', 'special', 'Throw Master', 'Score a kill using a thrown bomb', 'hand_throw', 'uncommon', 25, '{"type": "throw_kills", "target": 1}', 75),
('skull_survivor', 'special', 'Cursed', 'Get the skull powerup and still win the round', 'skull_curse', 'rare', 40, '{"type": "skull_win", "target": 1}', 76),
('spectator', 'special', 'Voyeur', 'Watch 10 games as a spectator', 'eye', 'common', 10, '{"type": "spectated", "target": 10}', 77),
('replay_star', 'special', 'Replay Star', 'Have a replay viewed 100 times', 'video', 'rare', 45, '{"type": "replay_views", "target": 100}', 78),
('early_adopter', 'special', 'Early Adopter', 'Play during the first month of launch', 'calendar', 'epic', 100, '{"type": "early_adopter", "target": 1}', 79),

-- Secret Achievements (5)
('self_destruct', 'secret', 'Self Destruct', 'Kill yourself with your own bomb', 'bomb_self', 'common', 5, '{"type": "self_kills", "target": 1}', 90, TRUE),
('mutual_destruction', 'secret', 'Mutual Destruction', 'Kill yourself and another player at the same time', 'explosion_double', 'rare', 30, '{"type": "mutual_kill", "target": 1}', 91, TRUE),
('draw_master', 'secret', 'Draw Master', 'End a round in a draw', 'handshake', 'uncommon', 20, '{"type": "draws", "target": 1}', 92, TRUE),
('speed_demon', 'secret', 'Speed Demon', 'Collect 5 speed powerups in one game', 'lightning', 'rare', 35, '{"type": "speed_stacking", "target": 5}', 93, TRUE),
('bomb_factory', 'secret', 'Bomb Factory', 'Have 8 bombs on the field at once', 'factory', 'epic', 60, '{"type": "max_bombs", "target": 8}', 94, TRUE);

-- Set is_hidden for secret achievements
UPDATE achievements SET is_hidden = TRUE WHERE category = 'secret';

-- ============================================================================
-- OFFICIAL MAPS (5 balanced maps)
-- ============================================================================

-- Clear existing official maps (for re-seeding)
DELETE FROM maps WHERE is_official = TRUE;

-- Map 1: Classic Arena (15x13)
INSERT INTO maps (name, description, width, height, tiles, spawn_points, is_official, is_published, is_featured) VALUES
(
  'Classic Arena',
  'The original Bomberman experience. A balanced arena perfect for competitive play.',
  15, 13,
  '[
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
    ["wall","empty","empty","block","block","block","block","block","block","block","block","block","empty","empty","wall"],
    ["wall","empty","wall","block","wall","block","wall","block","wall","block","wall","block","wall","empty","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","empty","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","empty","wall","block","wall","block","wall","block","wall","block","wall","block","wall","empty","wall"],
    ["wall","empty","empty","block","block","block","block","block","block","block","block","block","empty","empty","wall"],
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
  ]'::JSONB,
  '[
    {"x": 1, "y": 1},
    {"x": 13, "y": 1},
    {"x": 1, "y": 11},
    {"x": 13, "y": 11}
  ]'::JSONB,
  TRUE, TRUE, TRUE
),

-- Map 2: Cross Fire (15x13)
(
  'Cross Fire',
  'Open center creates intense firefights. Control the middle to dominate!',
  15, 13,
  '[
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
    ["wall","empty","empty","block","block","wall","empty","empty","empty","wall","block","block","empty","empty","wall"],
    ["wall","empty","wall","block","wall","wall","empty","wall","empty","wall","wall","block","wall","empty","wall"],
    ["wall","block","block","block","block","empty","empty","empty","empty","empty","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","empty","wall","empty","wall","empty","wall","block","wall","block","wall"],
    ["wall","wall","wall","empty","empty","empty","empty","empty","empty","empty","empty","empty","wall","wall","wall"],
    ["wall","empty","empty","empty","wall","empty","wall","empty","wall","empty","wall","empty","empty","empty","wall"],
    ["wall","wall","wall","empty","empty","empty","empty","empty","empty","empty","empty","empty","wall","wall","wall"],
    ["wall","block","wall","block","wall","empty","wall","empty","wall","empty","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","empty","empty","empty","empty","empty","block","block","block","block","wall"],
    ["wall","empty","wall","block","wall","wall","empty","wall","empty","wall","wall","block","wall","empty","wall"],
    ["wall","empty","empty","block","block","wall","empty","empty","empty","wall","block","block","empty","empty","wall"],
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
  ]'::JSONB,
  '[
    {"x": 1, "y": 1},
    {"x": 13, "y": 1},
    {"x": 1, "y": 11},
    {"x": 13, "y": 11}
  ]'::JSONB,
  TRUE, TRUE, TRUE
),

-- Map 3: The Maze (15x13)
(
  'The Maze',
  'Navigate through tight corridors. Perfect for ambush tactics!',
  15, 13,
  '[
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
    ["wall","empty","empty","empty","wall","block","block","empty","block","block","wall","empty","empty","empty","wall"],
    ["wall","empty","wall","empty","wall","block","wall","empty","wall","block","wall","empty","wall","empty","wall"],
    ["wall","empty","wall","empty","empty","empty","empty","empty","empty","empty","empty","empty","wall","empty","wall"],
    ["wall","wall","wall","wall","wall","empty","wall","wall","wall","empty","wall","wall","wall","wall","wall"],
    ["wall","block","block","empty","empty","empty","block","block","block","empty","empty","empty","block","block","wall"],
    ["wall","block","wall","empty","wall","block","wall","empty","wall","block","wall","empty","wall","block","wall"],
    ["wall","block","block","empty","empty","empty","block","block","block","empty","empty","empty","block","block","wall"],
    ["wall","wall","wall","wall","wall","empty","wall","wall","wall","empty","wall","wall","wall","wall","wall"],
    ["wall","empty","wall","empty","empty","empty","empty","empty","empty","empty","empty","empty","wall","empty","wall"],
    ["wall","empty","wall","empty","wall","block","wall","empty","wall","block","wall","empty","wall","empty","wall"],
    ["wall","empty","empty","empty","wall","block","block","empty","block","block","wall","empty","empty","empty","wall"],
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
  ]'::JSONB,
  '[
    {"x": 1, "y": 1},
    {"x": 13, "y": 1},
    {"x": 1, "y": 11},
    {"x": 13, "y": 11}
  ]'::JSONB,
  TRUE, TRUE, FALSE
),

-- Map 4: Four Corners (15x13)
(
  'Four Corners',
  'Each player starts in a fortified corner. Break out and conquer!',
  15, 13,
  '[
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
    ["wall","empty","empty","wall","block","block","block","empty","block","block","block","wall","empty","empty","wall"],
    ["wall","empty","wall","wall","block","wall","block","empty","block","wall","block","wall","wall","empty","wall"],
    ["wall","wall","wall","block","block","block","empty","empty","empty","block","block","block","wall","wall","wall"],
    ["wall","block","block","block","wall","empty","wall","empty","wall","empty","wall","block","block","block","wall"],
    ["wall","block","wall","block","empty","empty","empty","empty","empty","empty","empty","block","wall","block","wall"],
    ["wall","block","block","empty","wall","empty","wall","empty","wall","empty","wall","empty","block","block","wall"],
    ["wall","block","wall","block","empty","empty","empty","empty","empty","empty","empty","block","wall","block","wall"],
    ["wall","block","block","block","wall","empty","wall","empty","wall","empty","wall","block","block","block","wall"],
    ["wall","wall","wall","block","block","block","empty","empty","empty","block","block","block","wall","wall","wall"],
    ["wall","empty","wall","wall","block","wall","block","empty","block","wall","block","wall","wall","empty","wall"],
    ["wall","empty","empty","wall","block","block","block","empty","block","block","block","wall","empty","empty","wall"],
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
  ]'::JSONB,
  '[
    {"x": 1, "y": 1},
    {"x": 13, "y": 1},
    {"x": 1, "y": 11},
    {"x": 13, "y": 11}
  ]'::JSONB,
  TRUE, TRUE, FALSE
),

-- Map 5: Chaos Chamber (15x13)
(
  'Chaos Chamber',
  'Maximum blocks, maximum chaos! Power-up heaven awaits.',
  15, 13,
  '[
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
    ["wall","empty","empty","block","block","block","block","block","block","block","block","block","empty","empty","wall"],
    ["wall","empty","wall","block","wall","block","wall","block","wall","block","wall","block","wall","empty","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall","block","wall"],
    ["wall","block","block","block","block","block","block","block","block","block","block","block","block","block","wall"],
    ["wall","empty","wall","block","wall","block","wall","block","wall","block","wall","block","wall","empty","wall"],
    ["wall","empty","empty","block","block","block","block","block","block","block","block","block","empty","empty","wall"],
    ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
  ]'::JSONB,
  '[
    {"x": 1, "y": 1},
    {"x": 13, "y": 1},
    {"x": 1, "y": 11},
    {"x": 13, "y": 11}
  ]'::JSONB,
  TRUE, TRUE, FALSE
);

-- ============================================================================
-- TEST PROFILES (for development)
-- ============================================================================

-- Sample test users for development/testing
INSERT INTO profiles (id, clerk_id, username, avatar_url, elo_rating, rank_tier, total_wins, total_games, total_kills, total_deaths, is_online, country, settings)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'user_test_admin', 'BomberKing', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BomberKing', 2450, 'master', 275, 500, 1850, 890, true, 'US', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('22222222-2222-2222-2222-222222222222', 'user_test_player1', 'BlastMaster', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BlastMaster', 1950, 'diamond', 160, 320, 1120, 650, true, 'UK', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('33333333-3333-3333-3333-333333333333', 'user_test_player2', 'ExplosiveNinja', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=ExplosiveNinja', 1750, 'platinum', 120, 280, 890, 580, false, 'JP', '{"soundEnabled": true, "musicEnabled": false, "notifications": true}'),
  ('44444444-4444-4444-4444-444444444444', 'user_test_player3', 'DynamiteDan', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=DynamiteDan', 1580, 'gold', 85, 200, 620, 450, true, 'DE', '{"soundEnabled": true, "musicEnabled": true, "notifications": false}'),
  ('55555555-5555-5555-5555-555555555555', 'user_test_player4', 'PyroQueen', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PyroQueen', 1420, 'gold', 55, 150, 380, 320, false, 'FR', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('66666666-6666-6666-6666-666666666666', 'user_test_player5', 'BoomBoy', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BoomBoy', 1280, 'silver', 35, 100, 240, 220, true, 'CA', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('77777777-7777-7777-7777-777777777777', 'user_test_player6', 'FireStarter', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=FireStarter', 1150, 'silver', 25, 80, 180, 190, false, 'AU', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('88888888-8888-8888-8888-888888888888', 'user_test_player7', 'TNTTerry', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=TNTTerry', 1050, 'bronze', 12, 50, 95, 120, true, 'BR', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('99999999-9999-9999-9999-999999999999', 'user_test_player8', 'NewBomber', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=NewBomber', 1000, 'bronze', 2, 10, 15, 25, false, 'US', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_test_player9', 'BombSquad', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BombSquad', 980, 'bronze', 0, 5, 8, 15, true, 'MX', '{"soundEnabled": true, "musicEnabled": true, "notifications": true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST FRIENDSHIPS
-- ============================================================================

INSERT INTO friendships (requester_id, addressee_id, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'pending'),
  ('55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify achievements were inserted
DO $$
DECLARE
  achievement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO achievement_count FROM achievements;
  RAISE NOTICE 'Inserted % achievements', achievement_count;

  IF achievement_count < 50 THEN
    RAISE WARNING 'Expected at least 50 achievements, got %', achievement_count;
  END IF;
END $$;

-- Verify maps were inserted
DO $$
DECLARE
  map_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO map_count FROM maps WHERE is_official = TRUE;
  RAISE NOTICE 'Inserted % official maps', map_count;

  IF map_count < 5 THEN
    RAISE WARNING 'Expected at least 5 official maps, got %', map_count;
  END IF;
END $$;

-- Show summary
SELECT 'Seed data loaded successfully!' AS status;
SELECT COUNT(*) AS total_achievements FROM achievements;
SELECT category, COUNT(*) AS count FROM achievements GROUP BY category ORDER BY category;
SELECT COUNT(*) AS total_official_maps FROM maps WHERE is_official = TRUE;
SELECT name, width, height FROM maps WHERE is_official = TRUE;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
