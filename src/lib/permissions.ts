import type { UserRole } from '@/types'

/**
 * Every action the app guards. One list for the UI, the route guards and the mock server.
 * Staff have the same management rights as admins, but the server limits them to their
 * own temple. Temples, user accounts and the dashboard are for admins only.
 */
export type Permission =
  | 'admin:access'
  | 'booking:create'
  | 'booking:viewOwn'
  | 'booking:viewAny'
  | 'booking:cancelOwn'
  | 'booking:cancelAny'
  /** Edit and delete any booking (staff: their temple only). */
  | 'booking:manage'
  | 'order:create'
  | 'order:viewAny'
  | 'order:cancelAny'
  /** Edit and delete any order (staff: their temple only). */
  | 'order:manage'
  /** Add, edit and delete darshan slots and offerings (staff: their temple only). */
  | 'catalog:manage'
  | 'dashboard:view'
  | 'notice:manage'
  /** Add, edit and delete temples. */
  | 'temple:manage'
  /** Create, edit and delete user accounts, including staff. */
  | 'user:manage'

const STAFF_PERMISSIONS: readonly Permission[] = [
  'admin:access',
  'booking:create',
  'booking:viewOwn',
  'booking:viewAny',
  'booking:cancelOwn',
  'booking:cancelAny',
  'booking:manage',
  'order:create',
  'order:viewAny',
  'order:cancelAny',
  'order:manage',
  'catalog:manage',
  'notice:manage',
]

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  DEVOTEE: ['booking:create', 'booking:viewOwn', 'booking:cancelOwn', 'order:create'],
  STAFF: STAFF_PERMISSIONS,
  ADMIN: [...STAFF_PERMISSIONS, 'dashboard:view', 'temple:manage', 'user:manage'],
}

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false
}
