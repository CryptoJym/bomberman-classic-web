/**
 * Leaderboard Page
 * Main leaderboard view with filtering and pagination
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Container } from '@/components/layout/Container';
import { Leaderboard } from '@/components/leaderboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RankProgress } from '@/components/leaderboard/RankProgress';
import { Spinner } from '@/components/ui/Spinner';
import type { LeaderboardType, LeaderboardTimeFilter, LeaderboardResponse } from '@/types/api';

export default function LeaderboardPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [type, setType] = useState<LeaderboardType>('elo');
  const [timeFilter, setTimeFilter] = useState<LeaderboardTimeFilter>('all_time');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        type,
        timeFilter,
      });

      const response = await fetch(`/api/leaderboard?${params}`);
      const result = await response.json();

      if (result.success) {
        setLeaderboardData(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, timeFilter]);

  return (
    <Container className="py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-pixel text-2xl text-bomber-yellow uppercase tracking-wider">
            Global Leaderboard
          </h1>
          <p className="font-retro text-gray-400">
            Compete for the top spot and climb the ranks!
          </p>
        </div>

        {/* User Stats Card (if logged in) */}
        {isSignedIn && user && leaderboardData?.currentUserEntry && (
          <Card variant="glow" padding="lg">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={user.imageUrl}
                    alt={user.username || 'User'}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full border-2 border-bomber-cyan"
                  />
                  <div>
                    <h2 className="font-pixel text-lg text-bomber-cyan">
                      {user.username || user.firstName || 'Player'}
                    </h2>
                    <p className="font-retro text-sm text-gray-400">
                      Your Performance
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="font-pixel text-[10px] text-gray-400 uppercase">
                      Global Rank
                    </div>
                    <div className="font-pixel text-2xl text-bomber-yellow">
                      #{leaderboardData.currentUserEntry.rank}
                    </div>
                  </div>
                  <div>
                    <div className="font-pixel text-[10px] text-gray-400 uppercase">
                      ELO Rating
                    </div>
                    <div className="font-pixel text-2xl text-white">
                      {leaderboardData.currentUserEntry.eloRating}
                    </div>
                  </div>
                  <div>
                    <div className="font-pixel text-[10px] text-gray-400 uppercase">
                      Win Rate
                    </div>
                    <div className="font-pixel text-2xl text-bomber-green">
                      {leaderboardData.currentUserEntry.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-pixel text-[10px] text-gray-400 uppercase">
                      Total Wins
                    </div>
                    <div className="font-pixel text-2xl text-white">
                      {leaderboardData.currentUserEntry.totalWins}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-64 shrink-0">
                <RankProgress
                  elo={leaderboardData.currentUserEntry.eloRating}
                  detailed
                />
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        {leaderboardData ? (
          <Leaderboard
            entries={leaderboardData.entries}
            currentUserEntry={leaderboardData.currentUserEntry}
            type={type}
            timeFilter={timeFilter}
            page={page}
            totalPages={leaderboardData.pagination.totalPages}
            isLoading={isLoading}
            onTypeChange={(newType) => {
              setType(newType);
              setPage(1);
            }}
            onTimeFilterChange={(newFilter) => {
              setTimeFilter(newFilter);
              setPage(1);
            }}
            onPageChange={(newPage) => {
              setPage(newPage);
            }}
            lastUpdated={leaderboardData.lastUpdated}
            showCountry
          />
        ) : (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
              <span className="ml-3 font-pixel text-sm text-gray-400 uppercase">
                Loading leaderboard...
              </span>
            </div>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle>How ELO Works</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-retro text-sm text-gray-400">
                Win games to gain ELO points. The more skilled your opponents, the more points you gain!
                Lose and you&apos;ll lose points. Your rank is determined by your ELO rating.
              </p>
            </CardContent>
          </Card>

          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle>Rank Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-retro text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>🥉 Bronze</span>
                  <span>0-1099</span>
                </div>
                <div className="flex justify-between">
                  <span>🥈 Silver</span>
                  <span>1100-1299</span>
                </div>
                <div className="flex justify-between">
                  <span>🥇 Gold</span>
                  <span>1300-1499</span>
                </div>
                <div className="flex justify-between">
                  <span>💎 Platinum</span>
                  <span>1500-1699</span>
                </div>
                <div className="flex justify-between">
                  <span>💠 Diamond</span>
                  <span>1700-1899</span>
                </div>
                <div className="flex justify-between">
                  <span>👑 Master</span>
                  <span>1900-2099</span>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Grandmaster</span>
                  <span>2100+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle>Season Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-retro text-sm text-gray-400">
                Seasons reset quarterly. Compete for seasonal rewards and bragging rights!
                Top players get exclusive badges and titles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
