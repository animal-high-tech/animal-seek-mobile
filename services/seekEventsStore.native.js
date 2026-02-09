import * as SQLite from 'expo-sqlite';

// Native (iOS/Android): real SQLite table.
const db = SQLite.openDatabaseSync('animalseek.db');

export function initSeekEventsStore() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seek_events (
      id TEXT PRIMARY KEY NOT NULL,
      seek_group_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      participant_name TEXT,
      icon_id TEXT,
      member_id TEXT,
      created_at_ms INTEGER NOT NULL,
      last_opened_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_seek_events_last_opened_at_ms ON seek_events(last_opened_at_ms DESC);
  `);

  // Simple, best-effort schema upgrades for existing installs.
  // (SQLite doesn't support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.)
  try {
    db.execSync(`ALTER TABLE seek_events ADD COLUMN member_id TEXT;`);
  } catch {
    // ignore if already exists
  }
}

export function getOrCreateDeviceUuid() {
  const row = db.getFirstSync(`SELECT value FROM kv WHERE key=?`, ['deviceUuid']);
  const existing = row?.value;
  if (existing) return existing;

  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  db.runSync(`INSERT INTO kv (key, value) VALUES (?, ?)`, ['deviceUuid', next]);
  return next;
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

  db.runSync(
    `INSERT INTO seek_events (id, seek_group_id, name, participant_name, icon_id, member_id, created_at_ms, last_opened_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(seek_group_id) DO UPDATE SET
       name=excluded.name,
       participant_name=excluded.participant_name,
       icon_id=excluded.icon_id,
       member_id=excluded.member_id,
       last_opened_at_ms=excluded.last_opened_at_ms`,
    [
      event.id,
      event.seekGroupId,
      event.name,
      event.participantName ?? null,
      event.iconId ?? null,
      event.memberId ?? null,
      event.createdAtMs,
      event.lastOpenedAtMs,
    ]
  );

  return event;
}

export function touchSeekEventByGroupId(seekGroupId) {
  db.runSync(`UPDATE seek_events SET last_opened_at_ms=? WHERE seek_group_id=?`, [Date.now(), seekGroupId]);
}

export function deleteSeekEventByGroupId(seekGroupId) {
  db.runSync(`DELETE FROM seek_events WHERE seek_group_id=?`, [seekGroupId]);
}

export function listSeekEvents(limit = 50) {
  const rows = db.getAllSync(
    `SELECT id, seek_group_id, name, participant_name, icon_id, member_id, created_at_ms, last_opened_at_ms
     FROM seek_events
     ORDER BY last_opened_at_ms DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    seekGroupId: r.seek_group_id,
    name: r.name,
    participantName: r.participant_name ?? undefined,
    iconId: r.icon_id ?? undefined,
    memberId: r.member_id ?? undefined,
    createdAtMs: r.created_at_ms,
    lastOpenedAtMs: r.last_opened_at_ms,
  }));
}

