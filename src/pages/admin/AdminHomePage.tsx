import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeading } from '@/components/common/PageTitle'
import { RoleBadge } from '@/components/common/UserMenu'
import { useTemples } from '@/hooks/useTemples'
import { useT, type MessageKey } from '@/i18n'
import { can, type Permission } from '@/lib/permissions'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

/** Permissions worth listing to staff, in a sensible order, with their description. */
const LISTED: ReadonlyArray<[Permission, MessageKey, string]> = [
  ['dashboard:view', 'admin.perm.dashboard:view', '/admin/dashboard'],
  ['booking:viewAny', 'admin.perm.booking:viewAny', '/admin/bookings'],
  ['order:viewAny', 'admin.perm.order:viewAny', '/admin/orders'],
  ['catalog:manage', 'admin.perm.catalog:manage', '/admin/slots'],
  ['catalog:manage', 'admin.perm.offerings', '/admin/rates'],
  ['notice:manage', 'admin.perm.notice:manage', '/admin/notices'],
  ['temple:manage', 'admin.perm.temple:manage', '/admin/temples'],
  ['user:manage', 'admin.perm.user:manage', '/admin/users'],
]

export function AdminHomePage() {
  const { t, pick } = useT()
  const user = useAppSelector(selectCurrentUser)
  const temples = useTemples()
  if (!user) return null
  const temple = temples.data.find((x) => x.id === user.templeId)

  return (
    <div className="space-y-6">
      <PageHeading title={t('admin.title')} />
      <section className="space-y-2 rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">{t('admin.welcome', { name: user.name })}</h2>
        <RoleBadge user={user} />
        <p className="text-muted-foreground">
          {user.templeId
            ? t('admin.scopeTemple', { temple: temple ? pick(temple.name) : user.templeId })
            : t('admin.scopeAll')}
        </p>
      </section>
      <section aria-labelledby="admin-access" className="space-y-3 rounded-xl border bg-card p-5">
        <h2 id="admin-access" className="text-xl font-semibold text-primary">
          {t('admin.yourAccess')}
        </h2>
        <ul className="space-y-2">
          {LISTED.filter(([p]) => can(user.role, p)).map(([, label, to]) => (
            <li key={to} className="flex items-start gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              <Link to={to} className="text-primary underline-offset-4 hover:underline">
                {t(label)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
