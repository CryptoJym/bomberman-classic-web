'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { LeaderboardEntryRow } from './LeaderboardEntry';
import { LeaderboardFilters } from './LeaderboardFilters';
import { LeaderboardTabs } from './LeaderboardTabs';
import type { LeaderboardEntry, LeaderboardTimeFilter, LeaderboardType } from '@/types/api';

export interface LeaderboardProps {
  /** Leaderboard entries */
  entries: LeaderboardEntry[];
  /** Current user's entry (if logged in) */
  currentUserEntry?: LeaderboardEntry;
  /** Current leaderboard type */
  type: LeaderboardType;
  /** Current time filter */
  timeFilter: LeaderboardTimeFilter;
  /** Current page */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when type changes */
  onTypeChange: (type: LeaderboardType) => void;
  /** Callback when time filter changes */
  onTimeFilterChange: (filter: LeaderboardTimeFilter) => void;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Last updated timestamp */
  lastUpdated?: string;
  /** Show country flags */
  showCountry?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Main leaderboard component with filtering and pagination
 */
export function Leaderboard({
  entries,
  currentUserEntry,
  type,
  timeFilter,
  page,
  totalPages,
  isLoading = false,
  onTypeChange,
  onTimeFilterChange,
  onPageChange,
  lastUpdated,
  showCountry = true,
  className,
}: LeaderboardProps) {
  const [showCurrentUser, setShowCurrentUser] = useState(false);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Tabs */}
      <Card variant="elevated" padding="none">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          {lastUpdated && (
            <div className="font-retro text-xs text-gray-400 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Leaderboard Type Tabs */}
            <LeaderboardTabs value={type} onChange={onTypeChange} />

            {/* Time Filters */}
            <LeaderboardFilters value={timeFilter} onChange={onTimeFilterChange} />
          </div>
        </CardContent>
      </Card>

      {/* Current User Entry (if available and not in top results) */}
      {currentUserEntry && !entries.some(e => e.playerId === currentUserEntry.playerId) && (
        <Card variant="interactive" padding="none">
          <button
            onClick={() => setShowCurrentUser(!showCurrentUser)}
            className="w-full text-left p-3 border-b-2 border-game-wall/30"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-bomber-cyan uppercase">
                Your Position
              </span>
              <span className="text-bomber-cyan">{showCurrentUser ? '▼' : '▶'}</span>
            </div>
          </button>
          {showCurrentUser && (
            <div className="p-1">
              <LeaderboardEntryRow
                entry={currentUserEntry}
                isCurrentUser
                showCountry={showCountry}
              />
            </div>
          )}
        </Card>
      )}

      {/* Leaderboard Entries */}
      <Card variant="elevated" padding="none">
        <div className="relative min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
              <span className="ml-3 font-pixel text-sm text-gray-400 uppercase">
                Loading...
              </span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-4xl mb-3">🏆</span>
              <span className="font-pixel text-sm text-gray-400 uppercase">
                No entries yet
              </span>
              <span className="font-retro text-xs text-gray-500 mt-2">
                Be the first to compete!
              </span>
            </div>
          ) : (
            <div className="divide-y-2 divide-game-wall/20">
              {entries.map((entry) => (
                <LeaderboardEntryRow
                  key={entry.playerId}
                  entry={entry}
                  isCurrentUser={currentUserEntry?.playerId === entry.playerId}
                  showCountry={showCountry}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t-2 border-game-wall/30">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              ← Prev
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;

                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    disabled={isLoading}
                    onClick={() => onPageChange(pageNum)}
                    className="min-w-[44px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
