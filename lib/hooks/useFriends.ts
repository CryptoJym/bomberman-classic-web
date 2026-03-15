/**
 * React Query hooks for Friends data
 */

'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getFriends,
  getOnlineFriends,
  getPendingRequests,
  getSentRequests,
  getBlockedUsers,
  getFriendshipStatus,
  areFriends,
  getFriendCount,
  getPendingRequestCount,
  getMutualFriends,
  getFriendSuggestions,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
} from '@/lib/supabase/queries/friends';
import type { Friendship, Profile, FriendshipStatus } from '@/lib/supabase/types';
import type { FriendProfileInfo, FriendRequest } from '@/lib/supabase/queries/friends';

// Query Keys
export const friendKeys = {
  all: ['friends'] as const,
  lists: () => [...friendKeys.all, 'list'] as const,
  list: (userId: string, filters?: Record<string, unknown>) =>
    [...friendKeys.lists(), userId, filters] as const,
  online: (userId: string) => [...friendKeys.list(userId), 'online'] as const,
  pendingRequests: (userId: string) => [...friendKeys.all, 'pending', userId] as const,
  sentRequests: (userId: string) => [...friendKeys.all, 'sent', userId] as const,
  blocked: (userId: string) => [...friendKeys.all, 'blocked', userId] as const,
  status: (userId1: string, userId2: string) =>
    [...friendKeys.all, 'status', userId1, userId2] as const,
  count: (userId: string) => [...friendKeys.all, 'count', userId] as const,
  pendingCount: (userId: string) => [...friendKeys.all, 'pendingCount', userId] as const,
  mutual: (userId1: string, userId2: string) =>
    [...friendKeys.all, 'mutual', userId1, userId2] as const,
  suggestions: (userId: string) => [...friendKeys.all, 'suggestions', userId] as const,
};

/**
 * Hook to get user's friends list
 */
export function useFriends(
  userId: string | undefined,
  options?: {
    onlineOnly?: boolean;
    limit?: number;
    offset?: number;
  },
  queryOptions?: Omit<
    UseQueryOptions<{ friends: FriendProfileInfo[]; total: number }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.list(userId ?? '', options),
    queryFn: () =>
      userId ? getFriends(supabase, userId, options) : { friends: [], total: 0 },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to get online friends
 */
export function useOnlineFriends(
  userId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<FriendProfileInfo[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.online(userId ?? ''),
    queryFn: () => (userId ? getOnlineFriends(supabase, userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds (refresh often for online status)
    refetchInterval: 1000 * 60, // Refetch every minute
    ...queryOptions,
  });
}

/**
 * Hook to get pending friend requests (received)
 */
export function usePendingRequests(
  userId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<FriendRequest[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.pendingRequests(userId ?? ''),
    queryFn: () => (userId ? getPendingRequests(supabase, userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    ...queryOptions,
  });
}

/**
 * Hook to get sent friend requests
 */
export function useSentRequests(
  userId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<{ friendship: Friendship; addressee: FriendRequest['requester'] }[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.sentRequests(userId ?? ''),
    queryFn: () => (userId ? getSentRequests(supabase, userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to get blocked users
 */
export function useBlockedUsers(
  userId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<{ friendship: Friendship; blocked: { id: string; username: string } }[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.blocked(userId ?? ''),
    queryFn: () => (userId ? getBlockedUsers(supabase, userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get friendship status between two users
 */
export function useFriendshipStatus(
  userId1: string | undefined,
  userId2: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<
      { status: FriendshipStatus | 'none'; friendship: Friendship | null; isRequester: boolean },
      Error
    >,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.status(userId1 ?? '', userId2 ?? ''),
    queryFn: () =>
      userId1 && userId2
        ? getFriendshipStatus(supabase, userId1, userId2)
        : { status: 'none' as const, friendship: null, isRequester: false },
    enabled: !!userId1 && !!userId2,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to check if two users are friends
 */
export function useAreFriends(userId1: string | undefined, userId2: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.status(userId1 ?? '', userId2 ?? ''),
    queryFn: () => (userId1 && userId2 ? areFriends(supabase, userId1, userId2) : false),
    enabled: !!userId1 && !!userId2,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get friend count
 */
export function useFriendCount(
  userId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.count(userId ?? ''),
    queryFn: () => (userId ? getFriendCount(supabase, userId) : 0),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
    ...queryOptions,
  });
}

/**
 * Hook to get pending request count
 */
export function usePendingRequestCount(
  userId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.pendingCount(userId ?? ''),
    queryFn: () => (userId ? getPendingRequestCount(supabase, userId) : 0),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    ...queryOptions,
  });
}

/**
 * Hook to get mutual friends
 */
export function useMutualFriends(
  userId1: string | undefined,
  userId2: string | undefined,
  queryOptions?: Omit<UseQueryOptions<Profile[], Error>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.mutual(userId1 ?? '', userId2 ?? ''),
    queryFn: () => (userId1 && userId2 ? getMutualFriends(supabase, userId1, userId2) : []),
    enabled: !!userId1 && !!userId2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook to get friend suggestions
 */
export function useFriendSuggestions(
  userId: string | undefined,
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<{ profile: Profile; mutualCount: number }[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const supabase = createClient();

  return useQuery({
    queryKey: friendKeys.suggestions(userId ?? ''),
    queryFn: () => (userId ? getFriendSuggestions(supabase, userId, limit) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...queryOptions,
  });
}

/**
 * Hook to send a friend request with optimistic updates
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ requesterId, addresseeId }: { requesterId: string; addresseeId: string }) =>
      sendFriendRequest(supabase, requesterId, addresseeId),
    onSuccess: (_data, { requesterId, addresseeId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: friendKeys.sentRequests(requesterId) });
      queryClient.invalidateQueries({
        queryKey: friendKeys.status(requesterId, addresseeId),
      });
    },
  });
}

/**
 * Hook to accept a friend request with optimistic updates
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      friendshipId,
      addresseeId,
    }: {
      friendshipId: string;
      addresseeId: string;
      requesterId: string;
    }) => acceptFriendRequest(supabase, friendshipId, addresseeId),
    onMutate: async ({ addresseeId }) => {
      // Cancel related queries
      await queryClient.cancelQueries({ queryKey: friendKeys.pendingRequests(addresseeId) });

      // Snapshot previous state
      const previousRequests = queryClient.getQueryData<FriendRequest[]>(
        friendKeys.pendingRequests(addresseeId)
      );

      return { previousRequests };
    },
    onError: (_err, { addresseeId }, context) => {
      // Rollback on error
      if (context?.previousRequests) {
        queryClient.setQueryData(friendKeys.pendingRequests(addresseeId), context.previousRequests);
      }
    },
    onSettled: (_data, _error, { addresseeId, requesterId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: friendKeys.pendingRequests(addresseeId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.pendingCount(addresseeId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.list(addresseeId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.count(addresseeId) });
      queryClient.invalidateQueries({
        queryKey: friendKeys.status(addresseeId, requesterId),
      });
    },
  });
}

/**
 * Hook to decline a friend request
 */
export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      friendshipId,
      addresseeId,
    }: {
      friendshipId: string;
      addresseeId: string;
      requesterId: string;
    }) => declineFriendRequest(supabase, friendshipId, addresseeId),
    onSuccess: (_data, { addresseeId, requesterId }) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.pendingRequests(addresseeId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.pendingCount(addresseeId) });
      queryClient.invalidateQueries({
        queryKey: friendKeys.status(addresseeId, requesterId),
      });
    },
  });
}

/**
 * Hook to cancel a sent friend request
 */
export function useCancelFriendRequest() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      friendshipId,
      requesterId,
    }: {
      friendshipId: string;
      requesterId: string;
      addresseeId: string;
    }) => cancelFriendRequest(supabase, friendshipId, requesterId),
    onSuccess: (_data, { requesterId, addresseeId }) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.sentRequests(requesterId) });
      queryClient.invalidateQueries({
        queryKey: friendKeys.status(requesterId, addresseeId),
      });
    },
  });
}

/**
 * Hook to remove a friend
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: string; friendId: string }) =>
      removeFriend(supabase, userId, friendId),
    onMutate: async ({ userId, friendId }) => {
      await queryClient.cancelQueries({ queryKey: friendKeys.list(userId) });

      const previousFriends = queryClient.getQueryData<{ friends: FriendProfileInfo[]; total: number }>(
        friendKeys.list(userId)
      );

      // Optimistically remove friend from list
      if (previousFriends) {
        queryClient.setQueryData(friendKeys.list(userId), {
          friends: previousFriends.friends.filter((f) => f.profile.id !== friendId),
          total: previousFriends.total - 1,
        });
      }

      return { previousFriends };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(friendKeys.list(userId), context.previousFriends);
      }
    },
    onSettled: (_data, _error, { userId, friendId }) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.count(userId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.status(userId, friendId) });
    },
  });
}

/**
 * Hook to block a user
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ blockerId, blockedId }: { blockerId: string; blockedId: string }) =>
      blockUser(supabase, blockerId, blockedId),
    onSuccess: (_data, { blockerId, blockedId }) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.blocked(blockerId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.list(blockerId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.status(blockerId, blockedId) });
    },
  });
}

/**
 * Hook to unblock a user
 */
export function useUnblockUser() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({ unblockerId, blockedId }: { unblockerId: string; blockedId: string }) =>
      unblockUser(supabase, unblockerId, blockedId),
    onSuccess: (_data, { unblockerId, blockedId }) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.blocked(unblockerId) });
      queryClient.invalidateQueries({ queryKey: friendKeys.status(unblockerId, blockedId) });
    },
  });
}
