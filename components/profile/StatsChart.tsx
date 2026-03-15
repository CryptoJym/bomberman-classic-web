'use client';

import { cn } from '@/lib/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export interface StatsChartProps {
  /** Chart data */
  data: ChartData[];
  /** Chart title */
  title: string;
  /** Chart type */
  type?: 'bar' | 'pie';
  /** Additional class names */
  className?: string;
}

export interface ChartData {
  label: string;
  value: number;
  color: string;
}

/**
 * Visual stats display using simple CSS (no chart library)
 * Supports bar charts and pie charts
 */
export function StatsChart({ data, title, type = 'bar', className }: StatsChartProps) {
  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'bar' ? (
          <BarChart data={data} />
        ) : (
          <PieChart data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function BarChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-pixel text-xs text-gray-400 uppercase">
                {item.label}
              </span>
              <span className="font-pixel text-sm text-white">
                {item.value.toLocaleString()}
              </span>
            </div>
            <div className="relative w-full h-6 bg-retro-darker border-2 border-game-wall/30">
              <div
                className={cn(
                  'absolute inset-y-0 left-0',
                  'transition-all duration-500 ease-out',
                  'shadow-[inset_2px_2px_0_0_rgba(255,255,255,0.2)]'
                )}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ data }: { data: ChartData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="font-retro text-gray-500">No data available</p>
      </div>
    );
  }

  let currentRotation = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Pie Chart */}
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          style={{ filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.5))' }}
        >
          {data.map((item) => {
            const percentage = (item.value / total) * 100;
            const degrees = (percentage / 100) * 360;

            // Calculate slice path
            const startAngle = currentRotation;
            const endAngle = currentRotation + degrees;

            const slice = createPieSlice(50, 50, 45, startAngle, endAngle);
            currentRotation += degrees;

            return (
              <path
                key={item.label}
                d={slice}
                fill={item.color}
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((item) => {
          const percentage = ((item.value / total) * 100).toFixed(1);

          return (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="w-4 h-4 border-2 border-black"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-retro text-xs text-gray-400 flex-1">
                {item.label}
              </span>
              <span className="font-pixel text-sm text-white">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Create SVG path for pie slice
 */
function createPieSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
