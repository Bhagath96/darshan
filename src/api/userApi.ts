import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser, toAuthUser } from './session'
import type { StoredUser } from './seed'
import { persistUsers, requireTemple, validName, validPhone } from './validate'
import { USER_ROLES } from '@/lib/constants'
import { isStrongPassword, isValidUsername, PASSWORD_MIN_LENGTH } from '@/lib/validators'
import type { AuthUser, UserInput, UserQuery } from '@/types'

/** Admin: user accounts. Admins first, then staff, then devotees; by name within each. */
export function getUsers(query: UserQuery = {}): Promise<AuthUser[]> {
  return simulate('auth', () => {
    requireUser('user:manage')
    const q = query.q?.trim().toLowerCase() ?? ''
    const digits = q.replace(/\D/g, '')
    return getDb()
      .users.filter(
        (u) =>
          (!query.role || u.role === query.role) &&
          (!q ||
            u.name.toLowerCase().includes(q) ||
            u.username.includes(q) ||
            (digits.length > 0 && u.phone.includes(digits))),
      )
      .sort(
        (a, b) =>
          USER_ROLES.indexOf(a.role) - USER_ROLES.indexOf(b.role) || a.name.localeCompare(b.name),
      )
      .map(toAuthUser)
  })
}

/** Checks the fields every account needs. `self` is the account being edited, if any. */
function cleanUser(input: UserInput, self: StoredUser | null): Omit<StoredUser, 'id' | 'password'> {
  const db = getDb()
  const name = validName(input.name, 'the name')
  const phone = validPhone(input.phone)
  const username = input.username.trim().toLowerCase()
  if (!isValidUsername(username)) {
    throw new ApiError(
      'VALIDATION',
      'Username must be 3–20 lowercase letters, digits or underscores.',
    )
  }
  if (!(USER_ROLES as readonly string[]).includes(input.role))
    throw new ApiError('VALIDATION', 'Please choose a role.')
  let templeId: string | null = null
  if (input.role === 'STAFF') {
    if (!input.templeId)
      throw new ApiError('VALIDATION', 'Please choose the temple this staff member works at.')
    requireTemple(input.templeId)
    templeId = input.templeId
  }
  const others = db.users.filter((u) => u.id !== self?.id)
  if (others.some((u) => u.username === username))
    throw new ApiError('CONFLICT', 'This username is already taken. Please choose another.')
  if (others.some((u) => u.phone === phone))
    throw new ApiError('CONFLICT', 'Another account already uses this mobile number.')
  return { name, phone, username, role: input.role, templeId }
}

function checkPassword(password: string): string {
  if (!isStrongPassword(password)) {
    throw new ApiError(
      'VALIDATION',
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number.`,
    )
  }
  return password
}

const adminCount = () => getDb().users.filter((u) => u.role === 'ADMIN').length

/** Admin: creates an account of any role, e.g. a new staff member for a temple. */
export function createUser(input: UserInput): Promise<AuthUser> {
  return simulate('auth', () => {
    requireUser('user:manage')
    const db = getDb()
    const clean = cleanUser(input, null)
    const user: StoredUser = {
      id: `u-${Date.now().toString(36)}-${db.users.length + 1}`,
      ...clean,
      password: checkPassword(input.password),
    }
    db.users.push(user)
    persistUsers()
    return toAuthUser(user)
  })
}

/**
 * Admin: changes an account. A non-empty password replaces the old one.
 * You can't change your own role, and there must always be at least one admin.
 */
export function updateUser(userId: string, input: UserInput): Promise<AuthUser> {
  return simulate('auth', () => {
    const me = requireUser('user:manage')
    const user = getDb().users.find((u) => u.id === userId)
    if (!user) throw new ApiError('NOT_FOUND', 'This account no longer exists.')
    const clean = cleanUser(input, user)
    if (user.id === me.id && clean.role !== user.role)
      throw new ApiError('CONFLICT', 'You cannot change your own role.')
    if (user.role === 'ADMIN' && clean.role !== 'ADMIN' && adminCount() === 1)
      throw new ApiError('CONFLICT', 'This is the only admin account, so it must stay an admin.')
    const password = input.password ? checkPassword(input.password) : user.password
    Object.assign(user, clean, { password })
    persistUsers()
    return toAuthUser(user)
  })
}

/** Admin: deletes an account. Its bookings and orders stay. You can't delete yourself. */
export function deleteUser(userId: string): Promise<void> {
  return simulate('auth', () => {
    const me = requireUser('user:manage')
    const db = getDb()
    const user = db.users.find((u) => u.id === userId)
    if (!user) return
    if (user.id === me.id) throw new ApiError('CONFLICT', 'You cannot delete your own account.')
    if (user.role === 'ADMIN' && adminCount() === 1)
      throw new ApiError('CONFLICT', 'This is the only admin account, so it cannot be deleted.')
    db.users = db.users.filter((u) => u.id !== userId)
    persistUsers()
  })
}
