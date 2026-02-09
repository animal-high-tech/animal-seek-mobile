// Web implementation (browser geolocation).
const sessions = new Map(); // key: seekGroupId -> { watchId, startedAtMs }

export function isLocationSharingActive(seekGroupId) {
  return sessions.has(String(seekGroupId || ''));
}

export async function startLocationSharing(opts) {
  const seekGroupId = String(opts?.seekGroupId || '');
  if (!seekGroupId) throw new Error('Missing seekGroupId');
  if (sessions.has(seekGroupId)) return;

  const geo = globalThis?.navigator?.geolocation;
  if (!geo) throw new Error('Geolocation not available in this browser');

  const watchId = geo.watchPosition(
    async (pos) => {
      try {
        if (typeof opts?.onLocation === 'function') {
          await opts.onLocation(pos);
        }
      } catch {
        // ignore
      }
    },
    () => {
      // ignore errors; UI can re-start
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );

  sessions.set(seekGroupId, { watchId, startedAtMs: Date.now() });
}

export async function stopLocationSharing(seekGroupId) {
  const key = String(seekGroupId || '');
  const s = sessions.get(key);
  if (!s) return;
  try {
    globalThis?.navigator?.geolocation?.clearWatch?.(s.watchId);
  } finally {
    sessions.delete(key);
  }
}

