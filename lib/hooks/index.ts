// Game State Hooks
export { useGameStore, useLocalPlayer, useGameConnection } from './useGameState';

// Auth Hooks
export { useAuth, useUserId, useSessionToken } from './useAuth';
export type { UseAuthReturn, ClientAuthUser } from './useAuth';

// Profile Hooks
export {
  useProfile,
  useProfileByClerkId,
  useProfileWithStats,
  useUpdateProfile,
  useUpdateOnlineStatus,
  useUpdatePlayerSettings,
  useSearchProfiles,
  usePlayerGameHistory,
  profileKeys,
} from './useProfile';

// Leaderboard Hooks
export {
  useLeaderboard,
  useInfiniteLeaderboard,
  usePlayerRank,
  useLeaderboardAroundPlayer,
  useTopPlayersByStat,
  useRankDistribution,
  useCountryLeaderboard,
  useRecentEloChanges,
  leaderboardKeys,
} from './useLeaderboard';

// Maps Hooks
export {
  useMap,
  useMapWithCreator,
  useMaps,
  useInfiniteMaps,
  useOfficialMaps,
  useFeaturedMaps,
  usePopularMaps,
  usePlayerMaps,
  usePlayerFavorites,
  useIsMapFavorited,
  useMapRating,
  useCreateMap,
  useUpdateMap,
  useDeleteMap,
  usePublishMap,
  useToggleMapFavorite,
  useRateMap,
  useForkMap,
  useIncrementMapPlayCount,
  mapKeys,
} from './useMaps';

// Achievements Hooks
export {
  useAchievements,
  useAchievement,
  useAchievementByCode,
  usePlayerAchievements,
  useAchievementsWithProgress,
  usePlayerAchievementStats,
  useUnnotifiedAchievements,
  useRecentGlobalUnlocks,
  useRarestAchievements,
  useUnlockAchievement,
  useUpdateAchievementProgress,
  useCheckPlayerAchievements,
  useMarkAchievementsNotified,
  achievementKeys,
} from './useAchievements';

// Friends Hooks
export {
  useFriends,
  useOnlineFriends,
  usePendingRequests,
  useSentRequests,
  useBlockedUsers,
  useFriendshipStatus,
  useAreFriends,
  useFriendCount,
  usePendingRequestCount,
  useMutualFriends,
  useFriendSuggestions,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useCancelFriendRequest,
  useRemoveFriend,
  useBlockUser,
  useUnblockUser,
  friendKeys,
} from './useFriends';
