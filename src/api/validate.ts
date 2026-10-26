import { ApiError } from './errors'
import { getDb } from './db'
import type { StoredUser } from './seed'
import { saveStoredUsers } from './userStore'
import { normalizePhone } from '@/lib/phone'
import { isValidName } from '@/lib/validators'
import type { Localized } from '@/types'

/** Input checks shared by the mock API functions. Each throws a VALIDATION error. */

export function validName(name: string, who = 'your name'): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!isValidName(trimmed))
    throw new ApiError('VALIDATION', `Please enter ${who} (letters only, 2–60 characters).`)
  return trimmed
}

export function validPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new ApiError('VALIDATION', 'Please enter a valid 10-digit mobile number.')
  return normalized
}

/** Both languages filled in, trimmed, and within `max` characters. */
export function cleanLocalized(text: Localized, max: number, what: string): Localized {
  const en = text.en.trim()
  const ml = text.ml.trim()
  if (!en || !ml)
    throw new ApiError('VALIDATION', `Please enter the ${what} in English and Malayalam.`)
  if (en.length > max || ml.length > max)
    throw new ApiError('VALIDATION', `The ${what} can be at most ${max} characters.`)
  return { en, ml }
}

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function validTime(time: string): string {
  if (!TIME_PATTERN.test(time)) throw new ApiError('VALIDATION', 'Please enter a time as HH:mm.')
  return time
}

export function validWholeNumber(value: number, min: number, max: number, what: string): number {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new ApiError('VALIDATION', `${what} must be a whole number from ${min} to ${max}.`)
  return value
}

export function requireTemple(templeId: string): void {
  if (!getDb().temples.some((t) => t.id === templeId))
    throw new ApiError('NOT_FOUND', 'Temple not found.')
}

/** Staff may only manage their own temple; admins (templeId null) may manage any. */
export function assertTempleScope(
  user: StoredUser,
  templeId: string | null,
  message = 'You can only manage your own temple.',
): void {
  if (user.templeId !== null && templeId !== user.templeId) {
    throw new ApiError('FORBIDDEN', message)
  }
}

/** URL-safe id part from English text, e.g. "Sree Krishna Temple" → "sree-krishna-temple". */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item'
  )
}

/** `base`, or `base-2`, `base-3`… whichever is not taken yet. */
export function uniqueId(base: string, taken: (id: string) => boolean): string {
  if (!taken(base)) return base
  let n = 2
  while (taken(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** Saves the user table (the only data that survives a page reload). */
export function persistUsers(): void {
  saveStoredUsers(getDb().users)
}
