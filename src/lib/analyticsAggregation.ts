// ===========================================================================
// History-based analytics aggregation
// Source of truth: /devices/{deviceId}/analyticsLogs in Firebase RTDB
// Live PZEM (pzemTest) is NEVER used here — only for current status display.
// ===========================================================================

/** Threshold for what counts as real consumption.
 *  - 0W              → idle
 *  - 0.1 – 0.9W      → noise (ignore)
 *  - 1.0W and above  → valid (standby OR active)
 */
export const MIN_VALID_WATTS = 1.0;

export interface RawAnalyticsLog {
  /** ms epoch (some firmware writes seconds — we normalize) */
  timestamp?: number;
  ts?: number;
  time?: number;
  /** Watts at sample time */
  power?: number;
  watts?: number;
  /** kWh delta for this sample window (preferred when available) */
  energy?: number;
  energyUsed?: number;
  kwh?: number;
  /** Active duration of this sample window in seconds (optional) */
  duration?: number;
  durationSeconds?: number;
  /** Some firmware also stores end timestamp */
  endTimestamp?: number;
}

export interface NormalizedLog {
  timestampMs: number;
  watts: number;
  /** kWh consumed in this sample (computed if not provided) */
  kwh: number;
  /** Duration in seconds covered by this sample */
  durationSec: number;
}

export interface DailyAggregate {
  date: string;       // YYYY-MM-DD
  kwh: number;
  activeSeconds: number;
  sampleCount: number;
}

export interface MonthlyAggregate {
  month: string;      // YYYY-MM
  kwh: number;
  activeSeconds: number;
  sampleCount: number;
}

/* ------------------------- normalization ------------------------- */

const toMs = (n: number | undefined): number => {
  if (!n || !Number.isFinite(n)) return 0;
  // Heuristic: < 10^12 → seconds, else ms
  return n < 1e12 ? n * 1000 : n;
};

const pickWatts = (log: RawAnalyticsLog): number => {
  const w = log.power ?? log.watts ?? 0;
  return Number.isFinite(w) ? w : 0;
};

const pickKwh = (log: RawAnalyticsLog): number | null => {
  const k = log.energy ?? log.energyUsed ?? log.kwh;
  if (k === undefined || k === null || !Number.isFinite(k)) return null;
  return k;
};

const pickDurationSec = (log: RawAnalyticsLog): number | null => {
  const d = log.duration ?? log.durationSeconds;
  if (d !== undefined && Number.isFinite(d)) return d;
  if (log.timestamp && log.endTimestamp) {
    return Math.max(0, (toMs(log.endTimestamp) - toMs(log.timestamp)) / 1000);
  }
  return null;
};

/**
 * Convert a raw log map (from Firebase) into normalized, time-sorted samples.
 * Handles both list and keyed-object shapes.
 */
export function normalizeLogs(
  raw: Record<string, RawAnalyticsLog> | RawAnalyticsLog[] | null | undefined
): NormalizedLog[] {
  if (!raw) return [];

  const list: RawAnalyticsLog[] = Array.isArray(raw)
    ? raw.filter(Boolean)
    : Object.values(raw).filter(Boolean);

  // Sort ascending by timestamp first (needed to compute window durations)
  const withTs = list
    .map((log) => ({
      log,
      ts: toMs(log.timestamp ?? log.ts ?? log.time),
    }))
    .filter((x) => x.ts > 0)
    .sort((a, b) => a.ts - b.ts);

  const out: NormalizedLog[] = [];

  for (let i = 0; i < withTs.length; i++) {
    const { log, ts } = withTs[i];
    const watts = pickWatts(log);

    // Skip noise (< 1.0W)
    if (watts < MIN_VALID_WATTS) continue;

    // Determine duration of this sample window.
    let durationSec = pickDurationSec(log);
    if (durationSec === null) {
      // Use gap to next sample (capped at 5 minutes to avoid wild gaps inflating totals)
      const next = withTs[i + 1]?.ts;
      if (next && next > ts) {
        durationSec = Math.min((next - ts) / 1000, 300);
      } else {
        // Last sample — assume 60s window
        durationSec = 60;
      }
    }

    // Compute kWh: prefer firmware-provided value, else derive from W × h
    let kwh = pickKwh(log);
    if (kwh === null) {
      kwh = (watts / 1000) * (durationSec / 3600);
    }

    out.push({
      timestampMs: ts,
      watts,
      kwh: Math.max(0, kwh),
      durationSec: Math.max(0, durationSec),
    });
  }

  return out;
}

/* ------------------------- grouping ------------------------- */

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtMonth = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function groupByDay(logs: NormalizedLog[]): Map<string, DailyAggregate> {
  const map = new Map<string, DailyAggregate>();
  for (const log of logs) {
    const key = fmtDate(new Date(log.timestampMs));
    const cur = map.get(key) ?? { date: key, kwh: 0, activeSeconds: 0, sampleCount: 0 };
    cur.kwh += log.kwh;
    cur.activeSeconds += log.durationSec;
    cur.sampleCount += 1;
    map.set(key, cur);
  }
  return map;
}

export function groupByMonth(logs: NormalizedLog[]): Map<string, MonthlyAggregate> {
  const map = new Map<string, MonthlyAggregate>();
  for (const log of logs) {
    const key = fmtMonth(new Date(log.timestampMs));
    const cur = map.get(key) ?? { month: key, kwh: 0, activeSeconds: 0, sampleCount: 0 };
    cur.kwh += log.kwh;
    cur.activeSeconds += log.durationSec;
    cur.sampleCount += 1;
    map.set(key, cur);
  }
  return map;
}

/* ------------------------- helpers ------------------------- */

export const computeCost = (kwh: number, ratePerKwh: number) => kwh * ratePerKwh;

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 1) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Build a continuous N-day series ending today (zero-fills missing days for the chart only). */
export function buildDailySeries(
  dailyMap: Map<string, DailyAggregate>,
  days: number
): DailyAggregate[] {
  const out: DailyAggregate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = fmtDate(d);
    out.push(dailyMap.get(key) ?? { date: key, kwh: 0, activeSeconds: 0, sampleCount: 0 });
  }
  return out;
}

export const todayKey = () => fmtDate(new Date());
export const currentMonthKey = () => fmtMonth(new Date());
