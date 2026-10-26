import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { issueToken, requireUser, toAuthUser, userFromToken } from './session'
import type { StoredUser } from './seed'
import { persistUsers, validName, validPhone } from './validate'
import { isStrongPassword, isValidUsername, PASSWORD_MIN_LENGTH } from '@/lib/validators'
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdate,
  RegisterRequest,
  Session,
} from '@/types'

const WRONG_PORTAL: Record<LoginRequest['portal'], string> = {
  devotee: 'This is the devotee login. Temple staff and admins, please use the staff login.',
  staff: 'This login is for temple staff only. Devotees, please use the devotee login.',
}

const fitsPortal = (user: StoredUser, portal: LoginRequest['portal']) =>
  portal === 'staff' ? user.role !== 'DEVOTEE' : user.role === 'DEVOTEE'

/** Checks the password, then the portal. A wrong password never reveals the account type. */
export function login({ username, password, portal }: LoginRequest): Promise<Session> {
  return simulate('auth', () => {
    const user = getDb().users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
    )
    // Same message for unknown user and wrong password, so usernames can't be guessed.
    if (!user) throw new ApiError('UNAUTHORIZED', 'Incorrect username or password.')
    if (!fitsPortal(user, portal)) throw new ApiError('FORBIDDEN', WRONG_PORTAL[portal])
    return { token: issueToken(user.id), user: toAuthUser(user) }
  })
}

/** Restores the user behind a saved token, e.g. after a page refresh. */
export function me(token: string): Promise<AuthUser> {
  return simulate('auth', () => {
    const user = userFromToken(token)
    if (!user) throw new ApiError('UNAUTHORIZED', 'Your session has expired. Please log in again.')
    return toAuthUser(user)
  })
}

/** Creates a devotee account and logs it in. Staff and admin accounts are not self-service. */
export function register(request: RegisterRequest): Promise<Session> {
  return simulate('auth', () => {
    const db = getDb()
    const name = validName(request.name)
    const phone = validPhone(request.phone)
    const username = request.username.trim().toLowerCase()
    if (!isValidUsername(username)) {
      throw new ApiError(
        'VALIDATION',
        'Username must be 3–20 lowercase letters, digits or underscores.',
      )
    }
    if (!isStrongPassword(request.password)) {
      throw new ApiError(
        'VALIDATION',
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number.`,
      )
    }
    if (db.users.some((u) => u.username === username)) {
      throw new ApiError('CONFLICT', 'This username is already taken. Please choose another.')
    }
    if (db.users.some((u) => u.phone === phone)) {
      throw new ApiError(
        'CONFLICT',
        'An account with this mobile number already exists. Please log in instead.',
      )
    }

    const user: StoredUser = {
      id: `u-${Date.now().toString(36)}-${db.users.length + 1}`,
      username,
      password: request.password,
      name,
      phone,
      role: 'DEVOTEE',
      templeId: null,
    }
    db.users.push(user)
    persistUsers()
    return { token: issueToken(user.id), user: toAuthUser(user) }
  })
}

/** Updates the logged-in user's name and mobile number. */
export function updateProfile(update: ProfileUpdate): Promise<AuthUser> {
  return simulate('auth', () => {
    const user = requireUser()
    const name = validName(update.name)
    const phone = validPhone(update.phone)
    if (getDb().users.some((u) => u.id !== user.id && u.phone === phone)) {
      throw new ApiError('CONFLICT', 'Another account already uses this mobile number.')
    }
    user.name = name
    user.phone = phone
    persistUsers()
    return toAuthUser(user)
  })
}

export function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordRequest): Promise<void> {
  return simulate('auth', () => {
    const user = requireUser()
    if (user.password !== currentPassword)
      throw new ApiError('VALIDATION', 'Your current password is not correct.')
    if (!isStrongPassword(newPassword)) {
      throw new ApiError(
        'VALIDATION',
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number.`,
      )
    }
    if (newPassword === currentPassword) {
      throw new ApiError('VALIDATION', 'The new password must be different from the current one.')
    }
    user.password = newPassword
    persistUsers()
  })
}
