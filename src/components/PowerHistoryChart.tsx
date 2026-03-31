import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyUsage } from '@/types/device';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PowerHistoryChartProps {
  dailyUsage: DailyUsage[];
}

export function PowerHistoryChart({ dailyUsage }: PowerHistoryChartProps) {
  const chartData = useMemo(() => {
    return dailyUsage.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      kwh: Number(day.totalKwh.toFixed(2)),
      peak: day.peakWatts,
    }));
  }, [dailyUsage]);

  const totalKwh = useMemo(() => {
    return dailyUsage.reduce((sum, day) => sum + day.totalKwh, 0);
  }, [dailyUsage]);

  const avgKwh = totalKwh / dailyUsage.length;

  const trend = useMemo(() => {
    if (dailyUsage.length < 2) return 'neutral';
    const recent = dailyUsage[dailyUsage.length - 1].totalKwh;
    const previous = dailyUsage[dailyUsage.length - 2].totalKwh;
    if (recent < previous * 0.95) return 'down';
    if (recent > previous * 1.05) return 'up';
    return 'neutral';
  }, [dailyUsage]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-warning' : trend === 'down' ? 'text-energy' : 'text-muted-foreground';

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Zap className="w-4 h-4 text-sensor-power" />
            Power Usage History
          </CardTitle>
          <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span className="font-medium">
              {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-muted p-3">
            <span className="data-label">7-Day Total</span>
            <div className="flex items-baseline gap-1">
              <span className="data-value text-xl">{totalKwh.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <span className="data-label">Daily Average</span>
            <div className="flex items-baseline gap-1">
              <span className="data-value text-xl">{avgKwh.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value.toFixed(2)} kWh`, 'Usage']}
              />
              <Bar 
                dataKey="kwh" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={index === chartData.length - 1 
                      ? 'hsl(var(--primary))' 
                      : 'hsl(var(--primary) / 0.4)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          Daily energy consumption in kilowatt-hours (kWh)
        </p>
      </CardContent>
    </Card>
  );
}
