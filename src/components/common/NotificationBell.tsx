import { Bell } from 'lucide-react'
import { NavLink } from 'react-router'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import { selectUnreadNoticeCount } from '@/store/notices/noticesSlice'

/** Header link to the notifications page, with a count of notices the visitor hasn't seen yet. */
export function NotificationBell() {
  const { t } = useT()
  const unread = useAppSelector((s) => selectUnreadNoticeCount(s))
  const label = unread > 0 ? t('nav.notificationsNew', { count: unread }) : t('nav.notifications')

  return (
    <NavLink
      to="/notifications"
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'relative inline-flex size-11 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted',
          isActive && 'bg-secondary',
        )
      }
    >
      <Bell aria-hidden="true" className="size-5" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs leading-5 font-semibold text-primary-foreground tabular-nums"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  )
}
