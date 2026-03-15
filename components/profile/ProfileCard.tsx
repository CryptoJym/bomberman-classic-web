'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { ProfileHeader } from './ProfileHeader';
import { StatsOverview } from './StatsOverview';
import { cn } from '@/lib/utils/cn';
import type { Profile } from '@/types/api';

export interface ProfileCardProps {
  /** Profile data to display */
  profile: Profile;
  /** Whether this is the current user's profile */
  isOwnProfile?: boolean;
  /** Additional actions (buttons, etc) */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Main profile display card showing avatar, username, rank, and key stats
 */
export function ProfileCard({
  profile,
  isOwnProfile = false,
  actions,
  className,
}: ProfileCardProps) {
  return (
    <Card
      variant="elevated"
      padding="none"
      className={cn('overflow-hidden', className)}
    >
      {/* Header with avatar and user info */}
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        className="p-6 bg-gradient-to-b from-retro-navy to-retro-darker"
      />

      {/* Stats Overview */}
      <CardContent className="p-6">
        <StatsOverview
          totalGames={profile.totalGames}
          totalWins={profile.totalWins}
          totalKills={profile.totalKills}
          totalDeaths={profile.totalDeaths}
          winRate={profile.winRate}
          kdRatio={profile.kdRatio}
        />
      </CardContent>

      {/* Actions (if provided) */}
      {actions && (
        <div className="p-4 border-t-2 border-game-wall/30 bg-retro-darker">
          {actions}
        </div>
      )}
    </Card>
  );
}
