// Appliance category and preset definitions for Philippine household appliances

export type ApplianceCategory = 'lights' | 'fans' | 'others';

export interface AppliancePreset {
  label: string;
  watts: number;
  isOther?: boolean;
}

export const CATEGORY_OPTIONS: { value: ApplianceCategory; label: string; icon: string }[] = [
  { value: 'lights', label: 'Lights', icon: '💡' },
  { value: 'fans', label: 'Fans', icon: '🌀' },
  { value: 'others', label: 'Others', icon: '🔌' },
];

export const APPLIANCE_PRESETS: Record<ApplianceCategory, AppliancePreset[]> = {
  lights: [
    { label: 'LED Bulb 5W', watts: 5 },
    { label: 'LED Bulb 7W', watts: 7 },
    { label: 'LED Bulb 9W', watts: 9 },
    { label: 'LED Bulb 12W', watts: 12 },
    { label: 'CFL Bulb 15W', watts: 15 },
    { label: 'CFL Bulb 18W', watts: 18 },
    { label: 'Incandescent Bulb 40W', watts: 40 },
    { label: 'Incandescent Bulb 60W', watts: 60 },
    { label: 'Incandescent Bulb 100W', watts: 100 },
    { label: 'Tube Light 18W', watts: 18 },
    { label: 'Tube Light 36W', watts: 36 },
    { label: 'Ring Light 10W', watts: 10 },
    { label: 'Christmas Lights 25W', watts: 25 },
    { label: 'Other Light', watts: 0, isOther: true },
  ],
  fans: [
    { label: 'Mini Fan 20W', watts: 20 },
    { label: 'Desk Fan 35W', watts: 35 },
    { label: 'Desk Fan 45W', watts: 45 },
    { label: 'Stand Fan 60W', watts: 60 },
    { label: 'Stand Fan 75W', watts: 75 },
    { label: 'Wall Fan 65W', watts: 65 },
    { label: 'Exhaust Fan 30W', watts: 30 },
    { label: 'Industrial Fan 120W', watts: 120 },
    { label: 'Other Fan', watts: 0, isOther: true },
  ],
  others: [
    { label: 'Phone Charger 5W', watts: 5 },
    { label: 'Fast Charger 20W', watts: 20 },
    { label: 'Laptop Charger 65W', watts: 65 },
    { label: 'WiFi Router 12W', watts: 12 },
    { label: 'Television 80W', watts: 80 },
    { label: 'LED TV Large 120W', watts: 120 },
    { label: 'Rice Cooker 700W', watts: 700 },
    { label: 'Electric Kettle 1500W', watts: 1500 },
    { label: 'Flat Iron 1000W', watts: 1000 },
    { label: 'Refrigerator 150W', watts: 150 },
    { label: 'Washing Machine 500W', watts: 500 },
    { label: 'Water Dispenser 500W', watts: 500 },
    { label: 'Microwave Oven 1200W', watts: 1200 },
    { label: 'Air Fryer 1500W', watts: 1500 },
    { label: 'Blender 300W', watts: 300 },
    { label: 'Computer Desktop 250W', watts: 250 },
    { label: 'Printer 30W', watts: 30 },
    { label: 'Other Appliance', watts: 0, isOther: true },
  ],
};

/** Infer PWM-safe appliance type from category for hardware safety */
export function inferApplianceType(category: ApplianceCategory, presetLabel: string): 'resistive' | 'inductive' | 'switching' {
  if (category === 'lights') {
    // Only incandescent bulbs are resistive (PWM-safe)
    if (presetLabel.toLowerCase().includes('incandescent')) return 'resistive';
    return 'switching'; // LED/CFL are switching loads
  }
  if (category === 'fans') return 'inductive';
  return 'switching';
}
