import type { RouteObject } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { RequireAuth, RequirePermission, RequireRole } from '@/layouts/guards'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { HomePage } from '@/pages/HomePage'
import { NoticeDetailPage } from '@/pages/NoticeDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { TempleDetailPage } from '@/pages/TempleDetailPage'
import {
  AccountPage,
  AdminBookingsPage,
  AdminDashboardPage,
  AdminHomePage,
  AdminLayout,
  AdminNoticesPage,
  AdminOrdersPage,
  AdminRatesPage,
  AdminSlotsPage,
  AdminTemplesPage,
  AdminUsersPage,
  CheckoutPage,
  LoginPage,
  DarshanPage,
  MyBookingsPage,
  MyOrdersPage,
  ReceiptPage,
  RegisterPage,
  StaffLoginPage,
  VazhipaduPage,
} from '@/pages/lazyPages'
import { TemplesPage } from '@/pages/TemplesPage'

/** Route table. Exported as plain objects so tests can mount it in a memory router. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          // Public website
          { index: true, element: <HomePage /> },
          { path: 'temples', element: <TemplesPage /> },
          { path: 'temples/:templeId', element: <TempleDetailPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'notifications/:noticeId', element: <NoticeDetailPage /> },

          // Devotee services: browsing is public, booking needs a login
          { path: 'darshan', element: <DarshanPage /> },
          { path: 'vazhipadu', element: <VazhipaduPage /> },
          {
            element: <RequireAuth />,
            children: [
              { path: 'darshan/my-bookings', element: <MyBookingsPage /> },
              { path: 'vazhipadu/checkout', element: <CheckoutPage /> },
              { path: 'vazhipadu/orders/:orderNumber', element: <ReceiptPage /> },
              { path: 'vazhipadu/my-orders', element: <MyOrdersPage /> },
            ],
          },

          // Accounts
          { path: 'login', element: <LoginPage /> },
          { path: 'admin/login', element: <StaffLoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: '403', element: <ForbiddenPage /> },
          {
            element: <RequireAuth />,
            children: [{ path: 'account', element: <AccountPage /> }],
          },

          // Admin portal: staff and admins only
          {
            path: 'admin',
            element: <RequireRole roles={['STAFF', 'ADMIN']} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminHomePage /> },
                  {
                    element: <RequirePermission permission="dashboard:view" />,
                    children: [{ path: 'dashboard', element: <AdminDashboardPage /> }],
                  },
                  {
                    element: <RequirePermission permission="booking:viewAny" />,
                    children: [{ path: 'bookings', element: <AdminBookingsPage /> }],
                  },
                  {
                    element: <RequirePermission permission="order:viewAny" />,
                    children: [{ path: 'orders', element: <AdminOrdersPage /> }],
                  },
                  {
                    element: <RequirePermission permission="catalog:manage" />,
                    children: [
                      { path: 'slots', element: <AdminSlotsPage /> },
                      { path: 'rates', element: <AdminRatesPage /> },
                    ],
                  },
                  {
                    element: <RequirePermission permission="notice:manage" />,
                    children: [{ path: 'notices', element: <AdminNoticesPage /> }],
                  },
                  {
                    element: <RequirePermission permission="temple:manage" />,
                    children: [{ path: 'temples', element: <AdminTemplesPage /> }],
                  },
                  {
                    element: <RequirePermission permission="user:manage" />,
                    children: [{ path: 'users', element: <AdminUsersPage /> }],
                  },
                ],
              },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
