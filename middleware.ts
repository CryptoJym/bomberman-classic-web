import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey =
  typeof clerkPublishableKey === 'string' &&
  (clerkPublishableKey.startsWith('pk_test_') || clerkPublishableKey.startsWith('pk_live_')) &&
  clerkPublishableKey.length > 20 &&
  !clerkPublishableKey.includes('placeholder');

/**
 * Public routes that don't require authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/snake',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

/**
 * API routes that need the user ID in headers
 */
const isApiRoute = createRouteMatcher([
  '/api/(.*)',
]);

const authenticatedMiddleware = clerkMiddleware(async (auth, req) => {
  const authObj = await auth();

  // For protected routes, require authentication
  if (!isPublicRoute(req)) {
    if (!authObj.userId) {
      return authObj.redirectToSignIn();
    }
  }

  // For API routes (except webhooks), add user ID to headers
  if (isApiRoute(req) && !req.nextUrl.pathname.startsWith('/api/webhooks')) {
    const requestHeaders = new Headers(req.headers);

    // Add Clerk user ID to headers for API routes
    if (authObj.userId) {
      requestHeaders.set('x-clerk-user-id', authObj.userId);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
});

export default hasValidClerkKey
  ? authenticatedMiddleware
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
