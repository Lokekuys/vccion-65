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

interface ApplianceActivityDisplayProps extends ApplianceActivityFields {
  compact?: boolean;
  /**
   * When true, the display reports the appliance as INACTIVE regardless of
   * applianceActiveNow. This is used to reflect a stale/offline plug
   * without mutating any persisted Firebase data.
   * The historical "Last active X ago" timestamp is still shown.
   */
  forceInactive?: boolean;
}

/**
 * Shows appliance usage status using firmware-provided fields.
 * Auto-refreshes every 30s so relative time strings stay current.
 */
export function ApplianceActivityDisplay({
  applianceActiveNow,
  lastApplianceActiveAt,
  lastApplianceActiveReadable,
  compact = false,
  forceInactive = false,
}: ApplianceActivityDisplayProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const computed = getApplianceActivityLabel({
    applianceActiveNow: forceInactive ? false : applianceActiveNow,
    lastApplianceActiveAt,
    lastApplianceActiveReadable,
  });

  // When forced inactive (e.g. plug offline) override the primary label to
  // "Inactive" but keep the historical "Last active X ago" as secondary text.
  const isActive = computed.isActive;
  const primaryLabel = forceInactive ? 'Inactive' : computed.label;
  const secondaryLabel =
    forceInactive && lastApplianceActiveAt && lastApplianceActiveAt > 0
      ? computed.label.replace(/^Last active:\s*/, 'Last active ')
      : null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg transition-colors',
        compact ? 'p-2' : 'p-3',
        isActive ? 'bg-energy/10' : 'bg-muted'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full p-1.5',
          isActive ? 'bg-energy/20 text-energy' : 'bg-muted-foreground/20 text-muted-foreground'
        )}
      >
        <Activity className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="data-label">Appliance Usage</span>
        <span
          className={cn(
            'font-medium truncate',
            compact ? 'text-sm' : 'text-base',
            isActive ? 'text-energy' : 'text-muted-foreground'
          )}
        >
          {primaryLabel}
        </span>
        {secondaryLabel && (
          <span className="text-[11px] text-muted-foreground truncate">
            {secondaryLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Backwards-compat re-export so existing imports keep working.
// (Old OnDurationDisplay has been replaced by ApplianceActivityDisplay.)
export { formatRelativeTime };

