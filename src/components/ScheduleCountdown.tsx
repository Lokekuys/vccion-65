import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { SmartPlug } from '@/types/device';
import { getScheduleStatus } from '@/lib/scheduleUtils';
import { getNextScheduleBoundary } from '@/lib/scheduleUtils';

interface ScheduleCountdownProps {
  device: SmartPlug;
}

export function ScheduleCountdown({ device }: ScheduleCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (device.controlMode !== 'scheduled') return null;

  const status = getScheduleStatus(device);
  const boundary = getNextScheduleBoundary(device);
  if (!boundary) return null;

  const diffMs = new Date(boundary).getTime() - now;
  if (diffMs <= 0) return null;

  const totalSec = Math.ceil(diffMs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const display = d > 0
    ? `${d}d ${h}h ${m.toString().padStart(2, '0')}m`
    : h > 0
      ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
      : m > 0
        ? `${m}m ${s.toString().padStart(2, '0')}s`
        : `${s}s`;
  const label = status === 'active' ? `Turns off in ${display}` : `Turns on in ${display}`;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium animate-fade-in">
      <Clock className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}
