// Device and sensor types for OccuPlug system

export type ApplianceType = 'resistive' | 'inductive' | 'switching';

export type ControlMode = 'manual' | 'scheduled' | 'smart';

export type LoadClassification = {
  type: ApplianceType;
  pwmCompatible: boolean;
  description: string;
};

export type OccupancyStatus = 'occupied' | 'vacant' | 'unknown';

export interface SensorData {
  occupancy: OccupancyStatus;
  lightLevel: number; // lux
  lastUpdated: Date;
}

export interface PowerData {
  currentWatts: number;
  voltage: number;
  current: number;
  todayKwh: number;
  isAbnormal: boolean;
}

export interface AutomationSettings {
  occupancyControlEnabled: boolean;
  autoOffDelaySeconds: number;
  adaptiveLightingEnabled: boolean;
  brightnessMin: number;
  brightnessMax: number;
  targetLux: number;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ScheduleEntry {
  enabled: boolean;
  days: DayOfWeek[];
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface DeviceOverride {
  active: boolean;
  permanent: boolean;
  expiresAt?: Date;
  schedule?: ScheduleEntry;
  manualOverrideUntil?: string; // ISO timestamp
}

export interface SmartPlug {
  id: string;
  name: string;
  location: string;
  isOnline: boolean;
  isOn: boolean;
  type?: string;
  isClaimed?: boolean;
  isRegistered?: boolean;
  isRemoved?: boolean;
  removedAt?: string; // ISO timestamp
  relayState?: boolean;
  status?: string;
  brightness: number; // 0-100, only applicable if PWM compatible
  controlMode: ControlMode;
  classification: LoadClassification;
  sensorData: SensorData;
  powerData: PowerData;
  automationSettings: AutomationSettings;
  override: DeviceOverride;
  lastSeen: Date;
  turnedOnAt?: string; // ISO timestamp when device was turned on
  // Analytics fields
  category?: string; // 'lights' | 'fans' | 'others'
  deviceType?: string; // preset label e.g. "LED Bulb 9W"
  ratedWatts?: number; // rated wattage for estimated analytics
  // Appliance activity (firmware-driven, threshold >= 2.5W)
  applianceActiveNow?: boolean;
  lastApplianceActiveAt?: number; // ms epoch
  lastApplianceActiveReadable?: string;
}

export interface PowerUsageEntry {
  timestamp: Date;
  watts: number;
  kwh: number;
}

export interface DailyUsage {
  date: string;
  totalKwh: number;
  peakWatts: number;
  entries: PowerUsageEntry[];
}

// ESP-NOW communication types
export interface ESPNowMessage {
  deviceId: string;
  command: 'status' | 'toggle' | 'setBrightness' | 'setAutomation' | 'override';
  payload?: unknown;
}

export interface SystemStatus {
  espNowConnected: boolean;
  wifiConnected: boolean;
  lastSync: Date;
  deviceCount: number;
}
