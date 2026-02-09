import { Platform } from 'react-native';

// Stable per-device UUID for “occupy” semantics.
// - Web: localStorage
// - Native: stored in the same expo-sqlite DB as seek events

const STORAGE_KEY = 'animalseek.deviceUuid.v1';

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getDeviceUuid() {
  if (Platform.OS === 'web') {
    try {
      const existing = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (existing) return existing;
      const next = randomId();
      globalThis.localStorage?.setItem(STORAGE_KEY, next);
      return next;
    } catch {
      return randomId();
    }
  }

  // Native: store in SQLite via seekEventsStore.native.js (shared DB)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const native = require('./seekEventsStore.native');
  if (typeof native.getOrCreateDeviceUuid === 'function') {
    return native.getOrCreateDeviceUuid();
  }
  return randomId();
}

