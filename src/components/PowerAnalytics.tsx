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
import { Zap, TrendingUp, Pencil, Check, X, AlertTriangle, Wallet, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DeviceEstimate {
  id: string;
  name: string;
  deviceType: string;
  ratedWatts: number;
  onHoursToday: number;
  dailyKwh: number;
  dailyCost: number;
  monthlyKwh: number;
  monthlyCost: number;
}

interface EstimatedAnalytics {
  perDevice: DeviceEstimate[];
  totalDailyKwh: number;
  totalDailyCost: number;
  totalMonthlyKwh: number;
  totalMonthlyCost: number;
  highest: DeviceEstimate | null;
  budgetStatus: 'ok' | 'nearing' | 'almost' | 'exceeded';
  budgetPercent: number;
  remainingBudget: number;
}

interface PowerAnalyticsProps {
  estimatedAnalytics: EstimatedAnalytics | null;
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
  estimatedAnalytics,
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

  const analytics = estimatedAnalytics;

  const chartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.perDevice
      .filter((d) => d.dailyKwh > 0)
      .sort((a, b) => b.dailyKwh - a.dailyKwh);
  }, [analytics]);

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
            Estimated Energy Analytics
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
          Values are <strong>estimated</strong> based on rated wattage × ON duration × VECO rate.
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

          {/* Daily Estimated Tab */}
          <TabsContent value="daily" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Est. Daily Energy</span>
                <div className="font-bold text-lg text-foreground">
                  {(analytics?.totalDailyKwh ?? 0).toFixed(3)}
                  <span className="text-xs text-muted-foreground ml-1">kWh</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Est. Daily Cost</span>
                <div className="font-bold text-lg text-foreground">
                  ₱{(analytics?.totalDailyCost ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Per-device chart */}
            {chartData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => `${v.toFixed(2)}`}
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
                      formatter={(value: number) => [`${value.toFixed(4)} kWh`, 'Est. Usage']}
                    />
                    <Bar dataKey="dailyKwh" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {analytics?.highest && analytics.highest.dailyKwh > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                <TrendingUp className="w-4 h-4 text-warning shrink-0" />
                <span className="text-foreground">
                  Highest consumer: <strong>{analytics.highest.name}</strong> ({analytics.highest.deviceType}) — est. {analytics.highest.dailyKwh.toFixed(3)} kWh today
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
                        <span className="text-muted-foreground">{d.deviceType} · {d.ratedWatts}W</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-foreground">{d.dailyKwh.toFixed(3)} kWh</div>
                        <div className="text-muted-foreground">₱{d.dailyCost.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Monthly Estimated Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Est. Monthly Energy</span>
                <div className="font-bold text-lg text-foreground">
                  {(analytics?.totalMonthlyKwh ?? 0).toFixed(1)}
                  <span className="text-xs text-muted-foreground ml-1">kWh</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <span className="data-label text-xs">Est. Monthly Cost</span>
                <div className="font-bold text-lg text-foreground">
                  ₱{(analytics?.totalMonthlyCost ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            {analytics && analytics.perDevice.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Monthly Per-Device Estimate</p>
                {analytics.perDevice
                  .sort((a, b) => b.monthlyCost - a.monthlyCost)
                  .map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-muted-foreground">{d.deviceType} · {d.ratedWatts}W</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-foreground">{d.monthlyKwh.toFixed(1)} kWh</div>
                        <div className="text-muted-foreground">₱{d.monthlyCost.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground italic">
              Monthly estimates are projected from today's usage patterns (daily × 30).
            </p>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4">
            {/* Set Budget */}
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
                {/* Budget Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Est. Monthly Cost</span>
                    <span className={`font-bold ${BUDGET_COLORS[analytics.budgetStatus]}`}>
                      ₱{analytics.totalMonthlyCost.toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(analytics.budgetPercent, 100)}
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{analytics.budgetPercent.toFixed(0)}% of budget</span>
                    <span>₱{monthlyBudget.toFixed(0)} limit</span>
                  </div>
                </div>

                {/* Status Badge */}
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

                {/* Remaining */}
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
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Set a monthly budget to track your estimated energy spending.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
