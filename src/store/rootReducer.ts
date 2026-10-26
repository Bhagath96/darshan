import { combineReducers } from '@reduxjs/toolkit'
import bookings from './admin/bookingsSlice'
import catalog from './admin/catalogSlice'
import dashboard from './admin/dashboardSlice'
import editor from './admin/editorSlice'
import adminUsers from './admin/usersSlice'
import auth from './auth/authSlice'
import booking from './darshan/bookingSlice'
import myBookings from './darshan/myBookingsSlice'
import slots from './darshan/slotsSlice'
import i18n from './i18n/i18nSlice'
import notices from './notices/noticesSlice'
import orders from './orders/ordersSlice'
import temples from './temples/templesSlice'
import ui from './ui/uiSlice'
import cart from './vazhipadu/cartSlice'
import checkout from './vazhipadu/checkoutSlice'
import offerings from './vazhipadu/offeringsSlice'

export const rootReducer = combineReducers({
  adminBookings: bookings,
  adminCatalog: catalog,
  adminDashboard: dashboard,
  adminEditor: editor,
  adminUsers,
  auth,
  booking,
  cart,
  checkout,
  myBookings,
  i18n,
  notices,
  offerings,
  orders,
  slots,
  temples,
  ui,
})

export type RootState = ReturnType<typeof rootReducer>
