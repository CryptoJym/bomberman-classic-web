'use client';

import { cn } from '@/lib/utils/cn';

export interface StatsOverviewProps {
  /** Total games played */
  totalGames: number;
  /** Total wins */
  totalWins: number;
  /** Total kills */
  totalKills: number;
  /** Total deaths */
  totalDeaths: number;
  /** Win rate percentage */
  winRate: number;
  /** Kill/death ratio */
  kdRatio: number;
  /** Additional class names */
  className?: string;
}

/**
 * Key stats summary grid
 */
export function StatsOverview({
  totalGames,
  totalWins,
  totalKills,
  totalDeaths,
  winRate,
  kdRatio,
  className,
}: StatsOverviewProps) {
  const stats = [
    {
      label: 'Games',
      value: totalGames.toLocaleString(),
      color: 'text-gray-300',
    },
    {
      label: 'Wins',
      value: totalWins.toLocaleString(),
      color: 'text-bomber-green',
    },
    {
      label: 'Kills',
      value: totalKills.toLocaleString(),
      color: 'text-bomber-red',
    },
    {
      label: 'Deaths',
      value: totalDeaths.toLocaleString(),
      color: 'text-gray-400',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? 'text-bomber-green' : 'text-gray-400',
    },
    {
      label: 'K/D Ratio',
      value: kdRatio.toFixed(2),
      color: kdRatio >= 1 ? 'text-bomber-green' : 'text-gray-400',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-4', className)}>
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          valueColor={stat.color}
        />
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatCard({ label, value, valueColor = 'text-white' }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative p-4 text-center',
        'bg-retro-darker/50',
        'border-2 border-t-game-wall/50 border-l-game-wall/50 border-b-game-wall/20 border-r-game-wall/20',
        'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]'
      )}
    >
      <p className="font-retro text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={cn('font-pixel text-2xl', valueColor)}>{value}</p>
    </div>
  );
}
