'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserButtonProps {
  /** Show user's username next to the avatar */
  showName?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * UserButton Component
 *
 * A styled wrapper around Clerk's UserButton with SNES retro aesthetics.
 * Provides profile management, account settings, and sign-out functionality.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <UserButton />
 *
 * // With name visible
 * <UserButton showName />
 *
 * // Different sizes
 * <UserButton size="lg" />
 * ```
 */
export function UserButton({
  showName = false,
  className = '',
  size = 'md',
}: UserButtonProps) {
  const { user, isLoaded, isSignedIn } = useAuth();

  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Don't render anything while loading
  if (!isLoaded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${sizeClasses[size]} rounded-full bg-game-wall animate-pulse`}
        />
        {showName && (
          <div className="h-4 w-20 bg-game-wall rounded animate-pulse" />
        )}
      </div>
    );
  }

  // Don't render if not signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ClerkUserButton
        appearance={{
          elements: {
            // Avatar button container
            userButtonAvatarBox: `${sizeClasses[size]} border-2 border-bomber-yellow shadow-pixel hover:border-bomber-cyan transition-colors`,
            userButtonAvatarImage: 'rounded-sm',
            // Popup/dropdown styling
            userButtonPopoverCard:
              'bg-retro-navy border-2 border-game-wall shadow-retro-card rounded-none',
            userButtonPopoverActions: 'bg-transparent',
            userButtonPopoverActionButton:
              'text-gray-300 hover:text-white hover:bg-retro-darker font-retro',
            userButtonPopoverActionButtonText: 'font-retro',
            userButtonPopoverActionButtonIcon: 'text-bomber-blue',
            userButtonPopoverFooter: 'hidden',
            // User preview section
            userPreviewMainIdentifier: 'text-white font-pixel text-xs',
            userPreviewSecondaryIdentifier: 'text-gray-400 font-retro',
            userPreviewAvatarBox: 'border-2 border-bomber-yellow',
            // Manage account button
            userButtonPopoverActionButton__manageAccount:
              'text-bomber-blue hover:text-bomber-cyan',
            userButtonPopoverActionButton__signOut:
              'text-bomber-red hover:text-red-400',
          },
        }}
        afterSignOutUrl="/"
        userProfileMode="navigation"
        userProfileUrl="/profile"
      />
      {showName && user && (
        <div className="flex flex-col">
          <span className={`font-pixel ${textSizeClasses[size]} text-white truncate max-w-[120px]`}>
            {user.displayName}
          </span>
          {user.username && user.username !== user.displayName && (
            <span className="text-xs text-gray-400 font-retro truncate max-w-[120px]">
              @{user.username}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact user button for mobile/small spaces
 */
export function UserButtonCompact({ className = '' }: { className?: string }) {
  return <UserButton size="sm" className={className} />;
}

/**
 * User button with name for headers/navbars
 */
export function UserButtonWithName({ className = '' }: { className?: string }) {
  return <UserButton showName size="md" className={className} />;
}

export default UserButton;
