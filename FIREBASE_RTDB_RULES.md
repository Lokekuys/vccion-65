# Recommended Firebase Realtime Database Rules

Apply these rules in the **Firebase Console → Realtime Database → Rules** to prevent ESP32 devices from overwriting claimed device metadata on reconnect.

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "name": {
          ".read": true,
          ".write": "!data.parent().child('isClaimed').val()"
        },
        "location": {
          ".read": true,
          ".write": "!data.parent().child('isClaimed').val()"
        },
        "isClaimed": {
          ".read": true,
          ".write": "!data.val() || auth != null"
        },
        "classification": {
          ".read": true,
          ".write": "!data.parent().child('isClaimed').val()"
        },
        "$other": {
          ".read": true,
          ".write": true
        }
      }
    },
    "OccupancyPlug": {
      ".read": true,
      ".write": true
    },
    "settings": {
      ".read": true,
      ".write": true
    }
  }
}
```

## What This Does

- **`name`, `location`, `classification`** — Only writable when `isClaimed` is `false`. Once a device is claimed by a user, the ESP32 cannot overwrite these fields on reconnect.
- **`isClaimed`** — Can only be set to `false` freely; setting to `true` requires authentication (prevents accidental claiming by the ESP).
- **`$other`** (all other fields like `lastSeen`, `relayState`, `brightness`, etc.) — Always writable, so the ESP can continue updating telemetry and status.

## Frontend Fallback

Even without these rules, the frontend (`useDevices.ts`) has a defensive check: if a claimed device's `name` looks like a raw serial (starts with "plug" or matches the device ID), it falls back to a safe display name like `"{Location} Plug"` or `"Smart Plug"`.
