

## Problem

When an ESP32 smart plug reconnects after power loss, it writes its device record to Firebase — overwriting the `name` field with its hardware serial (e.g., `plugserial#`). The web app then displays this raw serial instead of the user's custom name. Additionally, unclaimed devices show raw IDs as fallback names instead of clean "Plug1, Plug2" labels.

## Root Cause

The ESP32 firmware writes `name: "<serial>"` to its Firebase device path on every boot/reconnect, overwriting whatever the user saved. The frontend has no protection against this — it simply reads `d.name` from Firebase.

Since the ESP firmware is outside this codebase, the fix must be applied **on the frontend/Firebase side**: use Firebase Security Rules and frontend merge logic to protect claimed device metadata.

## Plan

### 1. Add Firestore Rules to protect claimed device fields

Update `firestore.rules` (or Firebase RTDB rules in the Firebase console) to prevent writes to `name`, `location`, `isClaimed`, `classification` fields when `isClaimed === true`. This is the strongest protection — the ESP simply won't be able to overwrite these fields.

> **Note:** Since this project uses Firebase RTDB (not Firestore), the rules must be set in the Realtime Database rules. However, RTDB rules are typically managed in the Firebase console, not in local files. We'll document the recommended rules.

### 2. Frontend: Add reconnect-safe merge in `useDevices.ts`

In the Firebase `onValue` listener (line 97–168), when building the device list, check if the device has a `name` that looks like a raw serial/ID. If `isClaimed === true` and we have a previously known custom name, prefer the custom name. This is a defensive fallback in case RTDB rules aren't set.

### 3. Scanner: Use "Plug#" fallback for unclaimed devices

In `AddDeviceScanner.tsx` line 82, replace `d.name || id` with a clean numbering scheme:
- If `d.name` exists and is not equal to the device ID → use `d.name`
- Otherwise → generate `Plug1`, `Plug2`, etc. based on index

### 4. Scanner: Skip already-claimed devices entirely

The scanner already filters `isClaimed !== true` (line 77). Add an additional safeguard: if a device's `isClaimed` field gets momentarily cleared during ESP reconnect, check `isRegistered` as a secondary guard — skip devices where `isRegistered === true`.

### Files Changed

- **`src/components/AddDeviceScanner.tsx`** — Use "Plug#" fallback naming for unclaimed devices; add `isRegistered` guard to exclude reconnecting claimed devices from scan results
- **`src/hooks/useDevices.ts`** — No changes needed (already reads `name` from Firebase and only shows claimed devices)
- **README or inline comment** — Document recommended RTDB security rules to prevent ESP from overwriting claimed device metadata

### Recommended Firebase RTDB Rules (to apply in Firebase Console)

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "name": { ".write": "!data.parent().child('isClaimed').val()" },
        "location": { ".write": "!data.parent().child('isClaimed').val()" },
        "isClaimed": { ".write": "!data.val() || auth != null" },
        "classification": { ".write": "!data.parent().child('isClaimed').val()" },
        "$other": { ".write": true }
      }
    }
  }
}
```

This prevents the ESP from overwriting `name`, `location`, and `classification` once `isClaimed` is `true`, while still allowing it to update `lastSeen`, `relayState`, and telemetry fields.

