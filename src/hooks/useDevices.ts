import { ref, onValue, set, update, get } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  SmartPlug,
  AutomationSettings,
  ScheduleEntry,
  DailyUsage,
  SystemStatus,
  ApplianceType,
  ControlMode,
  SmartMode,
} from "@/types/device";
import { getScheduleStatus, getNextScheduleBoundary } from "@/lib/scheduleUtils";
import { useAnalyticsLogs } from "@/hooks/useAnalyticsLogs";
import { computeConnectionStatus } from "@/lib/deviceStatus";

/* ---------- HOOK ---------- */

export function useDevices() {
  const [devices, setDevices] = useState<SmartPlug[] | null>(null);
  const [vecoRate, setVecoRate] = useState<number>(12.79);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [dailyUsage] = useState<DailyUsage[]>([]);
  const [sharedSensorData, setSharedSensorData] = useState<{ occupancy: string; lightLevel: number; lastSeenMs: number } | null>(null);
  const sharedSensorRef = useRef<{ occupancy: string; lightLevel: number; lastSeenMs: number } | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    espNowConnected: true,
    wifiConnected: true,
    lastSync: new Date(),
    deviceCount: 0,
  });

  // Read VECO rate from Firebase
  useEffect(() => {
    const rateRef = ref(rtdb, "settings/vecoRate");
    const unsubscribe = onValue(rateRef, (snapshot) => {
      if (snapshot.exists()) {
        setVecoRate(snapshot.val());
      } else {
        set(rateRef, 12.79);
      }
    });
    return () => unsubscribe();
  }, []);

  // Read monthly budget from Firebase
  useEffect(() => {
    const budgetRef = ref(rtdb, "settings/monthlyBudget");
    const unsubscribe = onValue(budgetRef, (snapshot) => {
      if (snapshot.exists()) {
        setMonthlyBudget(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to shared sensor box (OccupancyPlug/sensorBox)
  // IMPORTANT: sensor box state is INDEPENDENT from plug state.
  // We only zero out sensor values if the sensor box itself stops reporting.
  useEffect(() => {
    const sensorRef = ref(rtdb, "OccupancyPlug/sensorBox");
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lastSeenMs =
          typeof data.lastSeen === "number"
            ? data.lastSeen
            : typeof data.lastUpdated === "number"
            ? data.lastUpdated
            : Date.now();
        const parsed = {
          occupancy: data.presence?.detected === true ? "occupied" : "vacant",
          lightLevel: data.lux ?? 0,
          lastSeenMs,
        };
        sharedSensorRef.current = parsed;
        setSharedSensorData(parsed);
      }
    });
    return () => unsubscribe();
  }, []);

  // Tick every 10s so derived "sensor box online" recomputes even without new RTDB events
  const [, setSensorTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setSensorTick((t) => t + 1), 10_000);
    return () => clearInterval(i);
  }, []);

  // Sensor box is considered online if it reported within last 60s
  const SENSOR_BOX_TIMEOUT_MS = 60_000;
  const isSensorBoxOnline =
    !!sharedSensorData && Date.now() - sharedSensorData.lastSeenMs < SENSOR_BOX_TIMEOUT_MS;

  /* ---------- READ FROM FIREBASE ---------- */
  useEffect(() => {
    const devicesRef = ref(rtdb, "devices");

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        const deviceList: SmartPlug[] = Object.entries(data)
          .filter(([_, d]: [string, any]) => d.isClaimed === true && d.isRemoved !== true)
          .map(([id, d]: [string, any]) => {
            const rawName = d.name;
            const hasValidName = rawName && rawName !== id && !rawName.startsWith('plug');
            const safeName = hasValidName ? rawName : (d.location ? `${d.location} Plug` : 'Smart Plug');

            return {
            ...d,
            id,
            name: safeName,
            isOn: d.relayState ?? d.isOn ?? false,
            isOnline: true,
            controlMode:
            d.controlMode ??
            (d.mode === 0 ? 'off' : d.mode === 1 ? 'manual' : d.mode === 2 ? 'smart' : d.mode === 3 ? 'scheduled' : 'manual'),
            smartMode: (d.smartMode as SmartMode) ?? 'occupancy',

            sensorData: {
              // Sensor box state is independent from plug. If sensor box is offline,
              // fall back to last device-stored values (or defaults), NOT to current
              // sharedSensorRef which would be stale/unreachable.
              occupancy: isSensorBoxOnline
                ? (sharedSensorRef.current?.occupancy ?? d.sensorData?.occupancy ?? "vacant")
                : (d.sensorData?.occupancy ?? "unknown"),
              lightLevel: isSensorBoxOnline
                ? (sharedSensorRef.current?.lightLevel ?? d.sensorData?.lightLevel ?? 0)
                : (d.sensorData?.lightLevel ?? 0),
              lastUpdated: d.sensorData?.lastUpdated
                ? new Date(d.sensorData.lastUpdated)
                : new Date(),
            },

            powerData: {
              currentWatts: d.pzemTest?.power ?? d.power ?? d.powerData?.currentWatts ?? 0,
              voltage: d.pzemTest?.voltage ?? d.voltage ?? d.powerData?.voltage ?? 220,
              current: d.pzemTest?.current ?? d.current ?? d.powerData?.current ?? 0,
              todayKwh: d.pzemTest?.energy ?? d.energy ?? d.powerData?.todayKwh ?? 0,
              isAbnormal: d.powerData?.isAbnormal ?? false,
            },

            automationSettings: {
              occupancyControlEnabled:
                d.automationSettings?.occupancyControlEnabled ?? false,
              autoOffDelaySeconds:
                d.automationSettings?.autoOffDelaySeconds ?? 300,
              adaptiveLightingEnabled:
                d.automationSettings?.adaptiveLightingEnabled ?? false,
              brightnessMin: d.automationSettings?.brightnessMin ?? 20,
              brightnessMax: d.automationSettings?.brightnessMax ?? 100,
              targetLux: d.automationSettings?.targetLux ?? 400,
            },

            classification: d.classification ?? {
              type: 'switching' as const,
              pwmCompatible: false,
              description: 'Unknown load type',
            },

            override: {
              active: d.override?.active ?? false,
              permanent: d.override?.permanent ?? false,
              ...(d.override?.manualOverrideUntil ? { manualOverrideUntil: d.override.manualOverrideUntil } : {}),
              ...(d.override?.schedule ? { schedule: d.override.schedule } : {}),
            },

            location: d.location ?? 'Unknown',
            brightness: d.brightness ?? 100,
            lastSeen: d.lastSeen ? new Date(d.lastSeen) : new Date(0),
            category: d.category ?? undefined,
            deviceType: d.deviceType ?? undefined,
            ratedWatts: d.ratedWatts ?? undefined,
            applianceActiveNow: d.applianceActiveNow ?? false,
            lastApplianceActiveAt: typeof d.lastApplianceActiveAt === 'number' ? d.lastApplianceActiveAt : 0,
            lastApplianceActiveReadable: d.lastApplianceActiveReadable ?? undefined,
          };
          })

        setDevices(deviceList);
        setSystemStatus((prev) => ({
          ...prev,
          deviceCount: deviceList.length,
          lastSync: new Date(),
        }));
      } else {
        setDevices([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Re-merge sensor data into devices when sharedSensorData changes.
  // Only apply live values when the sensor box itself is currently online.
  useEffect(() => {
    if (!sharedSensorData || !isSensorBoxOnline) return;
    setDevices((prev) => {
      if (!prev) return prev;
      return prev.map((d) => ({
        ...d,
        sensorData: {
          ...d.sensorData,
          occupancy: sharedSensorData.occupancy as any,
          lightLevel: sharedSensorData.lightLevel,
        },
      }));
    });
  }, [sharedSensorData, isSensorBoxOnline]);

  /* ---------- ESTIMATED ANALYTICS ---------- */
  const estimatedAnalytics = useMemo(() => {
    if (!devices) return null;

    const now = new Date();
    const perDevice = devices.map((d) => {
      // Use live PZEM wattage reading instead of rated wattage
      const watts = d.powerData?.currentWatts ?? 0;
      // Calculate ON duration in hours
      let onHoursToday = 0;
      if (d.isOn && d.turnedOnAt) {
        const turnedOn = new Date(d.turnedOnAt);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const effectiveStart = turnedOn > startOfDay ? turnedOn : startOfDay;
        onHoursToday = Math.max(0, (now.getTime() - effectiveStart.getTime()) / 3600000);
      }

      const dailyKwh = (watts / 1000) * onHoursToday;
      const dailyCost = dailyKwh * vecoRate;
      // Estimate monthly: assume average daily usage × 30
      const monthlyKwh = dailyKwh * 30;
      const monthlyCost = monthlyKwh * vecoRate;

      return {
        id: d.id,
        name: d.name,
        deviceType: d.deviceType ?? d.name,
        ratedWatts: watts,
        onHoursToday,
        dailyKwh,
        dailyCost,
        monthlyKwh,
        monthlyCost,
      };
    });

    const totalDailyKwh = perDevice.reduce((s, d) => s + d.dailyKwh, 0);
    const totalDailyCost = perDevice.reduce((s, d) => s + d.dailyCost, 0);
    const totalMonthlyKwh = perDevice.reduce((s, d) => s + d.monthlyKwh, 0);
    const totalMonthlyCost = perDevice.reduce((s, d) => s + d.monthlyCost, 0);
    const highest = perDevice.length > 0 
      ? perDevice.reduce((max, d) => d.dailyKwh > max.dailyKwh ? d : max, perDevice[0])
      : null;

    // Budget status
    let budgetStatus: 'ok' | 'nearing' | 'almost' | 'exceeded' = 'ok';
    let budgetPercent = 0;
    if (monthlyBudget > 0) {
      budgetPercent = (totalMonthlyCost / monthlyBudget) * 100;
      if (budgetPercent >= 100) budgetStatus = 'exceeded';
      else if (budgetPercent >= 90) budgetStatus = 'almost';
      else if (budgetPercent >= 80) budgetStatus = 'nearing';
    }

    return {
      perDevice,
      totalDailyKwh,
      totalDailyCost,
      totalMonthlyKwh,
      totalMonthlyCost,
      highest,
      budgetStatus,
      budgetPercent,
      remainingBudget: monthlyBudget > 0 ? Math.max(0, monthlyBudget - totalMonthlyCost) : 0,
    };
  }, [devices, vecoRate, monthlyBudget]);

  /* ---------- HISTORY-BASED ANALYTICS (source of truth) ---------- */
  const deviceMeta = useMemo(
    () =>
      (devices ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        deviceType: d.deviceType ?? d.name,
        // Pass live state to analytics so per-device rows can show
        // accurate "Inactive" / "Active now" labels (UI-only, no data mutation).
        isOnline: computeConnectionStatus(d.lastSeen) === 'connected',
        applianceActiveNow: d.applianceActiveNow ?? false,
        lastApplianceActiveAt: d.lastApplianceActiveAt ?? 0,
      })),
    [devices]
  );
  const historyAnalytics = useAnalyticsLogs(deviceMeta, vecoRate, monthlyBudget);

  /* ---------- AUTO-OFF TIMER LOGIC ---------- */
  const vacancyTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!devices) return;

    devices.forEach((device) => {
      const {
        id,
        isOn,
        sensorData,
        automationSettings: auto,
        controlMode,
        smartMode,
      } = device;

      if (controlMode !== 'smart') {
        if (vacancyTimers.current[id]) {
          clearTimeout(vacancyTimers.current[id]);
          delete vacancyTimers.current[id];
          setCountdowns((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
        return;
      }

      // Derive binary signals from sensors
      const occupancySignal = sensorData.occupancy === 'occupied'; // 1 = occupied
      const targetLux = auto.targetLux ?? 400;
      const lightSignal = (sensorData.lightLevel ?? 0) < targetLux; // 1 = dark / needs light

      // Determine if device SHOULD be on based on smart preset
      let shouldBeOn = false;
      const mode = smartMode ?? 'occupancy';
      if (mode === 'occupancy') shouldBeOn = occupancySignal;
      else if (mode === 'light') shouldBeOn = lightSignal;
      else if (mode === 'both') shouldBeOn = occupancySignal && lightSignal;

      if (!isOn && shouldBeOn) {
        update(ref(rtdb, `devices/${id}`), {
          isOn: true,
          relayState: true,
          lastSeen: Date.now(),
          turnedOnAt: new Date().toISOString(),
        });
      }

      if (isOn && !shouldBeOn) {
        if (!auto.occupancyControlEnabled) {
          update(ref(rtdb, `devices/${id}`), {
            isOn: false,
            relayState: false,
            lastSeen: Date.now(),
            turnedOnAt: null,
          });
        } else if (!vacancyTimers.current[id]) {
          const delayMs = (auto.autoOffDelaySeconds ?? 300) * 1000;
          const endsAt = Date.now() + delayMs;

          setCountdowns((prev) => ({ ...prev, [id]: endsAt }));

          vacancyTimers.current[id] = setTimeout(() => {
            update(ref(rtdb, `devices/${id}`), {
              isOn: false,
              relayState: false,
              lastSeen: Date.now(),
              turnedOnAt: null,
            });
            delete vacancyTimers.current[id];
            setCountdowns((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }, delayMs);
        }
      } else if (vacancyTimers.current[id]) {
        clearTimeout(vacancyTimers.current[id]);
        delete vacancyTimers.current[id];
        setCountdowns((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
  }, [devices]);

  useEffect(() => {
    return () => {
      Object.values(vacancyTimers.current).forEach(clearTimeout);
    };
  }, []);
  

  /* ---------- SCHEDULE-BASED AUTO ON/OFF ---------- */
  const DAY_MAP: Record<number, string> = {
    0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
  };

  useEffect(() => {
    if (!devices) return;

    const checkSchedules = () => {
      const now = new Date();
      const currentDay = DAY_MAP[now.getDay()];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      devices.forEach((device) => {
        const schedule = device.override?.schedule;
        if (!schedule?.days?.length || !schedule?.startTime || !schedule?.endTime) return;
        if (device.controlMode !== 'scheduled') return;

        const manualUntil = device.override?.manualOverrideUntil;
        if (manualUntil && new Date(manualUntil) > now) return;

        if (manualUntil && new Date(manualUntil) <= now) {
          update(ref(rtdb, `devices/${device.id}/override`), {
            manualOverrideUntil: null,
          });
        }

        const isScheduledDay = schedule.days.includes(currentDay as any);
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const inWindow = isScheduledDay && currentMinutes >= startMinutes && currentMinutes < endMinutes;

        if (inWindow && !device.isOn) {
          update(ref(rtdb, `devices/${device.id}`), {
            isOn: true,
            relayState: true,
            lastSeen: Date.now(),
            turnedOnAt: Date.now(),
          });
        } else if (!inWindow && device.isOn) {
          update(ref(rtdb, `devices/${device.id}`), {
            isOn: false,
            relayState: false,
            lastSeen: Date.now(),
            turnedOnAt: null,
          });
        }
      });
    };

    checkSchedules();
    const interval = setInterval(checkSchedules, 30_000);
    return () => clearInterval(interval);
  }, [devices]);
  

  /* ---------- WRITE TO FIREBASE ---------- */

  const toggleDevice = useCallback(
    (deviceId: string) => {
      const device = devices?.find((d) => d.id === deviceId);
      if (!device) return;

      const newIsOn = !device.isOn;
      const updates: Record<string, any> = {
        isOn: newIsOn,
        relayState: newIsOn,
        lastSeen: Date.now(),
        turnedOnAt: newIsOn ? Date.now() : null,
      };

     if (device.controlMode === 'scheduled' || device.controlMode === 'smart') {
     updates.controlMode = 'manual';
     updates.mode = 1;
}
      if (device.controlMode === 'smart' && vacancyTimers.current[deviceId]) {
        clearTimeout(vacancyTimers.current[deviceId]);
        delete vacancyTimers.current[deviceId];
        setCountdowns((prev) => {
          const next = { ...prev };
          delete next[deviceId];
          return next;
        });
      }

      update(ref(rtdb, `devices/${deviceId}`), updates);
    },
    [devices]
  );

  const setBrightness = useCallback(
    (deviceId: string, brightness: number) => {
      update(ref(rtdb, `devices/${deviceId}`), {
        brightness,
        lastSeen: Date.now(),
      });
    },
    []
  );

  const updateAutomation = useCallback(
    (deviceId: string, settings: Partial<AutomationSettings>) => {
      update(ref(rtdb, `devices/${deviceId}/automationSettings`), settings);
    },
    []
  );

  const setOverride = useCallback(
    (deviceId: string, active: boolean, permanent = false) => {
      update(ref(rtdb, `devices/${deviceId}/override`), {
        active,
        permanent,
      });
    },
    []
  );

  // Remove device: fully reset claim/registration/removal flags so it
  // becomes immediately discoverable again by the Add Device scanner.
  // We do NOT keep isRemoved=true because the scanner filters those out.
  const removeDevice = useCallback((deviceId: string) => {
    update(ref(rtdb, `devices/${deviceId}`), {
      isClaimed: false,
      isRegistered: false,
      isRemoved: false,
      removedAt: new Date().toISOString(),
      // Clear user-set metadata so the next claimer sees a fresh device
      name: null,
      location: null,
      controlMode: 'manual',
      mode: 1,
    });
  }, []);

  const setSmartMode = useCallback((deviceId: string, mode: SmartMode) => {
    update(ref(rtdb, `devices/${deviceId}`), {
      smartMode: mode,
      lastSeen: Date.now(),
    });
  }, []);

  const updateSchedule = useCallback(
  (deviceId: string, schedule: ScheduleEntry) => {
    const startParts = schedule.startTime?.split(':').map(Number) ?? [8, 0];
    const endParts = schedule.endTime?.split(':').map(Number) ?? [18, 0];

    update(ref(rtdb, `devices/${deviceId}`), {
      'override/schedule': schedule,
      'schedule': {
        enabled: true,
        startHour: startParts[0] ?? 8,
        startMinute: startParts[1] ?? 0,
        endHour: endParts[0] ?? 18,
        endMinute: endParts[1] ?? 0,
      },
    });
  },
  []
);

  const updateVecoRate = useCallback((rate: number) => {
    set(ref(rtdb, "settings/vecoRate"), rate);
  }, []);

  const updateMonthlyBudget = useCallback((budget: number) => {
    set(ref(rtdb, "settings/monthlyBudget"), budget);
    setMonthlyBudget(budget);
  }, []);

  const setControlMode = useCallback((deviceId: string, mode: ControlMode) => {
  const modeMap: Record<ControlMode, number> = {
    manual: 1,
    smart: 2,
    scheduled: 3,
  };

  const updates: Record<string, any> = {
    controlMode: mode,
    mode: modeMap[mode],
    lastSeen: Date.now(),
  };

  if (mode === 'scheduled') {
    const device = devices?.find((d) => d.id === deviceId);
    const existing = device?.override?.schedule;

    if (!existing?.days?.length || !existing?.startTime || !existing?.endTime) {
      updates['override/schedule'] = {
        enabled: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '08:00',
        endTime: '18:00',
      };
    }

    // Also create ESP-friendly schedule fields
    updates['schedule'] = {
      enabled: true,
      startHour: 8,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
    };
  }

  update(ref(rtdb, `devices/${deviceId}`), updates);
}, [devices]);
  const refreshDevices = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    devices,
    countdowns,
    dailyUsage,
    vecoRate,
    monthlyBudget,
    estimatedAnalytics,
    historyAnalytics,
    systemStatus,
    toggleDevice,
    setBrightness,
    updateAutomation,
    setOverride,
    setControlMode,
    setSmartMode,
    removeDevice,
    updateSchedule,
    updateVecoRate,
    updateMonthlyBudget,
    refreshDevices,
  };
}
