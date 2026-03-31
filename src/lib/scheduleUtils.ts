import { SmartPlug, DayOfWeek } from '@/types/device';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

export type ScheduleStatus = 'active' | 'outside-hours' | 'outside-days' | null;

export function getScheduleStatus(device: SmartPlug): ScheduleStatus {
  const schedule = device.override?.schedule;
  if (!schedule?.days?.length || !schedule?.startTime || !schedule?.endTime) return null;

  const now = new Date();
  const currentDay = DAY_MAP[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!schedule.days.includes(currentDay)) return 'outside-days';

  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'active';
  return 'outside-hours';
}

export function getScheduleLabel(status: ScheduleStatus): string | null {
  switch (status) {
    case 'active': return 'Scheduled – Active';
    case 'outside-hours': return 'Outside scheduled hours';
    case 'outside-days': return 'Outside scheduled days';
    default: return null;
  }
}

/** Returns ISO string of the next schedule boundary, accounting for scheduled days */
export function getNextScheduleBoundary(device: SmartPlug): string | null {
  const schedule = device.override?.schedule;
  if (!schedule?.startTime || !schedule?.endTime || !schedule?.days?.length) return null;

  const now = new Date();
  const currentDay = DAY_MAP[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // If today is a scheduled day and we're currently in the active window, next boundary is end time today
  if (schedule.days.includes(currentDay) && currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    const boundary = new Date(now);
    boundary.setHours(endH, endM, 0, 0);
    return boundary.toISOString();
  }

  // Find the next scheduled day's start time
  const ALL_DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = now.getDay();

  for (let offset = 0; offset <= 7; offset++) {
    const checkIndex = (todayIndex + offset) % 7;
    const checkDay = ALL_DAYS[checkIndex];

    if (!schedule.days.includes(checkDay)) continue;

    // For today, only valid if start time is still ahead
    if (offset === 0 && currentMinutes >= startMinutes) continue;

    const target = new Date(now);
    target.setDate(target.getDate() + offset);
    target.setHours(startH, startM, 0, 0);
    return target.toISOString();
  }

  return null;
}
