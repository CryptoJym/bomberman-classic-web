export {
  getCurrentUser,
  requireAuth,
  getClerkUserId,
  getUser,
  isAuthenticated,
  getClerkToken,
  getGameAuthData,
  getUserIdFromHeaders,
  requireUserIdFromHeaders,
} from './auth';

export type { AuthUser } from './auth';
