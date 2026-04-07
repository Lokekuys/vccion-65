## Plan: Professional Messaging Updates for Add Device Flow & Device Cards

### Changes Overview

**1. AddDeviceScanner — Configure Step (Professional Messaging)**

- Rename "Location" field to "Description (optional)", placeholder "Bedroom", make it optional
- Add a professional tip below the description field: "You may provide a description or room to help identify your device, or leave it blank."
- Remove `location.trim()` from the `canSubmit` validation so description is truly optional
- Update `handleClaim` to allow empty location
- Update success toast to: "Your device has been successfully added."

**2. DeviceCard — Professional Tooltips & Labels**

- Add a tooltip to `OnDurationDisplay` on the card: "Shows the total runtime of the device. If the device is offline, the timer is paused until it reconnects."
- Add a tooltip to the power/wattage area: "Automatically read from the device (no manual input needed)."
- Update offline status text to: "Device is currently offline."

### Technical Details

**Files modified:**

- `src/components/AddDeviceScanner.tsx` — Update configure step titles, placeholders, labels, validation, and toast message
- `src/components/DeviceCard.tsx` — Add `Tooltip` wrappers around On Duration, wattage display, and offline status text
- `src/components/SensorDisplay.tsx` — No changes needed (labels already clean)

**Validation change:** `canSubmit` currently requires `location.trim()`. Will change to allow empty location since the field becomes optional. The `handleClaim` guard at line 182 also checks `!location.trim()` — will remove that condition.

**Tooltip implementation:** Will use the existing `@/components/ui/tooltip` (Tooltip, TooltipTrigger, TooltipContent, TooltipProvider) already available in the project.