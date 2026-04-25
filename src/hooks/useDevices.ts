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

  useEffect(() => {

    const sensorRef = ref(rtdb, "OccupancyPlug/sensorBox");

    const unsubscribe = onValue(sensorRef, (snapshot) => {

      if (snapshot.exists()) {

        const data = snapshot.val();

       

        const lastSeenMs = (data.lastSeen && data.lastSeen > 1000000000000)

          ? data.lastSeen

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



  const [sensorTick, setSensorTick] = useState(0);

  useEffect(() => {

    const i = setInterval(() => setSensorTick((t) => t + 1), 10_000);

    return () => clearInterval(i);

  }, []);



  const isSensorBoxOnline = useMemo(() => {

    if (!sharedSensorData) return false;

    const status = computeConnectionStatus(sharedSensorData.lastSeenMs);

    return status === 'connected';

  }, [sharedSensorData, sensorTick]);





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

            isLocked: d.isLocked ?? false,

            isOnline: true,

            controlMode: d.controlMode ?? 'manual',

            smartMode: (d.smartMode as SmartMode) ?? 'occupancy',



            sensorData: {

              occupancy: sharedSensorRef.current?.occupancy ?? "unknown",

              lightLevel: sharedSensorRef.current?.lightLevel ?? 0,

              lastUpdated: new Date(),

            },



            powerData: {

              currentWatts: d.pzemTest?.power ?? d.power ?? d.powerData?.currentWatts ?? 0,

              voltage: d.pzemTest?.voltage ?? d.voltage ?? d.powerData?.voltage ?? 220,

              current: d.pzemTest?.current ?? d.current ?? d.powerData?.current ?? 0,

              todayKwh: d.pzemTest?.energy ?? d.energy ?? d.powerData?.todayKwh ?? 0,

              isAbnormal: d.powerData?.isAbnormal ?? false,

            },



            automationSettings: {

              occupancyControlEnabled: d.automationSettings?.occupancyControlEnabled ?? false,

              autoOffDelaySeconds: d.automationSettings?.autoOffDelaySeconds ?? 300,

              adaptiveLightingEnabled: d.automationSettings?.adaptiveLightingEnabled ?? false,

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

      const watts = d.powerData?.currentWatts ?? 0;

      let onHoursToday = 0;

      if (d.isOn && d.turnedOnAt) {

        const turnedOn = new Date(d.turnedOnAt);

        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const effectiveStart = turnedOn > startOfDay ? turnedOn : startOfDay;

        onHoursToday = Math.max(0, (now.getTime() - effectiveStart.getTime()) / 3600000);

      }

      const dailyKwh = (watts / 1000) * onHoursToday;

      const dailyCost = dailyKwh * vecoRate;

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



  const deviceMeta = useMemo(

    () =>

      (devices ?? []).map((d) => ({

        id: d.id,

        name: d.name,

        deviceType: d.deviceType ?? d.name,

        isOnline: computeConnectionStatus(d.lastSeen) === 'connected',

        applianceActiveNow: d.applianceActiveNow ?? false,

        lastApplianceActiveAt: d.lastApplianceActiveAt ?? 0,

      })),

    [devices]

  );

  const historyAnalytics = useAnalyticsLogs(deviceMeta, vecoRate, monthlyBudget);



  /* ---------- AUTO-OFF TIMER LOGIC (FLICKER & ISOLATION FIX) ---------- */

  const vacancyTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const [countdowns, setCountdowns] = useState<Record<string, number>>({});



  useEffect(() => {

    if (!devices || !isSensorBoxOnline) return;



    devices.forEach((device) => {

      const { id, isOn, sensorData, automationSettings: auto, controlMode, smartMode } = device;



      if (controlMode !== 'smart') {

        if (vacancyTimers.current[id]) {

          clearTimeout(vacancyTimers.current[id]);

          delete vacancyTimers.current[id];

          setCountdowns(prev => { const n = {...prev}; delete n[id]; return n; });

        }

        return;

      }



      const isOccupied = sensorData.occupancy === 'occupied';

      const targetLux = auto.targetLux ?? 400;

     

      // Hysteresis buffer of 20 lux prevents rapid flickering

      const isDarkEnough = sensorData.lightLevel < targetLux;

      const isBrightEnough = sensorData.lightLevel > (targetLux + 20);



      // 1. DETERMINE IF WE SHOULD BE ON (Strict isolation)

      let shouldBeOn = false;

      if (smartMode === 'occupancy') {

        shouldBeOn = isOccupied;

      } else if (smartMode === 'light') {

        shouldBeOn = isOn ? !isBrightEnough : isDarkEnough;

      } else if (smartMode === 'both') {

        shouldBeOn = isOccupied && (isOn ? !isBrightEnough : isDarkEnough);

      }



      // 2. TURN ON ACTION

      if (!isOn && shouldBeOn) {

        // Clear any pending off-timers if conditions are met

        if (vacancyTimers.current[id]) {

          clearTimeout(vacancyTimers.current[id]);

          delete vacancyTimers.current[id];

          setCountdowns(prev => { const n = {...prev}; delete n[id]; return n; });

        }

       

        update(ref(rtdb, `devices/${id}`), {

          isOn: true,

          relayState: true,

          lastSeen: Date.now(),

          turnedOnAt: new Date().toISOString(),

        });

      }



      // 3. TURN OFF ACTION (The logic-lock prevents flicker during vacancy)

      if (isOn && !shouldBeOn) {

        // Only use the timer if the mode actually involves occupancy logic

        const useTimer = auto.occupancyControlEnabled && (smartMode === 'occupancy' || smartMode === 'both');



        if (!useTimer) {

          // Immediate Turn Off for Light-Only mode (prevents Logic War)

          update(ref(rtdb, `devices/${id}`), {

            isOn: false,

            relayState: false,

            lastSeen: Date.now(),

            turnedOnAt: null,

          });

        } else if (!vacancyTimers.current[id]) {

          // Delayed Turn Off for Occupancy-based modes

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

            setCountdowns(prev => { const n = {...prev}; delete n[id]; return n; });

          }, delayMs);

        }

      }

    });

  }, [devices, isSensorBoxOnline]);



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



  const toggleDeviceLock = useCallback((deviceId: string, currentLockState: boolean) => {

    update(ref(rtdb, `devices/${deviceId}`), {

      isLocked: !currentLockState,

      lastSeen: Date.now(),

    });

  }, []);



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



  const removeDevice = useCallback((deviceId: string) => {

    update(ref(rtdb, `devices/${deviceId}`), {

      isClaimed: false,

      isRegistered: false,

      isRemoved: false,

      removedAt: new Date().toISOString(),

      name: null,

      location: null,

      controlMode: 'manual',

    });

  }, []);



  const setSmartMode = useCallback((deviceId: string, mode: SmartMode) => {
  // Map the string from the UI to the Integer the ESP32 v1.9.0 expects
  const presetMap: Record<SmartMode, number> = {
    'occupancy': 1,
    'light': 2,
    'both': 3
  };

  const presetInt = presetMap[mode] || 3;

  // Update both paths so the UI and the Firmware are both happy
  update(ref(rtdb, `devices/${deviceId}`), {
    smartMode: mode,        // For the Website UI
    smartPreset: presetInt, // For the ESP32 v1.9.0 Logic
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

    update(ref(rtdb, `devices/${deviceId}`), {

      controlMode: mode,

      lastSeen: Date.now(),

    });

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

    isSensorBoxOnline,

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

    toggleDeviceLock,

  };

}