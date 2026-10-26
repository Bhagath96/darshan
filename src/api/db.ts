import { createSeed } from './seed'
import { loadStoredUsers } from './userStore'

/**
 * In-memory "server" database. Lives only in this browser tab:
 * a full page reload re-seeds it. User accounts are the exception: they are
 * kept in localStorage (see userStore.ts) so sign-ups survive a reload.
 */
function createDb(now: Date) {
  const seed = createSeed(now)
  return {
    ...seed,
    users: loadStoredUsers() ?? seed.users,
    /** token → userId */
    sessions: new Map<string, string>(),
    /** idempotency key → first result */
    idempotency: new Map<string, unknown>(),
    counters: {
      order: 10_000 + seed.orders.length,
      booking: 1000 + seed.bookings.length,
      notice: 0,
    },
  }
}

export type Db = ReturnType<typeof createDb>

let db: Db | null = null

export function getDb(): Db {
  db ??= createDb(new Date())
  return db
}

/** Re-seeds all data. Used by tests, and relative to `now` so slots stay "upcoming". */
export function resetDb(now: Date = new Date()): Db {
  db = createDb(now)
  return db
}
