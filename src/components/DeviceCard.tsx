import { useState, useEffect } from 'react';
import {
  Settings, ChevronRight, Wifi, WifiOff, AlertTriangle,
  Pencil, Hand, Calendar, Brain, Zap, Lock
} from 'lucide-react';

// UI Components & Hooks
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

// Firebase & Libs
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { computeConnectionStatus, formatLastSeen, STATUS_CONFIG } from '@/lib/deviceStatus';
import { getScheduleStatus, getScheduleLabel } from '@/lib/scheduleUtils';

// Types & Custom Components
import { SmartPlug } from '@/types/device';
import { StatusIndicator } from './StatusIndicator';
import { OccupancyDisplay, LightLevelDisplay, ApplianceActivityDisplay } from './SensorDisplay';
import { CountdownTimer } from './CountdownTimer';
import { ScheduleCountdown } from './ScheduleCountdown';

interface DeviceCardProps {
  device: SmartPlug;
  onToggle: (deviceId: string) => void;
  onSelect: (device: SmartPlug) => void;
  countdownEndsAt?: number;
  isSensorBoxOnline?: boolean;
}

export function DeviceCard({
  device,
  onToggle,
  onSelect,
  countdownEndsAt,
  isSensorBoxOnline = true
}: DeviceCardProps) {
  const { isAdmin } = useAdmin();

  const [isHovered, setIsHovered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState(device.name);
  const [editLocation, setEditLocation] = useState(device.location);
  const [showToggleWarning, setShowToggleWarning] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const connectionStatus = computeConnectionStatus(device.lastSeen);
  const statusConfig = STATUS_CONFIG[connectionStatus];
  const lastSeenText = formatLastSeen(device.lastSeen);
  const isDeviceOnline = connectionStatus === 'connected';
  const effectiveIsOn = isDeviceOnline ? device.isOn : false;

  const isUserLockedOut = device.isLocked && !isAdmin;

  const handleToggle = () => {
    if (isUserLockedOut) return;

    if (connectionStatus === 'offline') {
      toast.error('Cannot control device while offline');
      return;
    }

    if (device.controlMode === 'smart' || device.controlMode === 'scheduled') {
      setShowToggleWarning(true);
    } else {
      onToggle(device.id);
    }
  };

  const sensorData = device.sensorData ?? { occupancy: 'vacant', lightLevel: 0 };
  const powerData = device.powerData ?? { currentWatts: 0, isAbnormal: false };
  const scheduleStatus = getScheduleStatus(device);
  const scheduleLabel = getScheduleLabel(scheduleStatus);

  const handleOpenEditDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUserLockedOut) return;
    setEditName(device.name);
    setEditLocation(device.location);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    const updates: Record<string, string> = {};
    if (editName.trim() && editName !== device.name) updates.name = editName.trim();
    if (editLocation.trim() && editLocation !== device.location) updates.location = editLocation.trim();

    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb, `devices/${device.id}`), updates);
    }
    setShowEditDialog(false);
  };

  return (
    <Card
      className={cn(
        'device-card cursor-pointer animate-fade-in relative overflow-hidden transition-all duration-300',
        !isDeviceOnline && 'opacity-60 saturate-75 shadow-none',
        isUserLockedOut && 'opacity-90'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (isUserLockedOut) {
          toast.error('🔒 Locked by Admin: You do not have permission to configure this device.');
          return;
        }
        onSelect(device);
      }}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all duration-300',
                  effectiveIsOn
                    ? 'bg-green-500 ring-[5px] ring-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                    : 'bg-red-500 ring-[5px] ring-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                )}
              />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-foreground">{device.name}</h3>

                {device.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="w-3 h-3 text-destructive ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Locked by Admin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {!isUserLockedOut && (
                  <button onClick={handleOpenEditDialog} className="text-muted-foreground hover:text-foreground ml-1">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{device.location}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-energy" />}
              {connectionStatus === 'idle' && <AlertTriangle className="w-4 h-4 text-warning" />}
              {connectionStatus === 'offline' && <WifiOff className="w-4 h-4 text-muted-foreground" />}
              <StatusIndicator
                status={statusConfig.indicatorStatus}
                label={statusConfig.label}
                size="sm"
                pulse={connectionStatus === 'connected'}
              />
            </div>
            {connectionStatus !== 'connected' && connectionStatus !== 'offline' && lastSeenText && (
              <span className="text-[10px] text-muted-foreground font-mono">{lastSeenText}</span>
            )}
          </div>
        </div>

        {/* Control Mode Badge */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge
            className={cn(
              'automation-badge',
              (device.controlMode === 'smart' || device.controlMode === 'scheduled') ? 'active' : 'inactive'
            )}
          >
            {device.controlMode === 'manual' && <><Hand className="w-3 h-3" /> Manual</>}
            {device.controlMode === 'scheduled' && <><Calendar className="w-3 h-3" /> Scheduled</>}
            {device.controlMode === 'smart' && <><Brain className="w-3 h-3" /> Smart</>}
          </Badge>

          {device.controlMode === 'scheduled' && scheduleLabel && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                scheduleStatus === 'active'
                  ? 'text-energy border-energy/30'
                  : 'text-muted-foreground border-muted-foreground/30'
              )}
            >
              {scheduleLabel}
            </Badge>
          )}
        </div>

        {/* Sensor Readings */}
        <div className="relative mb-4">
          <div
            className={cn(
              'grid grid-cols-2 gap-2 transition-opacity',
              !isSensorBoxOnline && 'opacity-40 blur-[1px] pointer-events-none select-none'
            )}
          >
            <OccupancyDisplay status={sensorData.occupancy} compact />
            <LightLevelDisplay lux={sensorData.lightLevel} compact />
          </div>

          {!isSensorBoxOnline && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-4 py-1.5 rounded-md bg-card/95 border border-red-500/30 shadow-sm text-[11px] font-medium text-red-500">
                Sensor Box Disconnected
              </div>
            </div>
          )}
        </div>

        {/* Live Wattage Reading */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
                <Zap className="w-4 h-4 text-sensor-power" />
                <span className="text-sm font-medium text-foreground">
                  {(connectionStatus === 'offline' ? 0 : powerData.currentWatts).toFixed(1)} W
                </span>
                <span className="text-xs text-muted-foreground">
                  {connectionStatus === 'offline' ? 'Offline' : 'Live'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {connectionStatus === 'offline'
                  ? 'Live readings paused while the plug is offline.'
                  : 'Automatically read from the device.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ApplianceActivityDisplay
                  applianceActiveNow={connectionStatus === 'offline' ? false : device.applianceActiveNow}
                  lastApplianceActiveAt={device.lastApplianceActiveAt}
                  lastApplianceActiveReadable={device.lastApplianceActiveReadable}
                  forceInactive={connectionStatus === 'offline'}
                  compact
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Detected when the appliance is plugged in and drawing power.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {countdownEndsAt && (
          <div className="mt-2">
            <CountdownTimer endsAt={countdownEndsAt} />
          </div>
        )}

        <div className="mt-2">
          <ScheduleCountdown device={device} />
        </div>

        {/* Footer Controls */}
        <div className="relative flex items-center justify-between mt-4 pt-4 border-t">
          {isUserLockedOut && (
            <div
              className="absolute inset-0 z-10 cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                toast.error('🔒 Locked by Admin: You do not have permission to control this device.');
              }}
            />
          )}

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={effectiveIsOn}
              onCheckedChange={handleToggle}
              disabled={connectionStatus === 'offline' || isUserLockedOut}
            />
            <span className="text-sm text-muted-foreground">{effectiveIsOn ? 'On' : 'Off'}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn('transition-transform', isHovered && !isUserLockedOut && 'translate-x-1')}
            disabled={isUserLockedOut}
          >
            <Settings className="w-4 h-4 mr-1" /> Details <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>

      {/* Toggle Warning Dialog */}
      <AlertDialog open={showToggleWarning} onOpenChange={setShowToggleWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Override {device.controlMode === 'smart' ? 'Smart' : 'Scheduled'} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {device.controlMode === 'smart'
                ? 'This device is in Smart Mode. Manual toggle will override occupancy automation. Continue?'
                : 'This device is in Scheduled Mode. Manual toggle will switch it to Manual Mode. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onToggle(device.id)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update the name and location of your device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="device-name">Name</Label>
              <Input id="device-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-location">Description</Label>
              <Input id="device-location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}