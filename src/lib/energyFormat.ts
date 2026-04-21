/**
 * Format an energy value (in kWh) into a human-friendly string.
 * - Values below 1 kWh are shown in Wh (whole numbers).
 * - Values >= 1 kWh are shown in kWh (2 decimals).
 *
 * Examples:
 *   formatEnergy(0.045)  -> "45 Wh"
 *   formatEnergy(0.999)  -> "999 Wh"
 *   formatEnergy(1.02)   -> "1.02 kWh"
 *   formatEnergy(2.4567) -> "2.46 kWh"
 *   formatEnergy(0)      -> "0 Wh"
 */
export function formatEnergy(kwh: number | null | undefined): string {
  const value = typeof kwh === 'number' && isFinite(kwh) ? kwh : 0;
  const wh = value * 1000;
  if (Math.abs(wh) < 1000) {
    return `${Math.round(wh)} Wh`;
  }
  return `${value.toFixed(2)} kWh`;
}
