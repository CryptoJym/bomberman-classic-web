/**
 * Specific Leaderboard Type Page
 * Dynamic route for specific leaderboard types (elo, wins, kills, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Leaderboard } from '@/components/leaderboard';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { LeaderboardType, LeaderboardTimeFilter, LeaderboardResponse } from '@/types/api';

export default function LeaderboardTypePage() {
  const params = useParams();
  const type = (params.type as LeaderboardType) || 'elo';
  const [timeFilter, setTimeFilter] = useState<LeaderboardTimeFilter>('all_time');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);

  // Validate type
  const validTypes: LeaderboardType[] = ['elo', 'wins', 'kills', 'games', 'win_streak'];
  const isValidType = validTypes.includes(type);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    if (!isValidType) {
      return;
    }

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

  // Type titles and descriptions
  const typeInfo: Record<LeaderboardType, { title: string; description: string; icon: string }> = {
    elo: {
      title: 'ELO Rating',
      description: 'Players ranked by their skill rating',
      icon: '⭐',
    },
    wins: {
      title: 'Total Wins',
      description: 'Players with the most victories',
      icon: '🏆',
    },
    kills: {
      title: 'Total Kills',
      description: 'Most lethal bomb masters',
      icon: '💣',
    },
    games: {
      title: 'Games Played',
      description: 'Most active players',
      icon: '🎮',
    },
    win_streak: {
      title: 'Win Streak',
      description: 'Longest winning streaks',
      icon: '🔥',
    },
  };

  if (!isValidType) {
    return (
      <Container className="py-8">
        <div className="max-w-4xl mx-auto">
          <Card variant="elevated" padding="lg">
            <div className="text-center py-12">
              <span className="text-4xl mb-4">❌</span>
              <h1 className="font-pixel text-xl text-bomber-red uppercase mb-2">
                Invalid Leaderboard Type
              </h1>
              <p className="font-retro text-gray-400">
                Please select a valid leaderboard type.
              </p>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  const info = typeInfo[type];

  return (
    <Container className="py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">{info.icon}</span>
            <h1 className="font-pixel text-2xl text-bomber-yellow uppercase tracking-wider">
              {info.title}
            </h1>
          </div>
          <p className="font-retro text-gray-400">{info.description}</p>
        </div>

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
            onTypeChange={() => {}} // Disabled in this view
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
      </div>
    </Container>
  );
}
