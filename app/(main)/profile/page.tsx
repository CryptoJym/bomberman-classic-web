'use client';

import { useState } from 'react';
import { useProfileByClerkId } from '@/lib/hooks/useProfile';
import { useMatchHistory } from '@/lib/hooks/useMatchHistory';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { useUser } from '@clerk/nextjs';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { StatsChart } from '@/components/profile/StatsChart';
import { MatchHistory } from '@/components/profile/MatchHistory';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { data: profile, isLoading: isLoadingProfile } = useProfileByClerkId(user?.id);
  const { data: stats, isLoading: isLoadingStats } = useUserStats();
  const { data: matchHistory, isLoading: isLoadingHistory } = useMatchHistory(1, { limit: 10 });

  const [activeTab, setActiveTab] = useState('overview');

  if (!isLoaded || isLoadingProfile) {
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
          <p className="font-retro text-gray-400 mb-6">Unable to load your profile</p>
          <Link href="/lobby">
            <Button variant="primary">Back to Lobby</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-pixel text-3xl text-bomber-yellow uppercase">Your Profile</h1>
        <div className="flex gap-3">
          <Link href="/profile/edit">
            <Button variant="primary" size="md">
              Edit Profile
            </Button>
          </Link>
          <Link href="/profile/settings">
            <Button variant="secondary" size="md">
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mb-8">
        <ProfileCard profile={profile} isOwnProfile={true} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Stats */}
          {stats && (
            <>
              <StatsChart
                title="Kill/Death Distribution"
                type="pie"
                data={[
                  { label: 'Kills', value: stats.allTime.kills, color: '#E6194B' },
                  { label: 'Deaths', value: stats.allTime.deaths, color: '#808080' },
                ]}
              />
              <StatsChart
                title="Game Results"
                type="pie"
                data={[
                  { label: 'Wins', value: stats.allTime.wins, color: '#3CB44B' },
                  { label: 'Losses', value: stats.allTime.losses, color: '#E6194B' },
                ]}
              />
            </>
          )}

          {/* Recent Matches */}
          <div className="lg:col-span-2">
            {isLoadingHistory ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : matchHistory ? (
              <MatchHistory
                matches={matchHistory.data}
                hasMore={matchHistory.pagination.hasNextPage}
              />
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoadingStats ? (
            <div className="lg:col-span-2 flex justify-center py-12">
              <Spinner />
            </div>
          ) : stats ? (
            <>
              <StatsChart
                title="Performance by Time Period"
                type="bar"
                data={[
                  { label: 'All Time', value: stats.allTime.winRate, color: '#FFD700' },
                  { label: 'Season', value: stats.season.winRate, color: '#0082C8' },
                  { label: 'Weekly', value: stats.weekly.winRate, color: '#3CB44B' },
                ]}
              />
              <StatsChart
                title="K/D Ratio by Period"
                type="bar"
                data={[
                  { label: 'All Time', value: stats.allTime.kdRatio, color: '#E6194B' },
                  { label: 'Season', value: stats.season.kdRatio, color: '#F58231' },
                  { label: 'Weekly', value: stats.weekly.kdRatio, color: '#FFE119' },
                ]}
              />
              <StatsChart
                title="Powerup Collection"
                type="pie"
                data={Object.entries(stats.powerupStats).map(([key, value]: [string, number]) => ({
                  label: key.charAt(0).toUpperCase() + key.slice(1),
                  value,
                  color: getPowerupColor(key),
                }))}
              />
            </>
          ) : (
            <div className="lg:col-span-2 text-center py-12">
              <p className="font-pixel text-gray-500">No stats available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {isLoadingHistory ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : matchHistory ? (
            <MatchHistory
              matches={matchHistory.data}
              hasMore={matchHistory.pagination.hasNextPage}
            />
          ) : (
            <div className="text-center py-12">
              <p className="font-pixel text-gray-500">No match history available</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function getPowerupColor(powerup: string): string {
  const colors: Record<string, string> = {
    bomb: '#E6194B',
    fire: '#F58231',
    speed: '#FFE119',
    kick: '#3CB44B',
    punch: '#0082C8',
  };
  return colors[powerup] || '#808080';
}
