'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { Profile, RankTier } from '@/types/api';

export interface ProfileHeaderProps {
  /** Profile data */
  profile: Profile;
  /** Whether this is the current user's profile */
  isOwnProfile?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Profile header showing avatar, username, rank, and online status
 */
export function ProfileHeader({ profile, isOwnProfile = false, className }: ProfileHeaderProps) {
  const getRankColor = (tier: RankTier): string => {
    const colors: Record<RankTier, string> = {
      bronze: 'text-accent-bronze',
      silver: 'text-accent-silver',
      gold: 'text-accent-gold',
      platinum: 'text-bomber-cyan',
      diamond: 'text-bomber-blue',
      master: 'text-bomber-purple',
      grandmaster: 'text-accent-gold',
    };
    return colors[tier];
  };

  const getRankIcon = (tier: RankTier): string => {
    const icons: Record<RankTier, string> = {
      bronze: '★',
      silver: '★★',
      gold: '★★★',
      platinum: '◆',
      diamond: '◆◆',
      master: '♛',
      grandmaster: '♛♛',
    };
    return icons[tier];
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar with online status */}
      <div className="relative">
        <Avatar
          src={profile.avatarUrl}
          alt={profile.username}
          fallback={profile.displayName?.[0] || profile.username[0]}
          size="xl"
          status={profile.isOnline ? 'online' : 'offline'}
          ring
          className="border-4 border-game-wall shadow-[4px_4px_0_0_rgba(0,0,0,0.8)]"
        />

        {/* In-game indicator */}
        {profile.inGame && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <Badge variant="success" size="sm" glow>
              IN GAME
            </Badge>
          </div>
        )}
      </div>

      {/* Username and Display Name */}
      <div className="text-center">
        <h2 className="font-pixel text-xl text-white uppercase tracking-wider mb-1">
          {profile.username}
        </h2>
        {profile.displayName && profile.displayName !== profile.username && (
          <p className="font-retro text-sm text-gray-400">{profile.displayName}</p>
        )}
      </div>

      {/* Rank and ELO */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('font-pixel text-2xl uppercase', getRankColor(profile.rankTier))}>
            {getRankIcon(profile.rankTier)} {profile.rankTier}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-retro text-gray-400">ELO:</span>
          <span className="font-pixel text-bomber-yellow">{profile.eloRating}</span>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="font-retro text-sm text-gray-300 text-center max-w-md px-4">
          {profile.bio}
        </p>
      )}

      {/* Country Flag */}
      {profile.country && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-retro text-gray-400">Country:</span>
          <span className="font-pixel text-white uppercase">{profile.country}</span>
        </div>
      )}

      {/* Own Profile Indicator */}
      {isOwnProfile && (
        <Badge variant="primary" size="sm">
          YOUR PROFILE
        </Badge>
      )}
    </div>
  );
}
