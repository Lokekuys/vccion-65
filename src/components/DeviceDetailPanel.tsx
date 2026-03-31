import React from "react";
import {
  Power,
  Clock,
  Trash2,
  Hand,
  Calendar,
  Brain,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeConnectionStatus, formatLastSeen, STATUS_CONFIG } from "@/lib/deviceStatus";
import { SmartPlug, AutomationSettings, ScheduleEntry, ControlMode } from "@/types/device";
import { Button } from "@/components/ui/button";
import { ScheduleEditor } from "./ScheduleEditor";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusIndicator } from "./StatusIndicator";
import { PowerIndicator } from "./PowerIndicator";
import { Badge } from "@/components/ui/badge";
import {
  OccupancyDisplay,
  LightLevelDisplay,
  OnDurationDisplay,
} from "./SensorDisplay";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getScheduleStatus, getScheduleLabel } from "@/lib/scheduleUtils";

interface DeviceDetailPanelProps {
  device: SmartPlug | null;
  isOpen: boolean;
  onClose: () => void;
  onToggle: (deviceId: string) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onAutomationChange: (
    deviceId: string,
    settings: Partial<AutomationSettings>
  ) => void;
  onOverride: (deviceId: string, active: boolean, permanent: boolean) => void;
  onRemove: (deviceId: string) => void;
  onScheduleChange: (deviceId: string, schedule: ScheduleEntry) => void;
  onControlModeChange: (deviceId: string, mode: ControlMode) => void;
}

const CONTROL_MODES: { value: ControlMode; label: string; icon: typeof Hand; description: string }[] = [
  { value: 'manual', label: 'Manual', icon: Hand, description: 'Direct ON/OFF control' },
  { value: 'scheduled', label: 'Scheduled', icon: Calendar, description: 'Follow time schedule' },
  { value: 'smart', label: 'Smart', icon: Brain, description: 'Occupancy automation' },
];

export function DeviceDetailPanel({
  device,
  isOpen,
  onClose,
  onToggle,
  onBrightnessChange,
  onAutomationChange,
  onOverride,
  onRemove,
  onScheduleChange,
  onControlModeChange,
}: DeviceDetailPanelProps) {
  const [showToggleWarning, setShowToggleWarning] = React.useState(false);

  if (!device) return null;

  const connectionStatus = computeConnectionStatus(device.lastSeen);
  const statusConfig = STATUS_CONFIG[connectionStatus];
  const lastSeenText = formatLastSeen(device.lastSeen);
  const isOffline = connectionStatus === 'offline';

  const sensorData = device.sensorData ?? { occupancy: "vacant", lightLevel: 0 };
  const powerData = device.powerData ?? { currentWatts: 0, todayKwh: 0, isAbnormal: false };
  const automationSettings = device.automationSettings ?? {
    occupancyControlEnabled: false,
    autoOffDelaySeconds: 300,
    adaptiveLightingEnabled: false,
  };
  const controlMode = device.controlMode ?? 'manual';

  const totalSeconds = automationSettings.autoOffDelaySeconds ?? 300;
  const autoOffHours = Math.floor(totalSeconds / 3600);
  const autoOffMinutes = Math.floor((totalSeconds % 3600) / 60);
  const autoOffSeconds = totalSeconds % 60;

  const scheduleStatus = getScheduleStatus(device);
  const scheduleLabel = getScheduleLabel(scheduleStatus);

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    const clampedHours = Math.max(0, Math.min(23, hours));
    const clampedMinutes = Math.max(0, Math.min(59, minutes));
    const clampedSeconds = Math.max(0, Math.min(59, seconds));
    const totalSecs = clampedHours * 3600 + clampedMinutes * 60 + clampedSeconds;
    onAutomationChange(device.id, { autoOffDelaySeconds: Math.max(1, totalSecs) });
  };

  const handleRemove = () => {
    onRemove(device.id);
    onClose();
  };

  const handleToggle = () => {
    if (device.controlMode === 'smart' || device.controlMode === 'scheduled') {
      setShowToggleWarning(true);
    } else {
      onToggle(device.id);
    }
  };


  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl", device.isOn ? "bg-energy/10" : "bg-muted")}>
                <PowerIndicator isOn={device.isOn} size="lg" />
              </div>
              <div>
                <SheetTitle className="text-left">{device.name}</SheetTitle>
                <SheetDescription className="text-left">{device.location}</SheetDescription>
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
              {connectionStatus !== 'connected' && (
                <span className="text-[10px] text-muted-foreground font-mono">{lastSeenText}</span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Offline Banner */}
          {isOffline && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Device is offline — controls disabled</span>
            </div>
          )}

          {/* Power Control */}
          <div className={cn("flex items-center justify-between p-4 rounded-xl bg-muted", isOffline && "opacity-50")}>
            <div className="flex items-center gap-3">
              <Power className="w-5 h-5 text-primary" />
              <div>
                <Label className="text-base font-medium">Power</Label>
                <p className="text-sm text-muted-foreground">
                  {device.isOn ? "Device is on" : "Device is off"}
                </p>
              </div>
            </div>
            <Switch
              checked={device.isOn}
              onCheckedChange={handleToggle}
              disabled={isOffline}
            />
          </div>

          <Separator />

          {/* Control Mode Selector */}
          <div className={cn("space-y-3", isOffline && "opacity-50 pointer-events-none")}>
            <Label className="font-medium">Control Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {CONTROL_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = controlMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => onControlModeChange(device.id, mode.value)}
                    disabled={isOffline}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                      isOffline && "cursor-not-allowed"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{mode.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {CONTROL_MODES.find((m) => m.value === controlMode)?.description}
            </p>
          </div>

          {/* Schedule Editor (shown in scheduled mode) */}
          {controlMode === 'scheduled' && (
            <ScheduleEditor
              schedule={device.override?.schedule}
              onChange={(schedule) => onScheduleChange(device.id, schedule)}
              scheduleStatus={scheduleStatus}
              statusLabel={scheduleLabel}
            />
          )}

          {/* Smart Mode Settings (shown in smart mode) */}
          {controlMode === 'smart' && (
            <div className={cn("space-y-4", isOffline && "opacity-50 pointer-events-none")}>
              <Label className="font-medium">Occupancy Automation</Label>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <Label>Auto-Off on Vacancy</Label>
                <Switch
                  checked={automationSettings.occupancyControlEnabled}
                  onCheckedChange={(checked) => onAutomationChange(device.id, { occupancyControlEnabled: checked })}
                  disabled={isOffline}
                />
              </div>

              {automationSettings.occupancyControlEnabled && (
                <div className="space-y-3 p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label>Auto-Off Delay</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={autoOffHours}
                        onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, autoOffMinutes, autoOffSeconds)}
                        className="w-16 text-center font-mono"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                    <span className="text-muted-foreground font-bold">:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={autoOffMinutes}
                        onChange={(e) => handleTimeChange(autoOffHours, parseInt(e.target.value) || 0, autoOffSeconds)}
                        className="w-16 text-center font-mono"
                      />
                      <span className="text-sm text-muted-foreground">m</span>
                    </div>
                    <span className="text-muted-foreground font-bold">:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={autoOffSeconds}
                        onChange={(e) => handleTimeChange(autoOffHours, autoOffMinutes, parseInt(e.target.value) || 0)}
                        className="w-16 text-center font-mono"
                      />
                      <span className="text-sm text-muted-foreground">s</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Device turns off after {autoOffHours > 0 ? `${autoOffHours}h ` : ""}{autoOffMinutes > 0 ? `${autoOffMinutes}m ` : ""}{autoOffSeconds}s of vacancy
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Brightness - always shown, visually dimmed when off */}
          {device.classification?.pwmCompatible && (
            <>
              <Separator />
              <div className={cn("space-y-3 p-4 rounded-xl border", (!device.isOn || isOffline) && "opacity-60")}>
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Brightness</Label>
                  <span className="text-sm font-mono text-muted-foreground">{device.brightness ?? 0}%</span>
                </div>
                <Slider
                  value={[device.brightness ?? 0]}
                  onValueChange={([value]) => onBrightnessChange(device.id, value)}
                  max={100}
                  min={0}
                  step={1}
                  disabled={isOffline}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Sensor Readings */}
          <div className="space-y-3">
            <OccupancyDisplay status={sensorData.occupancy} />
            <LightLevelDisplay lux={sensorData.lightLevel} />
            <OnDurationDisplay turnedOnAt={device.turnedOnAt} isOn={device.isOn} />
          </div>

          <Separator />

          {/* Remove */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="w-4 h-4" />
                Remove Device
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Device</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{device.name}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>

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
    </>
  );
}