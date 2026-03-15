/**
 * Game Data Access Functions
 *
 * Provides functions for managing games in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Game,
  GameUpdate,
  GamePlayer,
  GamePlayerInsert,
  GamePlayerUpdate,
  GameSettings,
  GameStatus,
  GameType,
  GameWithPlayers,
  Profile,
  GameMap,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for game-related operations
 */
export class GameError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'GameError';
  }
}

/**
 * Create a new game room
 */
export async function createGame(
  supabase: TypedSupabaseClient,
  hostId: string,
  settings?: Partial<GameSettings>
): Promise<{ game: Game; roomCode: string }> {
  // Use database function for atomic room code generation
  const { data, error } = await supabase.rpc('create_game_room', {
    host_uuid: hostId,
    p_settings: settings ?? {},
  });

  if (error) {
    throw new GameError(error.message, error.code);
  }

  const result = data as { game_id: string; room_code: string };

  // Fetch the full game
  const game = await getGame(supabase, result.game_id);

  if (!game) {
    throw new GameError('Failed to create game', 'CREATE_FAILED');
  }

  return { game, roomCode: result.room_code };
}

/**
 * Get a game by ID
 */
export async function getGame(
  supabase: TypedSupabaseClient,
  gameId: string
): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new GameError(error.message, error.code);
  }

  return data;
}

/**
 * Get a game by room code
 */
export async function getGameByRoomCode(
  supabase: TypedSupabaseClient,
  roomCode: string
): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new GameError(error.message, error.code);
  }

  return data;
}

/**
 * Get a game with all players and related data
 */
export async function getGameWithPlayers(
  supabase: TypedSupabaseClient,
  gameId: string
): Promise<GameWithPlayers | null> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      *,
      players:game_players (
        *,
        profile:profiles (*)
      ),
      map:maps (*),
      winner:profiles!games_winner_id_fkey (*)
    `
    )
    .eq('id', gameId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new GameError(error.message, error.code);
  }

  return data as unknown as GameWithPlayers;
}

/**
 * Update game status
 */
export async function updateGameStatus(
  supabase: TypedSupabaseClient,
  gameId: string,
  status: GameStatus,
  additionalUpdates?: Partial<GameUpdate>
): Promise<Game> {
  const updates: GameUpdate = {
    status,
    ...additionalUpdates,
  };

  // Add timestamps based on status
  if (status === 'playing' && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }
  if (status === 'finished' && !updates.finished_at) {
    updates.finished_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    throw new GameError(error.message, error.code);
  }

  return data;
}

/**
 * Update game settings
 */
export async function updateGameSettings(
  supabase: TypedSupabaseClient,
  gameId: string,
  settings: Partial<GameSettings>
): Promise<Game> {
  // Fetch current settings first
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('settings')
    .eq('id', gameId)
    .single();

  if (fetchError) {
    throw new GameError(fetchError.message, fetchError.code);
  }

  const mergedSettings = {
    ...game.settings,
    ...settings,
  };

  const { data, error } = await supabase
    .from('games')
    .update({ settings: mergedSettings })
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    throw new GameError(error.message, error.code);
  }

  return data;
}

/**
 * Record game results
 */
export async function recordGameResult(
  supabase: TypedSupabaseClient,
  gameId: string,
  result: {
    winnerId?: string;
    roundsPlayed: number;
    playerResults: Array<{
      playerId: string;
      placement: number;
      kills: number;
      deaths: number;
      roundsWon: number;
    }>;
  }
): Promise<void> {
  // Update game
  const { error: gameError } = await supabase
    .from('games')
    .update({
      status: 'finished',
      winner_id: result.winnerId ?? null,
      rounds_played: result.roundsPlayed,
      finished_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (gameError) {
    throw new GameError(gameError.message, gameError.code);
  }

  // Update each player's stats
  for (const playerResult of result.playerResults) {
    const { error: playerError } = await supabase
      .from('game_players')
      .update({
        placement: playerResult.placement,
        kills: playerResult.kills,
        deaths: playerResult.deaths,
        rounds_won: playerResult.roundsWon,
      })
      .eq('game_id', gameId)
      .eq('player_id', playerResult.playerId);

    if (playerError) {
      throw new GameError(playerError.message, playerError.code);
    }
  }

  // Call finalize_game to update ELO and stats
  const { error: finalizeError } = await supabase.rpc('finalize_game', {
    game_uuid: gameId,
    winner_uuid: result.winnerId ?? null,
  });

  if (finalizeError) {
    throw new GameError(finalizeError.message, finalizeError.code);
  }
}

/**
 * Join a game by room code
 */
export async function joinGameByCode(
  supabase: TypedSupabaseClient,
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; gameId: string | null; message: string }> {
  const { data, error } = await supabase.rpc('join_game_by_code', {
    p_room_code: roomCode.toUpperCase(),
    player_uuid: playerId,
  });

  if (error) {
    throw new GameError(error.message, error.code);
  }

  const result = data as { success: boolean; game_id: string | null; message: string };
  return {
    success: result.success,
    gameId: result.game_id,
    message: result.message,
  };
}

/**
 * Join a game directly
 */
export async function joinGame(
  supabase: TypedSupabaseClient,
  gameId: string,
  playerId: string,
  options: {
    slotNumber?: number;
    isSpectator?: boolean;
    characterColor?: number;
  } = {}
): Promise<GamePlayer> {
  // Get next available slot if not specified
  let slotNumber = options.slotNumber;

  if (!slotNumber && !options.isSpectator) {
    const { data: existingPlayers, error: slotsError } = await supabase
      .from('game_players')
      .select('slot_number')
      .eq('game_id', gameId)
      .eq('is_spectator', false)
      .order('slot_number', { ascending: true });

    if (slotsError) {
      throw new GameError(slotsError.message, slotsError.code);
    }

    const usedSlots = new Set(existingPlayers?.map((p) => p.slot_number) ?? []);
    for (let i = 1; i <= 16; i++) {
      if (!usedSlots.has(i)) {
        slotNumber = i;
        break;
      }
    }

    if (!slotNumber) {
      throw new GameError('No available slots', 'GAME_FULL');
    }
  }

  const insertData: GamePlayerInsert = {
    game_id: gameId,
    player_id: playerId,
    slot_number: slotNumber ?? 0,
    is_spectator: options.isSpectator ?? false,
    character_color: options.characterColor ?? 0,
  };

  const { data, error } = await supabase
    .from('game_players')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new GameError('Already in this game', 'ALREADY_JOINED');
    }
    throw new GameError(error.message, error.code);
  }

  return data;
}

/**
 * Leave a game
 */
export async function leaveGame(
  supabase: TypedSupabaseClient,
  gameId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) {
    throw new GameError(error.message, error.code);
  }
}

/**
 * Update player ready status
 */
export async function updatePlayerReady(
  supabase: TypedSupabaseClient,
  gameId: string,
  playerId: string,
  isReady: boolean
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update({ is_ready: isReady })
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) {
    throw new GameError(error.message, error.code);
  }
}

/**
 * Update player character color
 */
export async function updatePlayerColor(
  supabase: TypedSupabaseClient,
  gameId: string,
  playerId: string,
  color: number
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update({ character_color: color })
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) {
    throw new GameError(error.message, error.code);
  }
}

/**
 * Get game players
 */
export async function getGamePlayers(
  supabase: TypedSupabaseClient,
  gameId: string
): Promise<(GamePlayer & { profile: Profile })[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select(
      `
      *,
      profile:profiles (*)
    `
    )
    .eq('game_id', gameId)
    .order('slot_number', { ascending: true });

  if (error) {
    throw new GameError(error.message, error.code);
  }

  return data as (GamePlayer & { profile: Profile })[];
}

/**
 * Check if all players are ready
 */
export async function areAllPlayersReady(
  supabase: TypedSupabaseClient,
  gameId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('game_players')
    .select('is_ready')
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  if (error) {
    throw new GameError(error.message, error.code);
  }

  if (!data || data.length === 0) {
    return false;
  }

  return data.every((p) => p.is_ready);
}

/**
 * Get active games (waiting for players)
 */
export async function getActiveGames(
  supabase: TypedSupabaseClient,
  options: {
    gameType?: GameType;
    limit?: number;
  } = {}
): Promise<(Game & { playerCount: number; map?: GameMap })[]> {
  const { gameType, limit = 50 } = options;

  let query = supabase
    .from('games')
    .select(
      `
      *,
      map:maps (*),
      players:game_players (id)
    `
    )
    .eq('status', 'waiting')
    .limit(limit)
    .order('created_at', { ascending: false });

  if (gameType) {
    query = query.eq('game_type', gameType);
  }

  const { data, error } = await query;

  if (error) {
    throw new GameError(error.message, error.code);
  }

  return (
    data?.map((game) => ({
      ...game,
      playerCount: (game.players as unknown[])?.length ?? 0,
      map: game.map as GameMap | undefined,
    })) ?? []
  );
}

/**
 * Cancel a game
 */
export async function cancelGame(
  supabase: TypedSupabaseClient,
  gameId: string
): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'cancelled' })
    .eq('id', gameId);

  if (error) {
    throw new GameError(error.message, error.code);
  }
}

/**
 * Update player game stats
 */
export async function updatePlayerGameStats(
  supabase: TypedSupabaseClient,
  gameId: string,
  playerId: string,
  stats: Partial<GamePlayerUpdate>
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update(stats)
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) {
    throw new GameError(error.message, error.code);
  }
}

/**
 * Get player's current game (if any)
 */
export async function getPlayerCurrentGame(
  supabase: TypedSupabaseClient,
  playerId: string
): Promise<Game | null> {
  const { data, error } = await supabase
    .from('game_players')
    .select(
      `
      games (*)
    `
    )
    .eq('player_id', playerId)
    .in('games.status', ['waiting', 'countdown', 'playing', 'intermission'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new GameError(error.message, error.code);
  }

  return (data?.games as unknown as Game) ?? null;
}
