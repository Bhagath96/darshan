import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ADMIN_NAV_ITEMS } from '@/components/admin/adminNav'
import { visibleNavItems } from '@/components/common/navItems'
import { LoadingState } from '@/components/common/states'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

/**
 * Admin portal frame: a side menu on desktop that becomes a scrollable row of tabs
 * on phones. Only shown to STAFF and ADMIN (the route is wrapped in RequireRole).
 */
export function AdminLayout() {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  const items = visibleNavItems(user, ADMIN_NAV_ITEMS)

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={t('admin.nav')} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 hidden text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
          {t('admin.title')}
        </p>
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {items.map((item) => (
            <li key={item.to} className="shrink-0">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center rounded-lg border border-transparent px-3 text-sm font-medium whitespace-nowrap hover:bg-secondary',
                    isActive ? 'border-border bg-card text-primary shadow-sm' : 'text-foreground',
                  )
                }
              >
                {t(item.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <Suspense fallback={<LoadingState rows={4} />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
