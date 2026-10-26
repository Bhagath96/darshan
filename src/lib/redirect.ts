import type { AuthUser, LoginPortal } from '@/types'

/** Login page for each kind of account. */
export const PORTAL_LOGIN_PATH: Record<LoginPortal, string> = {
  devotee: '/login',
  staff: '/admin/login',
}

/**
 * Returns `target` only if it is a path on this site, else `fallback`.
 * Blocks open redirects such as "//evil.com", "/\evil.com" or "https://evil.com".
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback
  return target
}

/** Where a user lands after logging in when no ?redirect was given. */
export function homeFor(user: AuthUser): string {
  return user.role === 'DEVOTEE' ? '/' : '/admin'
}
