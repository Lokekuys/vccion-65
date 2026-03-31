import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  endsAt: number; // timestamp in ms
}

export function CountdownTimer({ endsAt }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (remaining <= 0) return null;

  const totalSec = Math.ceil(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const display = h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    : m > 0
      ? `${m}m ${s.toString().padStart(2, '0')}s`
      : `${s}s`;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-medium animate-fade-in">
      <Timer className="w-3 h-3" />
      <span>Auto-off in {display}</span>
    </div>
  );
}
