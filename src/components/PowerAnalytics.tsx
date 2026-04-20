import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Zap, TrendingUp, Pencil, Check, X, AlertTriangle, Wallet, Target, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AggregatedHistoryAnalytics, DeviceHistoryAnalytics } from '@/hooks/useAnalyticsLogs';
import { formatDuration } from '@/lib/analyticsAggregation';
import { formatRelativeTime } from '@/lib/applianceActivity';

interface PowerAnalyticsProps {
  historyAnalytics: AggregatedHistoryAnalytics | null;
  vecoRate: number;
  monthlyBudget: number;
  onVecoRateChange: (rate: number) => void;
  onMonthlyBudgetChange: (budget: number) => void;
  isAdmin?: boolean;
}

const BUDGET_COLORS: Record<string, string> = {
  ok: 'text-energy',
  nearing: 'text-warning',
  almost: 'text-destructive',
  exceeded: 'text-destructive',
};

const BUDGET_LABELS: Record<string, string> = {
  ok: 'On Track',
  nearing: 'Nearing Limit (80%)',
  almost: 'Almost at Limit (90%)',
  exceeded: 'Budget Exceeded!',
};

export function PowerAnalytics({
  historyAnalytics,
  vecoRate,
  monthlyBudget,
  onVecoRateChange,
  onMonthlyBudgetChange,
  isAdmin,
}: PowerAnalyticsProps) {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editRate, setEditRate] = useState(vecoRate.toString());
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudget, setEditBudget] = useState(monthlyBudget.toString());

  /**
   * Compute the row-level status label for a device in analytics.
   * Rules:
   *  - Offline → "Inactive" (+ "Last active Xm ago" if we have a timestamp)
   *  - Online + applianceActiveNow → "Active now"
   *  - Online + idle → "Inactive"
   * Never shows misleading "Active 0m" for offline devices.
   */
  const getDeviceStatus = (d: DeviceHistoryAnalytics): { primary: string; secondary?: string; tone: 'active' | 'idle' } => {
    if (!d.isOnline) {
      const last = d.lastApplianceActiveAt && d.lastApplianceActiveAt > 0
        ? `Last active ${formatRelativeTime(d.lastApplianceActiveAt)}`
        : undefined;
      return { primary: 'Inactive', secondary: last, tone: 'idle' };
    }
    if (d.applianceActiveNow) {
      return { primary: 'Active now', tone: 'active' };
    }
    return { primary: 'Inactive', tone: 'idle' };
  };

  const analytics = historyAnalytics;

  // Per-device chart data sorted by today's kWh
  const perDeviceChart = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.perDevice]
      .filter((d) => d.todayKwh > 0)
      .sort((a, b) => b.todayKwh - a.todayKwh);
  }, [analytics]);

  // 7-day combined trend (zero-filled for continuity)
  const weeklyChart = useMemo(() => {
    if (!analytics) return [];
    return analytics.combinedDailySeries.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: d.date,
      kwh: Number(d.kwh.toFixed(3)),
      cost: Number((d.kwh * vecoRate).toFixed(2)),
    }));
  }, [analytics, vecoRate]);

  const handleSaveRate = () => {
    const parsed = parseFloat(editRate);
    if (!isNaN(parsed) && parsed > 0) {
      onVecoRateChange(parsed);
      setIsEditingRate(false);
    }
  };

  const handleCancelEdit = () => {
    setEditRate(vecoRate.toString());
    setIsEditingRate(false);
  };

  const handleSaveBudget = () => {
    const parsed = parseFloat(editBudget);
    if (!isNaN(parsed) && parsed >= 0) {
      onMonthlyBudgetChange(parsed);
      setIsEditingBudget(false);
    }
  };

  const handleCancelBudget = () => {
    setEditBudget(monthlyBudget.toString());
    setIsEditingBudget(false);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Zap className="w-4 h-4 text-sensor-power" />
            Energy Analytics
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {isEditingRate ? (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">VECO:</span>
                <Input
                  type="number"
                  step="0.01"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-20 h-7 text-sm"
                  autoFocus
                />
                <span className="text-muted-foreground text-xs">₱/kWh</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRate}>
                  <Check className="w-3.5 h-3.5 text-energy" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
                  <X className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">VECO:</span>
                <span className="font-bold text-foreground">{vecoRate.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">₱/kWh</span>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditRate(vecoRate.toString()); setIsEditingRate(true); }}>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on <strong>recorded usage history</strong> (analyticsLogs). Persists when devices are off.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily" className="flex items-center gap-1 text-xs">
              <Zap className="w-3 h-3" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-1 text-xs">
              <Wallet className="w-3 h-3" />
              Budget
            </TabsTrigger>
          </TabsList>

          {/* Daily Tab */}
          <TabsContent value="daily" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Today's Energy</span>
                <div className="font-bold text-lg text-foreground">
                  {(analytics?.totalTodayKwh ?? 0).toFixed(3)}
                  <span className="text-xs text-muted-foreground ml-1">kWh</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Today's Cost</span>
                <div className="font-bold text-lg text-foreground">
                  ₱{(analytics?.totalTodayCost ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* 7-day trend chart — always rendered for continuity */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Last 7 Days
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 0.5]}
                      ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]}
                      allowDataOverflow
                      tickFormatter={(v) => `${Number(v).toFixed(1)} kWh`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number, name) =>
                        name === 'kwh'
                          ? [`${value.toFixed(3)} kWh`, 'Usage']
                          : [`₱${value.toFixed(2)}`, 'Cost']
                      }
                    />
                    <Bar dataKey="kwh" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {weeklyChart.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i === weeklyChart.length - 1
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--primary) / 0.4)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-device today */}
            {perDeviceChart.length > 0 && (
              <div className="h-44">
                <p className="text-xs font-medium text-muted-foreground mb-1">Today's Usage by Device</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perDeviceChart} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 0.5]}
                      ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]}
                      allowDataOverflow
                      tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number) => [`${value.toFixed(4)} kWh`, 'Today']}
                    />
                    <Bar dataKey="todayKwh" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {perDeviceChart.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {analytics?.highestToday && analytics.highestToday.todayKwh > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                <TrendingUp className="w-4 h-4 text-warning shrink-0" />
                <span className="text-foreground">
                  Highest today: <strong>{analytics.highestToday.name}</strong> — {analytics.highestToday.todayKwh.toFixed(3)} kWh
                </span>
              </div>
            )}

            {/* Per-device table */}
            {analytics && analytics.perDevice.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Per-Device Breakdown</p>
                <div className="space-y-1.5">
                  {analytics.perDevice.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-muted-foreground">
                          {d.deviceType} · Active {formatDuration(d.todayActiveSeconds)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-foreground">{d.todayKwh.toFixed(3)} kWh</div>
                        <div className="text-muted-foreground">₱{d.todayCost.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Month-to-Date Energy</span>
                <div className="font-bold text-lg text-foreground">
                  {(analytics?.totalMonthKwh ?? 0).toFixed(2)}
                  <span className="text-xs text-muted-foreground ml-1">kWh</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Month-to-Date Cost</span>
                <div className="font-bold text-lg text-foreground">
                  ₱{(analytics?.totalMonthCost ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Monthly per-device chart with fixed 0-15 kWh scale */}
            {analytics && analytics.perDevice.length > 0 && (
              <div className="h-44">
                <p className="text-xs font-medium text-muted-foreground mb-1">This Month by Device</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...analytics.perDevice].sort((a, b) => b.monthKwh - a.monthKwh)}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 15]}
                      ticks={[0, 3, 6, 9, 12, 15]}
                      allowDataOverflow
                      tickFormatter={(v) => `${v} kWh`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} kWh`, 'Month-to-date']}
                    />
                    <Bar dataKey="monthKwh" radius={[0, 4, 4, 0]} maxBarSize={20} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {analytics && analytics.perDevice.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Monthly Per-Device</p>
                {[...analytics.perDevice]
                  .sort((a, b) => b.monthCost - a.monthCost)
                  .map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-muted-foreground">{d.deviceType}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-foreground">{d.monthKwh.toFixed(2)} kWh</div>
                        <div className="text-muted-foreground">₱{d.monthCost.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground italic">
              Month-to-date totals are summed from recorded analyticsLogs.
            </p>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Monthly Budget</span>
                </div>
                {isEditingBudget ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">₱</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-24 h-7 text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveBudget}>
                      <Check className="w-3.5 h-3.5 text-energy" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelBudget}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">
                      {monthlyBudget > 0 ? `₱${monthlyBudget.toFixed(0)}` : 'Not set'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditBudget(monthlyBudget.toString());
                        setIsEditingBudget(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {monthlyBudget > 0 && analytics ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Month-to-Date Cost</span>
                    <span className={`font-bold ${BUDGET_COLORS[analytics.budgetStatus]}`}>
                      ₱{analytics.totalMonthCost.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={Math.min(analytics.budgetPercent, 100)} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{analytics.budgetPercent.toFixed(0)}% of budget</span>
                    <span>₱{monthlyBudget.toFixed(0)} limit</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {analytics.budgetStatus !== 'ok' && (
                    <AlertTriangle className={`w-4 h-4 ${BUDGET_COLORS[analytics.budgetStatus]}`} />
                  )}
                  <Badge
                    variant={analytics.budgetStatus === 'ok' ? 'default' : 'destructive'}
                    className={
                      analytics.budgetStatus === 'ok'
                        ? 'bg-energy/10 text-energy hover:bg-energy/20'
                        : analytics.budgetStatus === 'nearing'
                        ? 'bg-warning/10 text-warning hover:bg-warning/20'
                        : ''
                    }
                  >
                    {BUDGET_LABELS[analytics.budgetStatus]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <span className="data-label text-xs">Remaining Budget</span>
                    <div className="font-bold text-lg text-foreground">
                      ₱{analytics.remainingBudget.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <span className="data-label text-xs">Budget Used</span>
                    <div className="font-bold text-lg text-foreground">
                      {analytics.budgetPercent.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Per-device cost chart with fixed 0-100 PHP scale */}
                {analytics.perDevice.length > 0 && (
                  <div className="h-44">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Cost by Device (Month-to-date)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...analytics.perDevice].sort((a, b) => b.monthCost - a.monthCost)}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          allowDataOverflow
                          tickFormatter={(v) => `₱${v}`}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                            fontSize: '12px',
                            color: 'hsl(var(--foreground))',
                          }}
                          formatter={(value: number) => [`₱${value.toFixed(2)}`, 'Cost']}
                        />
                        <Bar dataKey="monthCost" radius={[0, 4, 4, 0]} maxBarSize={20} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Set a monthly budget to track your energy spending.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
