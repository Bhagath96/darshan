import type { NavItem } from '@/components/common/navItems'

/** Admin portal menu, filtered by permission: staff see bookings, orders and notices. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'admin.home', end: true, permission: 'admin:access' },
  { to: '/admin/dashboard', label: 'admin.navDashboard', permission: 'dashboard:view' },
  { to: '/admin/bookings', label: 'admin.navBookings', permission: 'booking:viewAny' },
  { to: '/admin/orders', label: 'admin.navOrders', permission: 'order:viewAny' },
  { to: '/admin/slots', label: 'admin.navSlots', permission: 'catalog:manage' },
  { to: '/admin/rates', label: 'admin.navRates', permission: 'catalog:manage' },
  { to: '/admin/notices', label: 'admin.navNotices', permission: 'notice:manage' },
]
