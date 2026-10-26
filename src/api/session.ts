import { ApiError } from './errors'
import { getDb } from './db'
import type { StoredUser } from './seed'
import { can, type Permission } from '@/lib/permissions'
import type { AuthUser } from '@/types'

/**
 * Plays the role of an `Authorization` header: the client sets the token once after login,
 * and every "server" function reads it to find the current user.
 *
 * Tokens are stateless (like a JWT), so a session still works after the in-memory DB
 * is re-seeded by a page reload.
 */

const TOKEN_PREFIX = 'mock.'
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function issueToken(userId: string, now = Date.now()): string {
  return TOKEN_PREFIX + btoa(JSON.stringify({ sub: userId, exp: now + TOKEN_TTL_MS }))
}

function readToken(token: string): { sub: string; exp: number } | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null
  try {
    const payload: unknown = JSON.parse(atob(token.slice(TOKEN_PREFIX.length)))
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'sub' in payload &&
      'exp' in payload &&
      typeof payload.sub === 'string' &&
      typeof payload.exp === 'number'
    ) {
      return { sub: payload.sub, exp: payload.exp }
    }
  } catch {
    // fall through: malformed token
  }
  return null
}

export function userFromToken(token: string | null): StoredUser | null {
  if (!token) return null
  const payload = readToken(token)
  if (!payload || payload.exp < Date.now()) return null
  return getDb().users.find((u) => u.id === payload.sub) ?? null
}

/** Server-side guard: throws UNAUTHORIZED / FORBIDDEN like a real API would. */
export function requireUser(permission?: Permission): StoredUser {
  const user = userFromToken(authToken)
  if (!user) throw new ApiError('UNAUTHORIZED', 'Please log in to continue.')
  if (permission && !can(user.role, permission)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do this.')
  }
  return user
}

export function toAuthUser({ password: _password, ...user }: StoredUser): AuthUser {
  return user
}
