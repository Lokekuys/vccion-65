import { useState, useEffect } from 'react';
import { Settings, ChevronRight, Wifi, WifiOff, AlertTriangle, Pencil, Hand, Calendar, Brain, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SmartPlug } from '@/types/device';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { StatusIndicator } from './StatusIndicator';
import { PowerIndicator } from './PowerIndicator';
import { computeConnectionStatus, formatLastSeen, STATUS_CONFIG } from '@/lib/deviceStatus';
import {
  OccupancyDisplay,
  LightLevelDisplay,
  OnDurationDisplay,
} from './SensorDisplay';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from './CountdownTimer';
import { ScheduleCountdown } from './ScheduleCountdown';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { getScheduleStatus, getScheduleLabel } from '@/lib/scheduleUtils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeviceCardProps {
  device: SmartPlug;
  onToggle: (deviceId: string) => void;
  onSelect: (device: SmartPlug) => void;
  countdownEndsAt?: number;
}

export function DeviceCard({ device, onToggle, onSelect, countdownEndsAt }: DeviceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState(device.name);
  const [editLocation, setEditLocation] = useState(device.location);
  const [showToggleWarning, setShowToggleWarning] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 5s to keep heartbeat status fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const connectionStatus = computeConnectionStatus(device.lastSeen);
  const statusConfig = STATUS_CONFIG[connectionStatus];
  const lastSeenText = formatLastSeen(device.lastSeen);
  const isDeviceOnline = connectionStatus === 'connected';
  const effectiveIsOn = isDeviceOnline ? device.isOn : false;

  const handleToggle = () => {
    if (connectionStatus === 'offline') {
      toast({ title: 'Device offline', description: 'Cannot control device while offline', variant: 'destructive' });
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
  console.log("Device Power:", device.name, powerData.currentWatts);
  const automationSettings = device.automationSettings ?? { occupancyControlEnabled: false };
  const override = device.override ?? { active: false, permanent: false };

  const scheduleStatus = getScheduleStatus(device);
  const scheduleLabel = getScheduleLabel(scheduleStatus);

  const handleOpenEditDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className={cn('device-card cursor-pointer animate-fade-in', connectionStatus === 'offline' && 'opacity-60')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(device)}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg transition-colors', effectiveIsOn ? 'bg-energy/10' : 'bg-muted')}>
              <PowerIndicator isOn={effectiveIsOn} size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-foreground">{device.name}</h3>
                <button onClick={handleOpenEditDialog} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
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
              <span className="text-[10px] text-muted-foreground font-mono">
                {lastSeenText}
              </span>
            )}
          </div>
        </div>

        {/* Control Mode Badge */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge className={cn('automation-badge', device.controlMode === 'smart' ? 'active' : device.controlMode === 'scheduled' ? 'active' : 'inactive')}>
            {device.controlMode === 'manual' && <><Hand className="w-3 h-3" /> Manual</>}
            {device.controlMode === 'scheduled' && <><Calendar className="w-3 h-3" /> Scheduled</>}
            {device.controlMode === 'smart' && <><Brain className="w-3 h-3" /> Smart</>}
          </Badge>

          {device.controlMode === 'scheduled' && scheduleLabel && (
            <Badge variant="outline" className={cn(
              'text-xs',
              scheduleStatus === 'active' ? 'text-energy border-energy/30' : 'text-muted-foreground border-muted-foreground/30'
            )}>
              {scheduleLabel}
            </Badge>
          )}
        </div>

        {/* Sensor Readings */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <OccupancyDisplay status={sensorData.occupancy} compact />
          <LightLevelDisplay lux={sensorData.lightLevel} compact />
        </div>

        {/* Live Wattage Reading */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
                <Zap className="w-4 h-4 text-sensor-power" />
                <span className="text-sm font-medium text-foreground">
                  {powerData.currentWatts.toFixed(1)} W
                </span>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Automatically read from the device (no manual input needed).</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <OnDurationDisplay turnedOnAt={device.turnedOnAt} isOn={effectiveIsOn} compact />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Shows the total runtime of the device. If the device is offline, the timer is paused until it reconnects.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {countdownEndsAt && <div className="mt-2"><CountdownTimer endsAt={countdownEndsAt} /></div>}
        <div className="mt-2"><ScheduleCountdown device={device} /></div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={effectiveIsOn}
              onCheckedChange={handleToggle}
              disabled={connectionStatus === 'offline'}
            />
            <span className="text-sm text-muted-foreground">{effectiveIsOn ? 'On' : 'Off'}</span>
          </div>

          <Button variant="ghost" size="sm" className={cn('transition-transform', isHovered && 'translate-x-1')}>
            <Settings className="w-4 h-4 mr-1" />
            Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>

      {/* Toggle Warning Dialog */}
      <AlertDialog open={showToggleWarning} onOpenChange={setShowToggleWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override {device.controlMode === 'smart' ? 'Smart' : 'Scheduled'} Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              {device.controlMode === 'smart'
                ? 'This device is currently in Smart Mode. Toggling it manually will override the occupancy automation. Do you want to continue?'
                : 'This device is currently in Scheduled Mode. Toggling it manually will switch it to Manual Mode. Do you want to continue?'}
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
              <Input
                id="device-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Device name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-location">Description</Label>
              <Input
                id="device-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Device location"
              />
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
