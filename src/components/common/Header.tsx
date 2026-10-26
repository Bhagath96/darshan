import { useState } from 'react'
import { LogIn, LogOut, Menu } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { LanguageToggle } from './LanguageToggle'
import { visibleNavItems, type NavItem } from './navItems'
import { CartButton } from './CartButton'
import { NotificationBell } from './NotificationBell'
import { RoleBadge, UserMenu } from './UserMenu'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLogout } from '@/hooks/useLogout'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary',
    isActive && 'bg-secondary text-secondary-foreground',
  )

/** "Log in" link that brings the visitor back to this page afterwards. */
function LoginLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  const { t } = useT()
  const { pathname, search } = useLocation()
  const here = pathname + search
  const to =
    pathname === '/login' || here === '/' ? '/login' : `/login?redirect=${encodeURIComponent(here)}`
  return (
    <Link to={to} onClick={onClick} className={cn(buttonVariants(), 'h-11 px-4', className)}>
      <LogIn aria-hidden="true" />
      {t('nav.login')}
    </Link>
  )
}

function NavLinks({
  items,
  onNavigate,
  className,
}: {
  items: NavItem[]
  onNavigate?: () => void
  className?: string
}) {
  const { t } = useT()
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
            {t(item.label)}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Phone-width menu: links, language and account in a side sheet. */
function MobileMenu({ items }: { items: NavItem[] }) {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 lg:hidden"
          aria-label={t('nav.openMenu')}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={t('common.close')}
        className="w-72 gap-0 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{t('nav.menuTitle')}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('nav.main')} className="px-4">
          <NavLinks items={items} onNavigate={close} className="flex flex-col gap-1" />
        </nav>
        <div className="mt-4 space-y-3 border-t px-4 pt-4 pb-6">
          <LanguageToggle className="h-11 w-full justify-start px-3" />
          {user ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium">{user.name}</p>
                <RoleBadge user={user} />
              </div>
              <NavLink to="/darshan/my-bookings" className={linkClass} onClick={close}>
                {t('nav.myBookings')}
              </NavLink>
              <NavLink to="/vazhipadu/my-orders" className={linkClass} onClick={close}>
                {t('nav.myOrders')}
              </NavLink>
              <NavLink to="/account" className={linkClass} onClick={close}>
                {t('nav.account')}
              </NavLink>
              <Button
                variant="outline"
                className="h-11 w-full justify-start px-3"
                onClick={() => {
                  close()
                  void logout()
                }}
              >
                <LogOut aria-hidden="true" />
                {t('user.logout')}
              </Button>
            </div>
          ) : (
            <LoginLink className="w-full" onClick={close} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function Header() {
  const { t } = useT()
  const user = useAppSelector(selectCurrentUser)
  const items = visibleNavItems(user)

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 lg:gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-md py-1">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-heading text-lg text-primary-foreground"
          >
            ॐ
          </span>
          <span className="min-w-0">
            <span className="block font-heading text-lg leading-tight font-semibold text-primary">
              {t('app.name')}
            </span>
            <span className="hidden text-xs text-muted-foreground lg:block">
              {t('app.tagline')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('nav.main')} className="ms-4 hidden lg:block">
          <NavLinks items={items} className="flex items-center gap-1" />
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <CartButton />
          <NotificationBell />
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageToggle />
            {user ? <UserMenu user={user} /> : <LoginLink />}
          </div>
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  )
}
