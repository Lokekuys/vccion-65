import { useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import {
  buildDailySeries,
  computeCost,
  currentMonthKey,
  groupByDay,
  groupByMonth,
  normalizeLogs,
  todayKey,
  type DailyAggregate,
  type MonthlyAggregate,
  type NormalizedLog,
  type RawAnalyticsLog,
} from "@/lib/analyticsAggregation";

export interface DeviceHistoryAnalytics {
  id: string;
  name: string;
  deviceType: string;
  todayKwh: number;
  todayCost: number;
  todayActiveSeconds: number;
  monthKwh: number;
  monthCost: number;
  totalKwh: number;
  totalCost: number;
  dailySeries: DailyAggregate[]; // last 7 days, zero-filled
  daily: Map<string, DailyAggregate>;
  monthly: Map<string, MonthlyAggregate>;
  logs: NormalizedLog[];
  /** Live device state passed through for UI-only labels */
  isOnline: boolean;
  applianceActiveNow: boolean;
  lastApplianceActiveAt: number;
}

export interface AggregatedHistoryAnalytics {
  perDevice: DeviceHistoryAnalytics[];
  totalTodayKwh: number;
  totalTodayCost: number;
  totalMonthKwh: number;
  totalMonthCost: number;
  highestToday: DeviceHistoryAnalytics | null;
  /** Last-7-day series summed across all devices, zero-filled for chart continuity */
  combinedDailySeries: DailyAggregate[];
  budgetStatus: "ok" | "nearing" | "almost" | "exceeded";
  budgetPercent: number;
  remainingBudget: number;
}

interface DeviceMeta {
  id: string;
  name: string;
  deviceType?: string;
  isOnline?: boolean;
  applianceActiveNow?: boolean;
  lastApplianceActiveAt?: number;
}

/**
 * Subscribes to /devices/{id}/analyticsLogs for each device and exposes
 * history-based aggregates. Persists across power-off (driven by stored logs).
 */
export function useAnalyticsLogs(
  deviceMeta: DeviceMeta[],
  vecoRate: number,
  monthlyBudget: number
): AggregatedHistoryAnalytics | null {
  const [logsByDevice, setLogsByDevice] = useState<Record<string, NormalizedLog[]>>({});

  // Stable key to avoid unnecessary re-subscriptions
  const idKey = useMemo(
    () => deviceMeta.map((d) => d.id).sort().join("|"),
    [deviceMeta]
  );

  useEffect(() => {
    if (deviceMeta.length === 0) {
      setLogsByDevice({});
      return;
    }

    const unsubs = deviceMeta.map((device) => {
      const r = ref(rtdb, `devices/${device.id}/analyticsLogs`);
      return onValue(r, (snap) => {
        const raw = snap.exists() ? (snap.val() as Record<string, RawAnalyticsLog>) : null;
        const normalized = normalizeLogs(raw);
        setLogsByDevice((prev) => {
          // Only update if changed (cheap length+last-ts check)
          const existing = prev[device.id];
          if (
            existing &&
            existing.length === normalized.length &&
            existing[existing.length - 1]?.timestampMs ===
              normalized[normalized.length - 1]?.timestampMs
          ) {
            return prev;
          }
          return { ...prev, [device.id]: normalized };
        });
      });
    });

    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  return useMemo(() => {
    if (deviceMeta.length === 0) return null;

    const today = todayKey();
    const month = currentMonthKey();

    const perDevice: DeviceHistoryAnalytics[] = deviceMeta.map((meta) => {
      const logs = logsByDevice[meta.id] ?? [];
      const daily = groupByDay(logs);
      const monthly = groupByMonth(logs);

      const todayAgg = daily.get(today);
      const monthAgg = monthly.get(month);
      const totalKwh = logs.reduce((s, l) => s + l.kwh, 0);

      return {
        id: meta.id,
        name: meta.name,
        deviceType: meta.deviceType ?? meta.name,
        todayKwh: todayAgg?.kwh ?? 0,
        todayCost: computeCost(todayAgg?.kwh ?? 0, vecoRate),
        todayActiveSeconds: todayAgg?.activeSeconds ?? 0,
        monthKwh: monthAgg?.kwh ?? 0,
        monthCost: computeCost(monthAgg?.kwh ?? 0, vecoRate),
        totalKwh,
        totalCost: computeCost(totalKwh, vecoRate),
        dailySeries: buildDailySeries(daily, 7),
        daily,
        monthly,
        logs,
      };
    });

    const totalTodayKwh = perDevice.reduce((s, d) => s + d.todayKwh, 0);
    const totalMonthKwh = perDevice.reduce((s, d) => s + d.monthKwh, 0);
    const totalTodayCost = computeCost(totalTodayKwh, vecoRate);
    const totalMonthCost = computeCost(totalMonthKwh, vecoRate);

    const highestToday =
      perDevice.length > 0
        ? perDevice.reduce((max, d) => (d.todayKwh > max.todayKwh ? d : max), perDevice[0])
        : null;

    // Combined 7-day series (sum across devices per date)
    const combinedMap = new Map<string, DailyAggregate>();
    for (const d of perDevice) {
      for (const day of d.dailySeries) {
        const cur = combinedMap.get(day.date) ?? {
          date: day.date,
          kwh: 0,
          activeSeconds: 0,
          sampleCount: 0,
        };
        cur.kwh += day.kwh;
        cur.activeSeconds += day.activeSeconds;
        cur.sampleCount += day.sampleCount;
        combinedMap.set(day.date, cur);
      }
    }
    const combinedDailySeries = Array.from(combinedMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let budgetStatus: AggregatedHistoryAnalytics["budgetStatus"] = "ok";
    let budgetPercent = 0;
    if (monthlyBudget > 0) {
      budgetPercent = (totalMonthCost / monthlyBudget) * 100;
      if (budgetPercent >= 100) budgetStatus = "exceeded";
      else if (budgetPercent >= 90) budgetStatus = "almost";
      else if (budgetPercent >= 80) budgetStatus = "nearing";
    }

    return {
      perDevice,
      totalTodayKwh,
      totalTodayCost,
      totalMonthKwh,
      totalMonthCost,
      highestToday,
      combinedDailySeries,
      budgetStatus,
      budgetPercent,
      remainingBudget: monthlyBudget > 0 ? Math.max(0, monthlyBudget - totalMonthCost) : 0,
    };
  }, [deviceMeta, logsByDevice, vecoRate, monthlyBudget]);
}
