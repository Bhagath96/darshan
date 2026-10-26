/**
 * Field rules shared by the forms (zod) and the mock server, so both always agree.
 */

/** Letters (any script, incl. Malayalam), spaces, dots and apostrophes; 2–60 characters. */
export const NAME_PATTERN = /^[\p{L}\p{M} .']{2,60}$/u

/** 3–20 lowercase letters, digits or underscores. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export const PASSWORD_MIN_LENGTH = 8

/** At least 8 characters with at least one letter and one digit. */
export function isStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password)
}

export function isValidName(name: string): boolean {
  return NAME_PATTERN.test(name.trim())
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}
