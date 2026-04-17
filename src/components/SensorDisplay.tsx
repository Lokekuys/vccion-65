import { useState, useEffect } from 'react';
import { User, Sun, Zap, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OccupancyStatus } from '@/types/device';
import { getApplianceActivityLabel, formatRelativeTime, type ApplianceActivityFields } from '@/lib/applianceActivity';

interface OccupancyDisplayProps {
  status: OccupancyStatus;
  compact?: boolean;
}

export function OccupancyDisplay({ status, compact = false }: OccupancyDisplayProps) {
  const isOccupied = status === 'occupied';
  
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg transition-colors',
      compact ? 'p-2' : 'p-3',
      isOccupied ? 'bg-occupied/10' : 'bg-muted'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full p-1.5',
        isOccupied ? 'bg-occupied text-occupied-foreground' : 'bg-vacant text-vacant-foreground'
      )}>
        <User className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <div className="flex flex-col">
        <span className="data-label">Occupancy</span>
        <span className={cn(
          'font-medium capitalize',
          compact ? 'text-sm' : 'text-base',
          isOccupied ? 'text-occupied' : 'text-muted-foreground'
        )}>
          {status}
        </span>
      </div>
    </div>
  );
}

interface LightLevelDisplayProps {
  lux: number;
  compact?: boolean;
}

export function LightLevelDisplay({ lux, compact = false }: LightLevelDisplayProps) {
  const intensity = lux < 200 ? 'low' : lux < 500 ? 'medium' : 'high';
  
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg bg-muted transition-colors',
      compact ? 'p-2' : 'p-3'
    )}>
      <div className="flex items-center justify-center rounded-full p-1.5 bg-sensor-light/20 text-sensor-light">
        <Sun className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <div className="flex flex-col">
        <span className="data-label">Light Level</span>
        <div className="flex items-baseline gap-1">
          <span className={cn('font-mono font-semibold', compact ? 'text-sm' : 'text-base')}>
            {lux % 1 === 0 ? lux : lux.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">lux</span>
          <span className={cn(
            'ml-1 text-xs capitalize',
            intensity === 'low' ? 'text-warning' : intensity === 'medium' ? 'text-muted-foreground' : 'text-sensor-light'
          )}>
            ({intensity})
          </span>
        </div>
      </div>
    </div>
  );
}

interface PowerDisplayProps {
  watts: number;
  isAbnormal?: boolean;
  compact?: boolean;
}

export function PowerDisplay({ watts, isAbnormal = false, compact = false }: PowerDisplayProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg transition-colors',
      compact ? 'p-2' : 'p-3',
      isAbnormal ? 'bg-warning/10' : 'bg-muted'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full p-1.5',
        isAbnormal ? 'bg-warning/20 text-warning' : 'bg-sensor-power/20 text-sensor-power'
      )}>
        {isAbnormal ? (
          <AlertTriangle className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        ) : (
          <Zap className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )}
      </div>
      <div className="flex flex-col">
        <span className="data-label">Power Usage</span>
        <div className="flex items-baseline gap-1">
          <span className={cn(
            'font-mono font-semibold',
            compact ? 'text-sm' : 'text-base',
            isAbnormal && 'text-warning'
          )}>
            {watts.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">W</span>
          {isAbnormal && (
            <span className="ml-1 text-xs text-warning font-medium">Abnormal</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface OnDurationDisplayProps {
  turnedOnAt?: string;
  isOn: boolean;
  compact?: boolean;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function OnDurationDisplay({ turnedOnAt, isOn, compact = false }: OnDurationDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOn || !turnedOnAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(turnedOnAt).getTime();
    const tick = () => setElapsed(Math.max(0, Date.now() - start));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOn, turnedOnAt]);

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg transition-colors',
      compact ? 'p-2' : 'p-3',
      isOn ? 'bg-energy/10' : 'bg-muted'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full p-1.5',
        isOn ? 'bg-energy/20 text-energy' : 'bg-muted-foreground/20 text-muted-foreground'
      )}>
        <Clock className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <div className="flex flex-col">
        <span className="data-label">On Duration</span>
        <span className={cn(
          'font-mono font-semibold',
          compact ? 'text-sm' : 'text-base',
          isOn ? 'text-energy' : 'text-muted-foreground'
        )}>
          {isOn && turnedOnAt ? formatDuration(elapsed) : 'Off'}
        </span>
      </div>
    </div>
  );
}
