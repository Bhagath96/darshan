import { lazy, type ComponentType } from 'react'

/**
 * Pages outside the public website load on demand, so a first visit downloads only
 * the website. `pick` turns a named export into the default export React.lazy expects.
 */
const pick =
  <K extends string>(name: K) =>
  (module: Record<K, ComponentType>) => ({ default: module[name] })

export const DarshanPage = lazy(() =>
  import('@/pages/darshan/DarshanPage').then(pick('DarshanPage')),
)
export const MyBookingsPage = lazy(() =>
  import('@/pages/darshan/MyBookingsPage').then(pick('MyBookingsPage')),
)
export const VazhipaduPage = lazy(() =>
  import('@/pages/vazhipadu/VazhipaduPage').then(pick('VazhipaduPage')),
)
export const CheckoutPage = lazy(() =>
  import('@/pages/vazhipadu/CheckoutPage').then(pick('CheckoutPage')),
)
export const ReceiptPage = lazy(() =>
  import('@/pages/vazhipadu/ReceiptPage').then(pick('ReceiptPage')),
)
export const MyOrdersPage = lazy(() =>
  import('@/pages/vazhipadu/MyOrdersPage').then(pick('MyOrdersPage')),
)
export const LoginPage = lazy(() => import('@/pages/LoginPage').then(pick('LoginPage')))
export const StaffLoginPage = lazy(() => import('@/pages/LoginPage').then(pick('StaffLoginPage')))
export const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(pick('RegisterPage')))
export const AccountPage = lazy(() => import('@/pages/AccountPage').then(pick('AccountPage')))
export const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then(pick('AdminLayout')))
export const AdminHomePage = lazy(() =>
  import('@/pages/admin/AdminHomePage').then(pick('AdminHomePage')),
)
export const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then(pick('AdminDashboardPage')),
)
export const AdminBookingsPage = lazy(() =>
  import('@/pages/admin/AdminBookingsPage').then(pick('AdminBookingsPage')),
)
export const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then(pick('AdminOrdersPage')),
)
export const AdminSlotsPage = lazy(() =>
  import('@/pages/admin/AdminSlotsPage').then(pick('AdminSlotsPage')),
)
export const AdminRatesPage = lazy(() =>
  import('@/pages/admin/AdminRatesPage').then(pick('AdminRatesPage')),
)
export const AdminNoticesPage = lazy(() =>
  import('@/pages/admin/AdminNoticesPage').then(pick('AdminNoticesPage')),
)
