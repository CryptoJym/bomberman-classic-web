/**
 * Friendship Data Access Functions
 *
 * Provides functions for managing friendships and friend requests in Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Friendship,
  FriendshipStatus,
  Profile,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Error class for friendship operations
 */
export class FriendshipError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'FriendshipError';
  }
}

/**
 * Friend with profile info (extended with friendship data)
 */
export interface FriendProfileInfo {
  friendship: Friendship;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
    last_seen_at: string | null;
    elo_rating: number;
    rank_tier: string;
    total_wins: number;
    total_games: number;
  };
}

/**
 * Friend request with requester profile
 */
export interface FriendRequest {
  friendship: Friendship;
  requester: {
    id: string;
    username: string;
    avatar_url: string | null;
    elo_rating: number;
    rank_tier: string;
  };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  supabase: TypedSupabaseClient,
  requesterId: string,
  addresseeId: string
): Promise<Friendship> {
  // Check if they're the same person
  if (requesterId === addresseeId) {
    throw new FriendshipError('Cannot send friend request to yourself', 'SELF_REQUEST');
  }

  // Check if friendship already exists (in either direction)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),` +
      `and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
    )
    .single();

  if (existing) {
    if (existing.status === 'accepted') {
      throw new FriendshipError('Already friends', 'ALREADY_FRIENDS');
    }
    if (existing.status === 'pending') {
      throw new FriendshipError('Friend request already pending', 'REQUEST_PENDING');
    }
    if (existing.status === 'blocked') {
      throw new FriendshipError('Cannot send friend request', 'BLOCKED');
    }
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return data;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  supabase: TypedSupabaseClient,
  friendshipId: string,
  addresseeId: string
): Promise<Friendship> {
  // Verify the addressee is the one accepting
  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .single();

  if (fetchError) {
    throw new FriendshipError(fetchError.message, fetchError.code);
  }

  if (friendship.addressee_id !== addresseeId) {
    throw new FriendshipError('Not authorized to accept this request', 'UNAUTHORIZED');
  }

  if (friendship.status !== 'pending') {
    throw new FriendshipError('Friend request is not pending', 'NOT_PENDING');
  }

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return data;
}

/**
 * Decline/reject a friend request
 */
export async function declineFriendRequest(
  supabase: TypedSupabaseClient,
  friendshipId: string,
  addresseeId: string
): Promise<void> {
  // Verify the addressee is the one declining
  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('addressee_id, status')
    .eq('id', friendshipId)
    .single();

  if (fetchError) {
    throw new FriendshipError(fetchError.message, fetchError.code);
  }

  if (friendship.addressee_id !== addresseeId) {
    throw new FriendshipError('Not authorized to decline this request', 'UNAUTHORIZED');
  }

  if (friendship.status !== 'pending') {
    throw new FriendshipError('Friend request is not pending', 'NOT_PENDING');
  }

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId);

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(
  supabase: TypedSupabaseClient,
  friendshipId: string,
  requesterId: string
): Promise<void> {
  // Verify the requester is the one canceling
  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('requester_id, status')
    .eq('id', friendshipId)
    .single();

  if (fetchError) {
    throw new FriendshipError(fetchError.message, fetchError.code);
  }

  if (friendship.requester_id !== requesterId) {
    throw new FriendshipError('Not authorized to cancel this request', 'UNAUTHORIZED');
  }

  if (friendship.status !== 'pending') {
    throw new FriendshipError('Friend request is not pending', 'NOT_PENDING');
  }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }
}

/**
 * Remove a friend (unfriend)
 */
export async function removeFriend(
  supabase: TypedSupabaseClient,
  userId: string,
  friendId: string
): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),` +
      `and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
    );

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }
}

/**
 * Block a user
 */
export async function blockUser(
  supabase: TypedSupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<Friendship> {
  // Check if friendship exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${blockerId},addressee_id.eq.${blockedId}),` +
      `and(requester_id.eq.${blockedId},addressee_id.eq.${blockerId})`
    )
    .single();

  if (existing) {
    // Update existing friendship to blocked
    const { data, error } = await supabase
      .from('friendships')
      .update({
        status: 'blocked',
        blocker_id: blockerId,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new FriendshipError(error.message, error.code);
    }

    return data;
  }

  // Create new blocked friendship
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: blockerId,
      addressee_id: blockedId,
      status: 'blocked',
      blocker_id: blockerId,
    })
    .select()
    .single();

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return data;
}

/**
 * Unblock a user
 */
export async function unblockUser(
  supabase: TypedSupabaseClient,
  unblockerId: string,
  blockedId: string
): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('status', 'blocked')
    .eq('blocker_id', unblockerId)
    .or(
      `and(requester_id.eq.${unblockerId},addressee_id.eq.${blockedId}),` +
      `and(requester_id.eq.${blockedId},addressee_id.eq.${unblockerId})`
    );

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }
}

/**
 * Get user's friends list
 */
export async function getFriends(
  supabase: TypedSupabaseClient,
  userId: string,
  options: {
    onlineOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ friends: FriendProfileInfo[]; total: number }> {
  const { onlineOnly = false, limit = 50, offset = 0 } = options;

  // Get friendships where status is accepted
  const { data: friendships, error: friendshipError, count } = await supabase
    .from('friendships')
    .select('*', { count: 'exact' })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .range(offset, offset + limit - 1);

  if (friendshipError) {
    throw new FriendshipError(friendshipError.message, friendshipError.code);
  }

  if (!friendships || friendships.length === 0) {
    return { friends: [], total: 0 };
  }

  // Get friend IDs
  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  // Get friend profiles
  let profileQuery = supabase
    .from('profiles')
    .select('id, username, avatar_url, is_online, last_seen_at, elo_rating, rank_tier, total_wins, total_games')
    .in('id', friendIds);

  if (onlineOnly) {
    profileQuery = profileQuery.eq('is_online', true);
  }

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    throw new FriendshipError(profileError.message, profileError.code);
  }

  // Map friendships to friends with profiles
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const friends = friendships
    .map((f) => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const profile = profileMap.get(friendId);

      if (!profile) {
        return null;
      }
      if (onlineOnly && !profile.is_online) {
        return null;
      }

      return {
        friendship: f,
        profile,
      } as FriendProfileInfo;
    })
    .filter((f): f is FriendProfileInfo => f !== null);

  return {
    friends,
    total: onlineOnly ? friends.length : (count ?? 0),
  };
}

/**
 * Get online friends
 */
export async function getOnlineFriends(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<FriendProfileInfo[]> {
  const { friends } = await getFriends(supabase, userId, { onlineOnly: true });
  return friends;
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingRequests(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      requester:profiles!friendships_requester_id_fkey (
        id, username, avatar_url, elo_rating, rank_tier
      )
    `
    )
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return (data ?? []).map((d) => ({
    friendship: d as Friendship,
    requester: d.requester as FriendRequest['requester'],
  }));
}

/**
 * Get sent friend requests (pending)
 */
export async function getSentRequests(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ friendship: Friendship; addressee: FriendRequest['requester'] }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      addressee:profiles!friendships_addressee_id_fkey (
        id, username, avatar_url, elo_rating, rank_tier
      )
    `
    )
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return (data ?? []).map((d) => ({
    friendship: d as Friendship,
    addressee: d.addressee as FriendRequest['requester'],
  }));
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ friendship: Friendship; blocked: { id: string; username: string } }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('blocker_id', userId)
    .eq('status', 'blocked');

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get blocked user IDs
  const blockedIds = data.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', blockedIds);

  if (profileError) {
    throw new FriendshipError(profileError.message, profileError.code);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((f) => {
    const blockedId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    return {
      friendship: f,
      blocked: profileMap.get(blockedId) ?? { id: blockedId, username: 'Unknown' },
    };
  });
}

/**
 * Check friendship status between two users
 */
export async function getFriendshipStatus(
  supabase: TypedSupabaseClient,
  userId1: string,
  userId2: string
): Promise<{
  status: FriendshipStatus | 'none';
  friendship: Friendship | null;
  isRequester: boolean;
}> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),` +
      `and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`
    )
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { status: 'none', friendship: null, isRequester: false };
    }
    throw new FriendshipError(error.message, error.code);
  }

  return {
    status: data.status,
    friendship: data,
    isRequester: data.requester_id === userId1,
  };
}

/**
 * Check if two users are friends
 */
export async function areFriends(
  supabase: TypedSupabaseClient,
  userId1: string,
  userId2: string
): Promise<boolean> {
  const { status } = await getFriendshipStatus(supabase, userId1, userId2);
  return status === 'accepted';
}

/**
 * Check if a user is blocked
 */
export async function isBlocked(
  supabase: TypedSupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'blocked')
    .eq('blocker_id', blockerId)
    .or(
      `and(requester_id.eq.${blockerId},addressee_id.eq.${blockedId}),` +
      `and(requester_id.eq.${blockedId},addressee_id.eq.${blockerId})`
    )
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new FriendshipError(error.message, error.code);
  }

  return data !== null;
}

/**
 * Get friend count
 */
export async function getFriendCount(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return count ?? 0;
}

/**
 * Get pending request count (received)
 */
export async function getPendingRequestCount(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return count ?? 0;
}

/**
 * Get mutual friends between two users
 */
export async function getMutualFriends(
  supabase: TypedSupabaseClient,
  userId1: string,
  userId2: string
): Promise<Profile[]> {
  // Get user1's friends
  const { friends: friends1 } = await getFriends(supabase, userId1);
  const friendIds1 = new Set(friends1.map((f) => f.profile.id));

  // Get user2's friends
  const { friends: friends2 } = await getFriends(supabase, userId2);
  const friendIds2 = new Set(friends2.map((f) => f.profile.id));

  // Find intersection
  const mutualIds = [...friendIds1].filter((id) => friendIds2.has(id));

  if (mutualIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', mutualIds);

  if (error) {
    throw new FriendshipError(error.message, error.code);
  }

  return data ?? [];
}

/**
 * Get friend suggestions based on mutual friends
 */
export async function getFriendSuggestions(
  supabase: TypedSupabaseClient,
  userId: string,
  limit: number = 10
): Promise<{ profile: Profile; mutualCount: number }[]> {
  // Get user's friends
  const { friends } = await getFriends(supabase, userId);
  const friendIds = friends.map((f) => f.profile.id);

  if (friendIds.length === 0) {
    return [];
  }

  // Get friends of friends
  const { data: friendsOfFriends, error: fofError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(
      friendIds.map((id) => `requester_id.eq.${id},addressee_id.eq.${id}`).join(',')
    );

  if (fofError) {
    throw new FriendshipError(fofError.message, fofError.code);
  }

  // Count potential friends
  const potentialFriends = new Map<string, number>();

  for (const f of friendsOfFriends ?? []) {
    const friendOfFriendId = friendIds.includes(f.requester_id)
      ? f.addressee_id
      : f.requester_id;

    // Skip if it's the user or already a friend
    if (friendOfFriendId === userId || friendIds.includes(friendOfFriendId)) {
      continue;
    }

    potentialFriends.set(
      friendOfFriendId,
      (potentialFriends.get(friendOfFriendId) ?? 0) + 1
    );
  }

  // Sort by mutual friend count and take top N
  const sortedPotential = [...potentialFriends.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sortedPotential.length === 0) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in(
      'id',
      sortedPotential.map(([id]) => id)
    );

  if (profileError) {
    throw new FriendshipError(profileError.message, profileError.code);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return sortedPotential
    .map(([id, count]) => ({
      profile: profileMap.get(id)!,
      mutualCount: count,
    }))
    .filter((s) => s.profile);
}
