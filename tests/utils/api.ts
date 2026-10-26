import { vi } from 'vitest'
import { resetDb, setAuthToken } from '@/api'
import { getDb } from '@/api/db'
import { issueToken } from '@/api/session'

/** 12:00 noon IST on 26 Oct 2026. Morning slots have started, evening slots have not. */
export const NOON_IST = '2026-10-26T06:30:00.000Z'
export const TODAY = '2026-10-26'
export const TOMORROW = '2026-10-27'

/**
 * Freezes the clock (Date only; timers stay real so the mock API still answers)
 * and re-seeds the database relative to it.
 */
export function freezeTime(iso: string = NOON_IST): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
  resetDb(new Date(iso))
}

/** Calls the API as a demo user from now on. */
export function actAs(username: 'devotee' | 'lakshmi' | 'staff' | 'admin'): void {
  const user = getDb().users.find((u) => u.username === username)
  if (!user) throw new Error(`Unknown demo user ${username}`)
  setAuthToken(issueToken(user.id))
}

/** A promise you resolve or reject by hand, to control the order responses arrive in. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
