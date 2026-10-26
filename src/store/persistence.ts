/**
 * Safe localStorage helpers. Storage can be missing, full or blocked (private mode),
 * and saved JSON can be stale or hand-edited, so every read is validated.
 */

export const STORAGE_KEYS = {
  language: 'darsan:lang:v1',
  session: 'darsan:session:v1',
  cart: 'darsan:cart:v1',
  noticesSeen: 'darsan:notices-seen:v1',
} as const

export function loadJson<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return undefined
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the app still works, it just won't remember.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
