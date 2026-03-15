'use client';

import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

/**
 * Client-side user data formatted for application use
 */
export interface ClientAuthUser {
  id: string;
  clerkId: string;
  username: string;
  displayName: string;
  email: string | null;
  imageUrl: string | null;
}

/**
 * Return type for the useAuth hook
 */
export interface UseAuthReturn {
  /** The current user data, null if not signed in */
  user: ClientAuthUser | null;
  /** Whether the Clerk SDK has loaded */
  isLoaded: boolean;
  /** Whether the user is signed in */
  isSignedIn: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Get a session token for API calls */
  getToken: () => Promise<string | null>;
  /** The user's Clerk ID */
  userId: string | null;
}

/**
 * Client-side authentication hook
 *
 * Wraps Clerk's useUser and useAuth hooks to provide a consistent interface
 * for accessing user data and authentication state.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isLoaded, isSignedIn, signOut } = useAuth();
 *
 *   if (!isLoaded) return <div>Loading...</div>;
 *   if (!isSignedIn) return <div>Please sign in</div>;
 *
 *   return <div>Hello, {user.displayName}!</div>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { user: clerkUser, isLoaded: userLoaded, isSignedIn: userSignedIn } = useUser();
  const { signOut: clerkSignOut, getToken: clerkGetToken, userId } = useClerkAuth();
  const { isLoaded: sessionLoaded } = useSession();

  // Format the user data
  const user = useMemo<ClientAuthUser | null>(() => {
    if (!clerkUser) {
      return null;
    }

    return {
      id: clerkUser.id,
      clerkId: clerkUser.id,
      username: clerkUser.username || `player_${clerkUser.id.slice(-8)}`,
      displayName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username ||
        'Player',
      email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
      imageUrl: clerkUser.imageUrl || null,
    };
  }, [clerkUser]);

  // Check if everything is loaded
  const isLoaded = userLoaded && sessionLoaded;

  // Determine if signed in (only valid after loaded)
  const isSignedIn = isLoaded && !!userSignedIn && !!clerkUser;

  // Sign out handler
  const signOut = async (): Promise<void> => {
    await clerkSignOut();
  };

  // Get token handler
  const getToken = async (): Promise<string | null> => {
    try {
      return await clerkGetToken();
    } catch {
      return null;
    }
  };

  return {
    user,
    isLoaded,
    isSignedIn,
    signOut,
    getToken,
    userId: userId || null,
  };
}

/**
 * Hook to get the current user's ID only
 * Useful when you only need the user ID for API calls
 */
export function useUserId(): {
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
} {
  const { userId, isLoaded, isSignedIn } = useClerkAuth();

  return {
    userId: userId || null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
  };
}

/**
 * Hook to get a session token for authenticated API calls
 */
export function useSessionToken(): {
  getToken: () => Promise<string | null>;
  isLoaded: boolean;
} {
  const { getToken: clerkGetToken, isLoaded } = useClerkAuth();

  const getToken = async (): Promise<string | null> => {
    try {
      return await clerkGetToken();
    } catch {
      return null;
    }
  };

  return {
    getToken,
    isLoaded,
  };
}
