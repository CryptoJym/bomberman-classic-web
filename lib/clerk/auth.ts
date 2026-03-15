import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * User data formatted for application use
 */
export interface AuthUser {
  id: string;
  clerkId: string;
  username: string;
  displayName: string;
  email: string | null;
  imageUrl: string | null;
}

/**
 * Get the current authenticated user with formatted data
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  return formatUser(user);
}

/**
 * Require authentication - throws redirect if not authenticated
 * Use in Server Components that require auth
 */
export async function requireAuth(): Promise<AuthUser> {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return formatUser(user);
}

/**
 * Get the current authenticated user's Clerk ID only
 * Returns null if not authenticated
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the full Clerk user object
 * Returns null if not authenticated
 */
export async function getUser(): Promise<User | null> {
  return currentUser();
}

/**
 * Check if the current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

/**
 * Get the Clerk session token for API calls
 * Use this to pass auth to external services (like game server)
 */
export async function getClerkToken(): Promise<string | null> {
  const authObj = await auth();
  try {
    const token = await authObj.getToken();
    return token;
  } catch {
    return null;
  }
}

/**
 * Get user data formatted for game server authentication
 */
export async function getGameAuthData(): Promise<{
  userId: string;
  username: string;
  imageUrl: string | null;
  token: string | null;
} | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const token = await getClerkToken();

  return {
    userId: user.id,
    username: user.username || user.firstName || 'Player',
    imageUrl: user.imageUrl,
    token,
  };
}

/**
 * Get the user ID from request headers (set by middleware)
 * Use this in API routes for faster auth check
 */
export function getUserIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-clerk-user-id');
}

/**
 * Require user ID from headers - throws if not present
 * Use this in protected API routes
 */
export function requireUserIdFromHeaders(headers: Headers): string {
  const userId = headers.get('x-clerk-user-id');

  if (!userId) {
    throw new Error('Unauthorized: No user ID in headers');
  }

  return userId;
}

/**
 * Format a Clerk User object to our AuthUser format
 */
function formatUser(user: User): AuthUser {
  return {
    id: user.id,
    clerkId: user.id,
    username: user.username || `player_${user.id.slice(-8)}`,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      'Player',
    email: user.emailAddresses?.[0]?.emailAddress || null,
    imageUrl: user.imageUrl || null,
  };
}
