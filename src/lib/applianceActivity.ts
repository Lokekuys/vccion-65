// Shared utilities for appliance activity display.
// Real appliance activity is detected by firmware when power >= 2.5W
// (it ignores the ESP's own idle consumption around 1.0W to 1.9W).

export interface ApplianceActivityFields {
  applianceActiveNow?: boolean;
  lastApplianceActiveAt?: number; // ms epoch
  lastApplianceActiveReadable?: string;
}

/**
 * Format a timestamp into a relative time string.
 * Rules:
 *  - under 1 minute: "just now"
 *  - under 60 minutes: "X mins ago"
 *  - under 24 hours: "X hrs ago"
 *  - under 30 days: "X days ago"
 *  - under 12 months: "X months ago"
 *  - otherwise: "X years ago"
 */
export function formatRelativeTime(timestampMs?: number | null): string {
  if (!timestampMs || timestampMs <= 0) return 'Never';

  const now = Date.now();
  const diffMs = now - timestampMs;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Compute the appliance activity label text shown in the UI.
 * - "Active now" when applianceActiveNow is true
 * - "Last active: X mins ago" when a valid timestamp exists
 * - "Last active: Never" when no timestamp exists
 */
export function getApplianceActivityLabel(fields: ApplianceActivityFields): {
  isActive: boolean;
  label: string;
} {
  const isActive = fields.applianceActiveNow === true;
  if (isActive) return { isActive: true, label: 'Active now' };

  const ts = fields.lastApplianceActiveAt;
  if (!ts || ts <= 0) return { isActive: false, label: 'Last active: Never' };

  return { isActive: false, label: `Last active: ${formatRelativeTime(ts)}` };
}
