/**
 * Tournament Data Access Functions
 *
 * Provides functions for managing tournaments in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Tournament,
  TournamentPlayer,
  TournamentStatus,
  TournamentInsert,
  TournamentUpdate,
  TournamentBracket,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for tournament operations
 */
export class TournamentError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'TournamentError';
  }
}

/**
 * Tournament with organizer info
 */
export interface TournamentWithOrganizer extends Tournament {
  organizer: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Tournament participant with profile
 */
export interface TournamentParticipantWithProfile extends TournamentPlayer {
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    elo_rating: number;
    rank_tier: string;
  } | null;
}

/**
 * Tournament with full details
 */
export interface TournamentWithDetails extends TournamentWithOrganizer {
  participants: TournamentParticipantWithProfile[];
  participantCount: number;
}

/**
 * Create a new tournament
 */
export async function createTournament(
  supabase: TypedSupabaseClient,
  tournamentData: TournamentInsert
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(tournamentData)
    .select()
    .single();

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return data;
}

/**
 * Get a tournament by ID
 */
export async function getTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new TournamentError(error.message, error.code);
  }

  return data;
}

/**
 * Get a tournament with organizer info
 */
export async function getTournamentWithOrganizer(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<TournamentWithOrganizer | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey (id, username, avatar_url)
    `
    )
    .eq('id', tournamentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new TournamentError(error.message, error.code);
  }

  return {
    ...data,
    organizer: data.organizer as TournamentWithOrganizer['organizer'],
  } as TournamentWithOrganizer;
}

/**
 * Get a tournament with full details (participants, etc.)
 */
export async function getTournamentWithDetails(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<TournamentWithDetails | null> {
  // Get tournament with organizer
  const tournament = await getTournamentWithOrganizer(supabase, tournamentId);

  if (!tournament) {
    return null;
  }

  // Get participants
  const { data: participants, error: participantsError } = await supabase
    .from('tournament_players')
    .select(
      `
      *,
      profile:profiles (id, username, avatar_url, elo_rating, rank_tier)
    `
    )
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true });

  if (participantsError) {
    throw new TournamentError(participantsError.message, participantsError.code);
  }

  return {
    ...tournament,
    participants: (participants ?? []).map((p) => ({
      ...p,
      profile: p.profile as TournamentParticipantWithProfile['profile'],
    })) as TournamentParticipantWithProfile[],
    participantCount: participants?.length ?? 0,
  };
}

/**
 * Get active/upcoming tournaments
 */
export async function getActiveTournaments(
  supabase: TypedSupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    status?: TournamentStatus[];
    format?: string;
  } = {}
): Promise<{ tournaments: TournamentWithOrganizer[]; total: number }> {
  const {
    limit = 20,
    offset = 0,
    status = ['registration', 'in_progress'],
    format,
  } = options;

  let query = supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey (id, username, avatar_url)
    `,
      { count: 'exact' }
    )
    .in('status', status)
    .order('starts_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (format) {
    query = query.eq('format', format);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return {
    tournaments: (data ?? []).map((d) => ({
      ...d,
      organizer: d.organizer as TournamentWithOrganizer['organizer'],
    })) as TournamentWithOrganizer[],
    total: count ?? 0,
  };
}

/**
 * Get tournaments by status
 */
export async function getTournamentsByStatus(
  supabase: TypedSupabaseClient,
  status: TournamentStatus,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ tournaments: Tournament[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('starts_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return {
    tournaments: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Get upcoming tournaments (registration open)
 */
export async function getUpcomingTournaments(
  supabase: TypedSupabaseClient,
  limit: number = 10
): Promise<TournamentWithOrganizer[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      organizer:profiles!tournaments_organizer_id_fkey (id, username, avatar_url)
    `
    )
    .eq('status', 'registration')
    .gte('registration_deadline', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return (data ?? []).map((d) => ({
    ...d,
    organizer: d.organizer as TournamentWithOrganizer['organizer'],
  })) as TournamentWithOrganizer[];
}

/**
 * Get player's tournaments
 */
export async function getPlayerTournaments(
  supabase: TypedSupabaseClient,
  playerId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: TournamentStatus[];
  } = {}
): Promise<{ tournaments: Tournament[]; total: number }> {
  const { limit = 20, offset = 0, status } = options;

  // Get tournament IDs the player is participating in
  const { data: participations, error: participationsError } = await supabase
    .from('tournament_players')
    .select('tournament_id')
    .eq('player_id', playerId);

  if (participationsError) {
    throw new TournamentError(participationsError.message, participationsError.code);
  }

  const tournamentIds = (participations ?? []).map((p) => p.tournament_id);

  if (tournamentIds.length === 0) {
    return { tournaments: [], total: 0 };
  }

  let query = supabase
    .from('tournaments')
    .select('*', { count: 'exact' })
    .in('id', tournamentIds)
    .order('starts_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return {
    tournaments: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Register for a tournament
 */
export async function registerForTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  playerId: string
): Promise<TournamentPlayer> {
  // Check if tournament exists and is open for registration
  const tournament = await getTournament(supabase, tournamentId);

  if (!tournament) {
    throw new TournamentError('Tournament not found', 'NOT_FOUND');
  }

  if (tournament.status !== 'registration') {
    throw new TournamentError('Tournament is not open for registration', 'REGISTRATION_CLOSED');
  }

  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
    throw new TournamentError('Registration deadline has passed', 'DEADLINE_PASSED');
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from('tournament_players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    throw new TournamentError('Already registered for this tournament', 'ALREADY_REGISTERED');
  }

  // Check max participants
  const { count } = await supabase
    .from('tournament_players')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if (tournament.max_participants && count !== null && count >= tournament.max_participants) {
    throw new TournamentError('Tournament is full', 'TOURNAMENT_FULL');
  }

  // Register player
  const { data, error } = await supabase
    .from('tournament_players')
    .insert({
      tournament_id: tournamentId,
      player_id: playerId,
    })
    .select()
    .single();

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return data;
}

/**
 * Withdraw from a tournament
 */
export async function withdrawFromTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  playerId: string
): Promise<void> {
  // Check if tournament allows withdrawal
  const tournament = await getTournament(supabase, tournamentId);

  if (!tournament) {
    throw new TournamentError('Tournament not found', 'NOT_FOUND');
  }

  if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
    throw new TournamentError('Cannot withdraw from a tournament that has started', 'CANNOT_WITHDRAW');
  }

  const { error } = await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }
}

/**
 * Update tournament status
 */
export async function updateTournamentStatus(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  status: TournamentStatus
): Promise<Tournament> {
  const updates: TournamentUpdate = { status };

  if (status === 'in_progress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return data;
}

/**
 * Update tournament details
 */
export async function updateTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  updates: TournamentUpdate
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TournamentError('Tournament not found', 'NOT_FOUND');
    }
    throw new TournamentError(error.message, error.code);
  }

  return data;
}

/**
 * Delete a tournament
 */
export async function deleteTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }
}

/**
 * Get tournament bracket
 */
export async function getTournamentBracket(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<TournamentBracket | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('bracket_data')
    .eq('id', tournamentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new TournamentError(error.message, error.code);
  }

  return data.bracket_data as TournamentBracket | null;
}

/**
 * Update tournament bracket
 */
export async function updateTournamentBracket(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  bracket: TournamentBracket
): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ bracket_data: bracket })
    .eq('id', tournamentId);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }
}

/**
 * Seed tournament participants
 */
export async function seedTournamentParticipants(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<void> {
  // Get all participants with their ELO
  const { data: participants, error: fetchError } = await supabase
    .from('tournament_players')
    .select(
      `
      id,
      player_id,
      profile:profiles (elo_rating)
    `
    )
    .eq('tournament_id', tournamentId);

  if (fetchError) {
    throw new TournamentError(fetchError.message, fetchError.code);
  }

  if (!participants || participants.length === 0) {
    return;
  }

  // Sort by ELO rating (highest first)
  const sorted = participants.sort((a, b) => {
    const eloA = (a.profile as { elo_rating: number } | null)?.elo_rating ?? 1000;
    const eloB = (b.profile as { elo_rating: number } | null)?.elo_rating ?? 1000;
    return eloB - eloA;
  });

  // Update seeds
  for (let i = 0; i < sorted.length; i++) {
    const { error } = await supabase
      .from('tournament_players')
      .update({ seed: i + 1 })
      .eq('id', sorted[i].id);

    if (error) {
      throw new TournamentError(error.message, error.code);
    }
  }
}

/**
 * Update player placement in tournament
 */
export async function updatePlayerPlacement(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  playerId: string,
  placement: number
): Promise<void> {
  const { error } = await supabase
    .from('tournament_players')
    .update({ placement })
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }
}

/**
 * Set tournament winner
 */
export async function setTournamentWinner(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  winnerId: string
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update({
      winner_id: winnerId,
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  // Update winner's placement
  await updatePlayerPlacement(supabase, tournamentId, winnerId, 1);

  return data;
}

/**
 * Get tournament standings
 */
export async function getTournamentStandings(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<TournamentParticipantWithProfile[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select(
      `
      *,
      profile:profiles (id, username, avatar_url, elo_rating, rank_tier)
    `
    )
    .eq('tournament_id', tournamentId)
    .order('placement', { ascending: true, nullsFirst: false })
    .order('seed', { ascending: true });

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return (data ?? []).map((p) => ({
    ...p,
    profile: p.profile as TournamentParticipantWithProfile['profile'],
  })) as TournamentParticipantWithProfile[];
}

/**
 * Check if player is registered for tournament
 */
export async function isPlayerRegistered(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new TournamentError(error.message, error.code);
  }

  return data !== null;
}

/**
 * Get tournament participant count
 */
export async function getTournamentParticipantCount(
  supabase: TypedSupabaseClient,
  tournamentId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('tournament_players')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return count ?? 0;
}

/**
 * Search tournaments
 */
export async function searchTournaments(
  supabase: TypedSupabaseClient,
  query: string,
  options: {
    limit?: number;
    status?: TournamentStatus[];
  } = {}
): Promise<Tournament[]> {
  const { limit = 20, status } = options;

  let dbQuery = supabase
    .from('tournaments')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (status && status.length > 0) {
    dbQuery = dbQuery.in('status', status);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new TournamentError(error.message, error.code);
  }

  return data ?? [];
}
