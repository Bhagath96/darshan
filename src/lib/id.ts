/** Random unique id, used for idempotency keys and record ids. */
export function createId(prefix = ''): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return prefix ? `${prefix}_${raw}` : raw
}
