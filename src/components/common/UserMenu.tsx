import { CalendarCheck, LayoutDashboard, LogOut, ReceiptText, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/hooks/useLogout'
import { useT } from '@/i18n'
import { can } from '@/lib/permissions'
import type { AuthUser } from '@/types'

export function RoleBadge({ user }: { user: AuthUser }) {
  const { t } = useT()
  return (
    <Badge variant={user.role === 'DEVOTEE' ? 'secondary' : 'default'}>
      {t(`role.${user.role}`)}
    </Badge>
  )
}

/** Account button with name, role and "Log out" (desktop header). */
export function UserMenu({ user }: { user: AuthUser }) {
  const { t } = useT()
  const logout = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-11 max-w-48 gap-2 px-3"
          aria-label={t('user.menu', { name: user.name })}
        >
          <UserRound aria-hidden="true" />
          <span className="truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="space-y-1">
          <span className="block font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.phone}</span>
          <RoleBadge user={user} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/darshan/my-bookings">
            <CalendarCheck aria-hidden="true" />
            {t('nav.myBookings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/vazhipadu/my-orders">
            <ReceiptText aria-hidden="true" />
            {t('nav.myOrders')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserRound aria-hidden="true" />
            {t('nav.account')}
          </Link>
        </DropdownMenuItem>
        {can(user.role, 'admin:access') && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <LayoutDashboard aria-hidden="true" />
              {t('nav.admin')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut aria-hidden="true" />
          {t('user.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
