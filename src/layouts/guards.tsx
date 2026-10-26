import { Navigate, Outlet, useLocation } from 'react-router'
import { can, type Permission } from '@/lib/permissions'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'
import type { UserRole } from '@/types'

/** Path + query of the current page, ready for ?redirect=. */
function useHere(): string {
  const { pathname, search } = useLocation()
  return encodeURIComponent(pathname + search)
}

/**
 * Children render only for logged-in users. Guests go to the login page and come back
 * afterwards. The mock API checks the token too, so this is about UX, not security.
 */
export function RequireAuth({ loginPath = '/login' }: { loginPath?: string }) {
  const user = useAppSelector(selectCurrentUser)
  const here = useHere()
  if (!user) return <Navigate to={`${loginPath}?redirect=${here}`} replace />
  return <Outlet />
}

/**
 * Children render only for the given roles. Guests go to the staff login;
 * logged-in users with another role get the 403 page.
 */
export function RequireRole({
  roles,
  loginPath = '/admin/login',
}: {
  roles: UserRole[]
  loginPath?: string
}) {
  const user = useAppSelector(selectCurrentUser)
  const here = useHere()
  if (!user) return <Navigate to={`${loginPath}?redirect=${here}`} replace />
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />
  return <Outlet />
}

/** Children render only for users with this permission (use inside RequireRole/RequireAuth). */
export function RequirePermission({ permission }: { permission: Permission }) {
  const user = useAppSelector(selectCurrentUser)
  if (!can(user?.role, permission)) return <Navigate to="/403" replace />
  return <Outlet />
}
