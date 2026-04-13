

## Plan: Remove "controls disabled" from Offline Banner

### What
In the DeviceDetailPanel's offline banner, keep only "Device is offline" and remove the "— controls disabled" suffix.

### How
**File: `src/components/DeviceDetailPanel.tsx`**

Line 173 currently shows:
```tsx
<span>Device is offline — controls disabled</span>
```

Change to:
```tsx
<span>Device is offline</span>
```

This is a single line text change.

### Files Modified
- `src/components/DeviceDetailPanel.tsx` — 1 line text update (line 173)

