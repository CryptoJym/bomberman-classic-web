'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

interface ProtectedRouteProps {
  /** Child components to render when authenticated */
  children: ReactNode;
  /** Optional custom loading component */
  loadingComponent?: ReactNode;
  /** Optional custom redirect path (default: /sign-in) */
  redirectTo?: string;
  /** Optional callback when user is not authenticated */
  onUnauthenticated?: () => void;
}

/**
 * ProtectedRoute Component
 *
 * Wraps content that requires authentication.
 * Automatically redirects to sign-in if user is not authenticated.
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <GameLobby />
 * </ProtectedRoute>
 * ```
 *
 * @example With custom loading
 * ```tsx
 * <ProtectedRoute loadingComponent={<CustomLoader />}>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  loadingComponent,
  redirectTo = '/sign-in',
  onUnauthenticated,
}: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Call optional callback
      onUnauthenticated?.();

      // Redirect to sign-in with return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?redirect_url=${returnUrl}`);
    }
  }, [isLoaded, isSignedIn, router, pathname, redirectTo, onUnauthenticated]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Show nothing while redirecting (prevents flash of content)
  if (!isSignedIn) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

/**
 * Default loading state with SNES retro styling
 */
function DefaultLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-retro-dark">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <div className="scanlines absolute inset-0" />
      <div className="relative z-10 text-center">
        <div className="mb-4 text-4xl animate-bounce">💣</div>
        <p className="font-pixel text-sm text-bomber-yellow animate-pulse">
          LOADING<span className="loading-dots" />
        </p>
      </div>
    </div>
  );
}

/**
 * Higher-order component version of ProtectedRoute
 *
 * @example
 * ```tsx
 * export default withAuth(DashboardPage);
 * ```
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
