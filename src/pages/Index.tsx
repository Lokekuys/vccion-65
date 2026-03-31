import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Sun,
  LogOut,
  Shield,
} from "lucide-react";
import VCCionLogo from "@/assets/VCCion_Logo_Clean.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";

import { useDevices } from "@/hooks/useDevices";
import { SmartPlug } from "@/types/device";

import { DeviceCard } from "@/components/DeviceCard";
import { DeviceDetailPanel } from "@/components/DeviceDetailPanel";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { PowerAnalytics } from "@/components/PowerAnalytics";
import { AddDeviceScanner } from "@/components/AddDeviceScanner";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const { logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const {
    devices,
    countdowns,
    vecoRate,
    monthlyBudget,
    estimatedAnalytics,
    systemStatus,
    toggleDevice,
    setBrightness,
    updateAutomation,
    setOverride,
    setControlMode,
    removeDevice,
    updateSchedule,
    updateVecoRate,
    updateMonthlyBudget,
    refreshDevices,
  } = useDevices();

  // ✅ STORE ONLY THE ID
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // 🔒 HARD SAFETY GUARD — must be AFTER all hooks
  if (devices === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading devices…</p>
      </div>
    );
  }

  // ✅ DERIVE DEVICE FROM REALTIME STATE
  const selectedDevice: SmartPlug | null = selectedDeviceId
    ? devices.find((d) => d.id === selectedDeviceId) ?? null
    : null;

  const handleSelectDevice = (device: SmartPlug) => {
    setSelectedDeviceId(device.id);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedDeviceId(null), 300);
  };

  // 📊 SAFE SUMMARY CALCULATIONS
  const occupiedCount = devices.filter(
    (d) => d.sensorData?.occupancy === "occupied"
  ).length;

  const automatedCount = devices.filter(
    (d) => d.automationSettings?.occupancyControlEnabled === true
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10">
                <img src={VCCionLogo} alt="VCCion Logo" className="app-logo w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  VCCion
                </h1>
                <p className="text-xs text-muted-foreground">
                  Occupancy-Driven Smart Plug
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Admin Panel">
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* SYSTEM STATUS */}
        {systemStatus && (
          <SystemStatusBar
            status={systemStatus}
            onRefresh={refreshDevices}
          />
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="w-5 h-5 text-occupied" />
              <div>
                <span className="data-label">Occupied Zones</span>
                <div className="font-bold">
                  {occupiedCount}/{devices.length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Sun className="w-5 h-5 text-energy" />
              <div>
                <span className="data-label">Auto-Controlled</span>
                <div className="font-bold">
                  {automatedCount}/{devices.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* POWER ANALYTICS */}
        <PowerAnalytics 
          estimatedAnalytics={estimatedAnalytics}
          vecoRate={vecoRate}
          monthlyBudget={monthlyBudget}
          onVecoRateChange={updateVecoRate}
          onMonthlyBudgetChange={updateMonthlyBudget}
          isAdmin={isAdmin === true}
        />

        {/* DEVICES GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Devices</h2>
            <AddDeviceScanner />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {devices.length === 0 ? (
    <div className="col-span-full flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-muted-foreground text-sm">
        No devices found.
      </p>
      <AddDeviceScanner />
    </div>
  ) : (
    devices.map((device) => (
      <DeviceCard
        key={device.id}
        device={device}
        onToggle={toggleDevice}
        onSelect={handleSelectDevice}
        countdownEndsAt={countdowns[device.id]}
      />
    ))
  )}
</div>

        </div>
      </main>

      {/* DEVICE DETAIL PANEL — REALTIME SAFE */}
      {selectedDevice && (
        <DeviceDetailPanel
          device={selectedDevice}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          onToggle={toggleDevice}
          onBrightnessChange={setBrightness}
          onAutomationChange={updateAutomation}
          onOverride={setOverride}
          onRemove={removeDevice}
          onScheduleChange={updateSchedule}
          onControlModeChange={setControlMode}
        />
      )}
    </div>
  );
};

export default Index;
