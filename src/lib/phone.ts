/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6–9. */
const INDIAN_MOBILE = /^(?:\+?91|0)?([6-9]\d{9})$/

/** Strips spaces and dashes, then returns the 10-digit number, or null if invalid. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s-]/g, '')
  const match = INDIAN_MOBILE.exec(compact)
  return match?.[1] ?? null
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null
}
