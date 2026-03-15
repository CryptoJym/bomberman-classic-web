/**
 * Real-time Subscriptions Module
 *
 * Provides functions for subscribing to real-time updates from Supabase
 */

import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type {
  Database,
  Game,
  GamePlayer,
  Profile,
  Friendship,
  Tournament,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

// Type for subscription callback
type SubscriptionCallback<T> = (payload: T) => void;

// Type for presence state
interface PresenceState {
  [key: string]: {
    id: string;
    username: string;
    status: 'online' | 'in_game' | 'idle';
    lastSeen: string;
  }[];
}

/**
 * Subscribe to game state changes
 */
export function subscribeToGame(
  supabase: TypedSupabaseClient,
  gameId: string,
  callbacks: {
    onGameUpdate?: SubscriptionCallback<Game>;
    onPlayerJoin?: SubscriptionCallback<GamePlayer>;
    onPlayerLeave?: SubscriptionCallback<GamePlayer>;
    onPlayerUpdate?: SubscriptionCallback<GamePlayer>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload: RealtimePostgresChangesPayload<Game>) => {
        if (callbacks.onGameUpdate && payload.new) {
          callbacks.onGameUpdate(payload.new as Game);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      },
      (payload: RealtimePostgresChangesPayload<GamePlayer>) => {
        if (callbacks.onPlayerJoin && payload.new) {
          callbacks.onPlayerJoin(payload.new as GamePlayer);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      },
      (payload: RealtimePostgresChangesPayload<GamePlayer>) => {
        if (callbacks.onPlayerLeave && payload.old) {
          callbacks.onPlayerLeave(payload.old as GamePlayer);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      },
      (payload: RealtimePostgresChangesPayload<GamePlayer>) => {
        if (callbacks.onPlayerUpdate && payload.new) {
          callbacks.onPlayerUpdate(payload.new as GamePlayer);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to lobby/game list updates
 */
export function subscribeToLobby(
  supabase: TypedSupabaseClient,
  callbacks: {
    onGameCreated?: SubscriptionCallback<Game>;
    onGameUpdated?: SubscriptionCallback<Game>;
    onGameDeleted?: SubscriptionCallback<{ id: string }>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel('lobby')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'games',
      },
      (payload: RealtimePostgresChangesPayload<Game>) => {
        if (callbacks.onGameCreated && payload.new) {
          callbacks.onGameCreated(payload.new as Game);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
      },
      (payload: RealtimePostgresChangesPayload<Game>) => {
        if (callbacks.onGameUpdated && payload.new) {
          callbacks.onGameUpdated(payload.new as Game);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'games',
      },
      (payload: RealtimePostgresChangesPayload<Game>) => {
        if (callbacks.onGameDeleted && payload.old) {
          callbacks.onGameDeleted({ id: (payload.old as Game).id });
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to friend status updates
 */
export function subscribeToFriendStatus(
  supabase: TypedSupabaseClient,
  friendIds: string[],
  callbacks: {
    onStatusChange?: SubscriptionCallback<{
      userId: string;
      isOnline: boolean;
      lastSeenAt: string | null;
    }>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel('friend_status')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=in.(${friendIds.join(',')})`,
      },
      (payload: RealtimePostgresChangesPayload<Profile>) => {
        if (callbacks.onStatusChange && payload.new) {
          const profile = payload.new as Profile;
          callbacks.onStatusChange({
            userId: profile.id,
            isOnline: profile.is_online,
            lastSeenAt: profile.last_seen_at,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to friendship changes (friend requests, etc.)
 */
export function subscribeToFriendships(
  supabase: TypedSupabaseClient,
  userId: string,
  callbacks: {
    onFriendRequest?: SubscriptionCallback<Friendship>;
    onFriendshipUpdate?: SubscriptionCallback<Friendship>;
    onFriendshipRemoved?: SubscriptionCallback<{ id: string }>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`friendships:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships',
        filter: `addressee_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Friendship>) => {
        if (callbacks.onFriendRequest && payload.new) {
          callbacks.onFriendRequest(payload.new as Friendship);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'friendships',
      },
      (payload: RealtimePostgresChangesPayload<Friendship>) => {
        if (callbacks.onFriendshipUpdate && payload.new) {
          const friendship = payload.new as Friendship;
          if (friendship.requester_id === userId || friendship.addressee_id === userId) {
            callbacks.onFriendshipUpdate(friendship);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'friendships',
      },
      (payload: RealtimePostgresChangesPayload<Friendship>) => {
        if (callbacks.onFriendshipRemoved && payload.old) {
          const friendship = payload.old as Friendship;
          if (friendship.requester_id === userId || friendship.addressee_id === userId) {
            callbacks.onFriendshipRemoved({ id: friendship.id });
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to player achievements
 */
export function subscribeToAchievements(
  supabase: TypedSupabaseClient,
  playerId: string,
  callbacks: {
    onAchievementUnlocked?: SubscriptionCallback<{
      achievementId: string;
      unlockedAt: string;
    }>;
    onProgressUpdate?: SubscriptionCallback<{
      achievementId: string;
      progress: number;
      progressMax: number;
    }>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`achievements:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_achievements',
        filter: `player_id=eq.${playerId}`,
      },
      (payload) => {
        const data = payload.new as {
          achievement_id: string;
          unlocked_at: string | null;
          progress: number;
          progress_max: number;
        };

        if (data.unlocked_at && callbacks.onAchievementUnlocked) {
          callbacks.onAchievementUnlocked({
            achievementId: data.achievement_id,
            unlockedAt: data.unlocked_at,
          });
        } else if (callbacks.onProgressUpdate) {
          callbacks.onProgressUpdate({
            achievementId: data.achievement_id,
            progress: data.progress,
            progressMax: data.progress_max,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to tournament updates
 */
export function subscribeToTournament(
  supabase: TypedSupabaseClient,
  tournamentId: string,
  callbacks: {
    onTournamentUpdate?: SubscriptionCallback<Tournament>;
    onParticipantJoin?: SubscriptionCallback<{
      playerId: string;
      tournamentId: string;
    }>;
    onParticipantLeave?: SubscriptionCallback<{
      playerId: string;
      tournamentId: string;
    }>;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`tournament:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      },
      (payload: RealtimePostgresChangesPayload<Tournament>) => {
        if (callbacks.onTournamentUpdate && payload.new) {
          callbacks.onTournamentUpdate(payload.new as Tournament);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tournament_players',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        if (callbacks.onParticipantJoin && payload.new) {
          const data = payload.new as { player_id: string; tournament_id: string };
          callbacks.onParticipantJoin({
            playerId: data.player_id,
            tournamentId: data.tournament_id,
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'tournament_players',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        if (callbacks.onParticipantLeave && payload.old) {
          const data = payload.old as { player_id: string; tournament_id: string };
          callbacks.onParticipantLeave({
            playerId: data.player_id,
            tournamentId: data.tournament_id,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to leaderboard changes
 */
export function subscribeToLeaderboard(
  supabase: TypedSupabaseClient,
  callbacks: {
    onRankChange?: SubscriptionCallback<{
      userId: string;
      eloRating: number;
      rankTier: string;
    }>;
  },
  options: {
    topN?: number;
  } = {}
): RealtimeChannel {
  const { topN: _topN = 100 } = options;

  // Note: This is a simplified implementation
  // In a real app, you might want to filter to only top N players
  const channel = supabase
    .channel('leaderboard')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      (payload: RealtimePostgresChangesPayload<Profile>) => {
        if (callbacks.onRankChange && payload.new && payload.old) {
          const newProfile = payload.new as Profile;
          const oldProfile = payload.old as Profile;

          // Only trigger if ELO or rank changed
          if (
            newProfile.elo_rating !== oldProfile.elo_rating ||
            newProfile.rank_tier !== oldProfile.rank_tier
          ) {
            callbacks.onRankChange({
              userId: newProfile.id,
              eloRating: newProfile.elo_rating,
              rankTier: newProfile.rank_tier,
            });
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Create a presence channel for a game room
 */
export function createGamePresence(
  supabase: TypedSupabaseClient,
  gameId: string,
  user: {
    id: string;
    username: string;
    status?: 'online' | 'in_game' | 'idle';
  },
  callbacks: {
    onSync?: SubscriptionCallback<PresenceState>;
    onJoin?: SubscriptionCallback<{
      key: string;
      newPresences: PresenceState[string];
    }>;
    onLeave?: SubscriptionCallback<{
      key: string;
      leftPresences: PresenceState[string];
    }>;
  }
): RealtimeChannel {
  const channel = supabase.channel(`presence:game:${gameId}`, {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      if (callbacks.onSync) {
        callbacks.onSync(channel.presenceState() as PresenceState);
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (callbacks.onJoin) {
        callbacks.onJoin({ key, newPresences });
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (callbacks.onLeave) {
        callbacks.onLeave({ key, leftPresences });
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: user.id,
          username: user.username,
          status: user.status ?? 'online',
          lastSeen: new Date().toISOString(),
        });
      }
    });

  return channel;
}

/**
 * Create a presence channel for global online status
 */
export function createGlobalPresence(
  supabase: TypedSupabaseClient,
  user: {
    id: string;
    username: string;
  },
  callbacks: {
    onSync?: SubscriptionCallback<PresenceState>;
    onUserOnline?: SubscriptionCallback<{
      userId: string;
      username: string;
    }>;
    onUserOffline?: SubscriptionCallback<{
      userId: string;
    }>;
  }
): RealtimeChannel {
  const channel = supabase.channel('presence:global', {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      if (callbacks.onSync) {
        callbacks.onSync(channel.presenceState() as PresenceState);
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (callbacks.onUserOnline && newPresences[0]) {
        callbacks.onUserOnline({
          userId: key,
          username: newPresences[0].username,
        });
      }
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      if (callbacks.onUserOffline) {
        callbacks.onUserOffline({ userId: key });
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: user.id,
          username: user.username,
          status: 'online',
          lastSeen: new Date().toISOString(),
        });
      }
    });

  return channel;
}

/**
 * Subscribe to profile changes (for own profile)
 */
export function subscribeToProfile(
  supabase: TypedSupabaseClient,
  userId: string,
  callback: SubscriptionCallback<Profile>
): RealtimeChannel {
  const channel = supabase
    .channel(`profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Profile>) => {
        if (payload.new) {
          callback(payload.new as Profile);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Utility to unsubscribe from a channel
 */
export async function unsubscribe(
  supabase: TypedSupabaseClient,
  channel: RealtimeChannel
): Promise<void> {
  await supabase.removeChannel(channel);
}

/**
 * Utility to unsubscribe from all channels
 */
export async function unsubscribeAll(
  supabase: TypedSupabaseClient
): Promise<void> {
  await supabase.removeAllChannels();
}

/**
 * Helper to update presence status
 */
export async function updatePresenceStatus(
  channel: RealtimeChannel,
  status: 'online' | 'in_game' | 'idle',
  user: { id: string; username: string }
): Promise<void> {
  await channel.track({
    id: user.id,
    username: user.username,
    status,
    lastSeen: new Date().toISOString(),
  });
}
