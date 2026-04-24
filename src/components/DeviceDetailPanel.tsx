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
  Zap,
  RotateCcw,
  Loader2,
  SignalZero,
} from "lucide-react";
import { ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computeConnectionStatus, formatLastSeen, STATUS_CONFIG } from "@/lib/deviceStatus";
import { SmartPlug, AutomationSettings, ScheduleEntry, ControlMode, SmartMode } from "@/types/device";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ApplianceActivityDisplay,
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
  onSmartModeChange?: (deviceId: string, mode: SmartMode) => void;
  isSensorBoxOnline?: boolean;
}

const CONTROL_MODES: { value: ControlMode; label: string; icon: typeof Hand; description: string }[] = [
  { value: 'manual', label: 'Manual', icon: Hand, description: 'Direct ON/OFF control' },
  { value: 'scheduled', label: 'Scheduled', icon: Calendar, description: 'Follow time schedule' },
  { value: 'smart', label: 'Smart', icon: Brain, description: 'Sensor automation' },
];

const SMART_MODES: { value: SmartMode; label: string; description: string }[] = [
  { value: 'occupancy', label: 'Smart One — Occupancy Only', description: 'Turns ON when the room is occupied. Ignores light.' },
  { value: 'light', label: 'Smart Two — Light Only', description: 'Turns ON when the area is dark. Ignores occupancy.' },
  { value: 'both', label: 'Smart Three — Occupancy + Light', description: 'Turns ON only when occupied AND dark.' },
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
  onSmartModeChange,
  isSensorBoxOnline = true,
}: DeviceDetailPanelProps) {
  const [showToggleWarning, setShowToggleWarning] = React.useState(false);
  const [showWifiReset, setShowWifiReset] = React.useState(false);
  const [isResettingWifi, setIsResettingWifi] = React.useState(false);

  if (!device) return null;

  const connectionStatus = computeConnectionStatus(device.lastSeen);
  const statusConfig = STATUS_CONFIG[connectionStatus];
  const lastSeenText = formatLastSeen(device.lastSeen);
  const isOffline = connectionStatus === 'offline';
  const effectiveIsOn = !isOffline && device.isOn;

  const sensorData = device.sensorData ?? { occupancy: "vacant", lightLevel: 0 };
  const powerData = device.powerData ?? { currentWatts: 0, todayKwh: 0, isAbnormal: false };
  const automationSettings = device.automationSettings ?? {
    occupancyControlEnabled: false,
    autoOffDelaySeconds: 300,
    adaptiveLightingEnabled: false,
  };
  const controlMode = device.controlMode ?? 'manual';
  const currentSmartMode = device.smartMode ?? 'occupancy';

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

  const handleResetWifi = async () => {
    setIsResettingWifi(true);
    try {
      await set(ref(rtdb, `devices/${device.id}/commands/resetWiFi`), true);
      toast.success("Wi-Fi reset command sent. The device should restart and open its setup hotspot.");
      setShowWifiReset(false);
    } catch (error) {
      toast.error("Failed to send Wi-Fi reset command. Please try again.");
    } finally {
      setIsResettingWifi(false);
    }
  };

  // Helper to determine if occupancy-based controls should be disabled
  const isOccupancyLogicDisabled = currentSmartMode === 'light';

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              {/* Glowing Dot Indicator */}
              <div className="flex items-center justify-center w-12 h-12">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full transition-all duration-300',
                    effectiveIsOn
                      ? 'bg-green-500 ring-[6px] ring-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                      : 'bg-red-500 ring-[6px] ring-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                  )}
                />
              </div>

              {/* Stacked Name and Location Fix */}
              <div className="flex flex-col justify-center gap-1">
                <SheetTitle className="text-left text-lg font-semibold leading-none">
                  {device.name}
                </SheetTitle>
                {device.location && (
                  <SheetDescription className="text-left text-sm text-muted-foreground leading-none">
                    {device.location}
                  </SheetDescription>
                )}
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
          {/* Power Control */}
          <div className={cn("flex items-center justify-between p-4 rounded-xl bg-muted", isOffline && "opacity-50")}>
            <div className="flex items-center gap-3">
              <Power className="w-5 h-5 text-primary" />
              <div>
                <Label className="text-base font-medium">Power</Label>
                <p className="text-sm text-muted-foreground">
                  {effectiveIsOn ? "Device is on" : "Device is off"}
                </p>
              </div>
            </div>
            <Switch
              checked={effectiveIsOn}
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
                const isSmartDisabled = mode.value === 'smart' && !isSensorBoxOnline;
                const isDisabled = isOffline || isSmartDisabled;
                return (
                  <button
                    key={mode.value}
                    onClick={() => onControlModeChange(device.id, mode.value)}
                    disabled={isDisabled}
                    title={isSmartDisabled ? 'Sensor box required for automation' : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                      isDisabled && "cursor-not-allowed opacity-50 hover:bg-muted hover:text-muted-foreground"
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
            {!isSensorBoxOnline && (
              <p className="text-[11px] text-warning flex items-center gap-1">
                <SignalZero className="w-3 h-3" />
                Smart mode unavailable — sensor box required for automation.
              </p>
            )}
          </div>

          {/* Schedule Editor */}
          {controlMode === 'scheduled' && (
            <ScheduleEditor
              schedule={device.override?.schedule}
              onChange={(schedule) => onScheduleChange(device.id, schedule)}
              scheduleStatus={scheduleStatus}
              statusLabel={scheduleLabel}
            />
          )}

          {/* Smart Mode Settings */}
          {controlMode === 'smart' && (
            <div className={cn("space-y-4", (isOffline || !isSensorBoxOnline) && "opacity-50 pointer-events-none")}>
              <div className="space-y-2">
                <Label className="font-medium">Smart Automation Preset</Label>
                <Select
                  value={currentSmartMode}
                  onValueChange={(v) => onSmartModeChange?.(device.id, v as SmartMode)}
                  disabled={isOffline}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMART_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {SMART_MODES.find((m) => m.value === currentSmartMode)?.description}
                </p>
              </div>

              {/* AUTO-OFF SWITCH: Disabled visually if Smart Mode 2 is active */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg bg-muted transition-opacity",
                isOccupancyLogicDisabled && "opacity-40 grayscale-[0.5]"
              )}>
                <div className="flex flex-col gap-0.5">
                  <Label className={cn(isOccupancyLogicDisabled && "text-muted-foreground")}>
                    Auto-Off on Vacancy
                  </Label>
                  {isOccupancyLogicDisabled && (
                    <span className="text-[10px] text-warning font-medium">Disabled in Light-Only mode</span>
                  )}
                </div>
                <Switch
                  checked={isOccupancyLogicDisabled ? false : automationSettings.occupancyControlEnabled}
                  onCheckedChange={(checked) => onAutomationChange(device.id, { occupancyControlEnabled: checked })}
                  disabled={isOffline || isOccupancyLogicDisabled}
                />
              </div>

              {/* AUTO-OFF DELAY: Disabled visually if Smart Mode 2 is active or Switch is OFF */}
              {automationSettings.occupancyControlEnabled && (
                <div className={cn(
                  "space-y-3 p-3 rounded-lg border transition-opacity",
                  isOccupancyLogicDisabled && "opacity-40 pointer-events-none"
                )}>
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
                        disabled={isOccupancyLogicDisabled}
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
                        disabled={isOccupancyLogicDisabled}
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
                        disabled={isOccupancyLogicDisabled}
                      />
                      <span className="text-sm text-muted-foreground">s</span>
                    </div>
                  </div>
                  {!isOccupancyLogicDisabled && (
                    <p className="text-xs text-muted-foreground">
                      Device turns off after {autoOffHours > 0 ? `${autoOffHours}h ` : ""}{autoOffMinutes > 0 ? `${autoOffMinutes}m ` : ""}{autoOffSeconds}s of vacancy
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Brightness */}
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

          {/* Sensor Readings & Power Block */}
          <div className="space-y-3">
            <div className="relative">
              <div className={cn(
                'space-y-3 transition-opacity',
                !isSensorBoxOnline && 'opacity-40 blur-[1px] pointer-events-none select-none'
              )}>
                <OccupancyDisplay status={sensorData.occupancy} />
                <LightLevelDisplay lux={sensorData.lightLevel} />
              </div>
              {!isSensorBoxOnline && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-4 py-1.5 rounded-md bg-card/95 border border-red-500/30 shadow-sm text-[11px] font-medium text-red-500">
                    Sensor Box Disconnected
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Zap className="w-4 h-4 text-sensor-power" />
              <span className="text-sm font-medium text-foreground">
                {(isOffline ? 0 : powerData.currentWatts).toFixed(1)} W
              </span>
              <span className="text-xs text-muted-foreground">
                {isOffline ? 'Offline' : 'Live'}
              </span>
            </div>

            <ApplianceActivityDisplay
              applianceActiveNow={isOffline ? false : device.applianceActiveNow}
              lastApplianceActiveAt={device.lastApplianceActiveAt}
              lastApplianceActiveReadable={device.lastApplianceActiveReadable}
              forceInactive={isOffline}
            />
          </div>

          <Separator />

          {/* Wi-Fi Settings */}
          <div className="space-y-2">
            <Label className="font-medium">Connection Settings</Label>
            <p className="text-xs text-muted-foreground">
              Use this if the plug needs to connect to a different Wi-Fi network.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
              onClick={() => setShowWifiReset(true)}
              disabled={isOffline}
            >
              <RotateCcw className="w-4 h-4" />
              Reconfigure Wi-Fi
            </Button>
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

    <AlertDialog open={showWifiReset} onOpenChange={setShowWifiReset}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reconfigure Wi-Fi?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">This device will forget its current Wi-Fi network, restart, and return to setup mode.</span>
            <span className="block">You will need to reconnect it through the setup hotspot.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResettingWifi}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetWifi}
            disabled={isResettingWifi}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isResettingWifi ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Reset Wi-Fi"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}