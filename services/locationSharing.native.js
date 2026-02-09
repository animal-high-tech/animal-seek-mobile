import * as Location from 'expo-location';

// In-memory session registry (per app launch)
const sessions = new Map(); // key: seekGroupId -> { subscription, startedAtMs }

export function isLocationSharingActive(seekGroupId) {
  return sessions.has(String(seekGroupId || ''));
}

export async function startLocationSharing(opts) {
  const seekGroupId = String(opts?.seekGroupId || '');
  if (!seekGroupId) throw new Error('Missing seekGroupId');

  if (sessions.has(seekGroupId)) return; // already running

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg?.granted) throw new Error('Location permission not granted');

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 8, // meters; emit when moved
      timeInterval: 3000, // ms; also allow periodic updates
      mayShowUserSettingsDialog: true,
    },
    async (pos) => {
      try {
        if (typeof opts?.onLocation === 'function') {
          await opts.onLocation(pos);
        }
      } catch {
        // swallow handler errors to keep watcher alive
      }
    }
  );

  sessions.set(seekGroupId, { subscription, startedAtMs: Date.now() });
}

export async function stopLocationSharing(seekGroupId) {
  const key = String(seekGroupId || '');
  const s = sessions.get(key);
  if (!s) return;
  try {
    s.subscription?.remove?.();
  } finally {
    sessions.delete(key);
  }
}

