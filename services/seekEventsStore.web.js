// Web: persist to localStorage (avoids expo-sqlite wasm/worker issues).
const STORAGE_KEY = 'animalseek.events.v1';

export function initSeekEventsStore() {
  // no-op on web
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(events) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

export function upsertSeekEvent(input) {
  const now = Date.now();
  const event = {
    id: input.id ?? randomId(),
    seekGroupId: input.seekGroupId,
    name: input.name,
    participantName: input.participantName,
    iconId: input.iconId,
    memberId: input.memberId,
    createdAtMs: input.createdAtMs ?? now,
    lastOpenedAtMs: input.lastOpenedAtMs ?? now,
  };

  const events = readAll();
  const idx = events.findIndex((e) => e.seekGroupId === event.seekGroupId);
  if (idx >= 0) events[idx] = { ...events[idx], ...event };
  else events.unshift(event);

  writeAll(events.slice(0, 500));
  return event;
}

export function touchSeekEventByGroupId(seekGroupId) {
  const events = readAll();
  const idx = events.findIndex((e) => e.seekGroupId === seekGroupId);
  if (idx < 0) return;
  events[idx] = { ...events[idx], lastOpenedAtMs: Date.now() };
  events.sort((a, b) => b.lastOpenedAtMs - a.lastOpenedAtMs);
  writeAll(events);
}

export function deleteSeekEventByGroupId(seekGroupId) {
  const events = readAll().filter((e) => e.seekGroupId !== seekGroupId);
  writeAll(events);
}

export function listSeekEvents(limit = 50) {
  const events = readAll();
  events.sort((a, b) => b.lastOpenedAtMs - a.lastOpenedAtMs);
  return events.slice(0, limit);
}

