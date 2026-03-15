'use client';

import { use, useState } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { usePlayerGameHistory } from '@/lib/hooks/useProfile';
import { useUser } from '@clerk/nextjs';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { StatsChart } from '@/components/profile/StatsChart';
import { MatchHistory } from '@/components/profile/MatchHistory';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Link from 'next/link';
import type { GameSummary } from '@/types/api';

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user } = useUser();
  const { data: profile, isLoading: isLoadingProfile } = useProfile(userId);
  const { data: gameHistory, isLoading: isLoadingHistory } = usePlayerGameHistory(userId, { limit: 20 });

  const [activeTab, setActiveTab] = useState('overview');

  const isOwnProfile = user?.id === profile?.clerkId;

  if (isLoadingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-pixel text-2xl text-bomber-red mb-4">PROFILE NOT FOUND</h1>
          <p className="font-retro text-gray-400 mb-6">This user does not exist or has a private profile</p>
          <Link href="/lobby">
            <Button variant="primary">Back to Lobby</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Map game history to match format
  const matches: GameSummary[] = gameHistory?.games.map((game) => ({
    id: game.game_id,
    roomCode: '',
    map: {
      id: '',
      name: game.map_name || 'Unknown Map',
      thumbnailUrl: undefined,
    },
    result: game.placement === 1 ? 'win' : 'loss',
    placement: game.placement || 0,
    totalPlayers: game.player_count,
    kills: game.kills,
    deaths: game.deaths,
    eloChange: game.elo_change,
    duration: 0,
    rounds: 0,
    playedAt: game.played_at,
    hasReplay: false,
    players: [],
  })) || [];

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-pixel text-3xl text-bomber-yellow uppercase">
          {isOwnProfile ? 'Your Profile' : `${profile.username}'s Profile`}
        </h1>
        {isOwnProfile && (
          <div className="flex gap-3">
            <Link href="/profile/edit">
              <Button variant="primary" size="md">
                Edit Profile
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="mb-8">
        <ProfileCard
          profile={profile}
          isOwnProfile={isOwnProfile}
          actions={
            !isOwnProfile && (
              <div className="flex gap-3">
                <Button variant="primary" size="sm" fullWidth>
                  Add Friend
                </Button>
                <Button variant="secondary" size="sm" fullWidth>
                  Challenge
                </Button>
              </div>
            )
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <StatsChart
            title="Kill/Death Distribution"
            type="pie"
            data={[
              { label: 'Kills', value: profile.totalKills, color: '#E6194B' },
              { label: 'Deaths', value: profile.totalDeaths, color: '#808080' },
            ]}
          />
          <StatsChart
            title="Game Results"
            type="pie"
            data={[
              { label: 'Wins', value: profile.totalWins, color: '#3CB44B' },
              { label: 'Losses', value: profile.totalGames - profile.totalWins, color: '#E6194B' },
            ]}
          />

          {/* Recent Matches */}
          <div className="lg:col-span-2">
            {isLoadingHistory ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <MatchHistory
                matches={matches.slice(0, 10)}
                hasMore={false}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {isLoadingHistory ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <MatchHistory
              matches={matches}
              hasMore={false}
            />
          )}
        </div>
      )}
    </main>
  );
}
