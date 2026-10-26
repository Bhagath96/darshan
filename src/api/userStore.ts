import type { StoredUser } from './seed'

/**
 * The mock server keeps user accounts in localStorage, so a devotee who signs up
 * can still log in after a page reload (bookings and orders, by design, reset).
 * This plays the part of the server's user table; the app's own state never reads it.
 */
const USERS_KEY = 'darsan:mock-server:users:v1'

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== 'object' || value === null) return false
  const u = value as Record<string, unknown>
  return (
    typeof u.id === 'string' &&
    typeof u.username === 'string' &&
    typeof u.password === 'string' &&
    typeof u.name === 'string' &&
    typeof u.phone === 'string' &&
    (u.role === 'DEVOTEE' || u.role === 'STAFF' || u.role === 'ADMIN') &&
    (u.templeId === null || typeof u.templeId === 'string')
  )
}

/** Saved accounts, or null if nothing valid is saved (then the seed accounts are used). */
export function loadStoredUsers(): StoredUser[] | null {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isStoredUser) ? parsed : null
  } catch {
    return null
  }
}

export function saveStoredUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // Storage blocked: accounts last until the tab is closed.
  }
}
