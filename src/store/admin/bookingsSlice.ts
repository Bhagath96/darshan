import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { logoutRequested, sessionExpired } from '../auth/authSlice'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import { bookingRemoved, bookingReplaced } from './manageActions'
import type { Booking, BookingQuery, BookingStatus, Paged } from '@/types'

export interface AdminBookingsState extends AsyncState<Paged<Booking> | null> {
  requestId: string | null
  /** The query of the latest request (to tell whether an answer belongs to it). */
  query: BookingQuery | null
  /** Cancels in flight: id → status before the cancel, used to roll back on failure. */
  cancelling: Record<string, BookingStatus>
}

const initialState: AdminBookingsState = {
  ...asyncState<Paged<Booking> | null>(null),
  requestId: null,
  query: null,
  cancelling: {},
}

const setStatus = (state: AdminBookingsState, id: string, status: BookingStatus) => {
  const booking = state.data?.items.find((b) => b.id === id)
  if (booking) booking.status = status
}

const bookingsSlice = createSlice({
  name: 'adminBookings',
  initialState,
  reducers: {
    bookingsSearchRequested: {
      reducer(state, action: PayloadAction<{ query: BookingQuery; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
        state.query = action.payload.query
      },
      prepare(query: BookingQuery) {
        return { payload: { query, requestId: nanoid() } }
      },
    },
    bookingsLoaded(state, action: PayloadAction<{ page: Paged<Booking>; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.page
      state.status = 'success'
    },
    bookingsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },

    /** Optimistic: shows CANCELLED straight away; the saga reverts it if the server says no. */
    adminBookingCancelRequested(state, action: PayloadAction<string>) {
      const item = state.data?.items.find((x) => x.id === action.payload)
      if (!item || state.cancelling[item.id]) return
      state.cancelling[item.id] = item.status
      item.status = 'CANCELLED'
    },
    adminBookingCancelConfirmed(state, action: PayloadAction<Booking>) {
      delete state.cancelling[action.payload.id]
      setStatus(state, action.payload.id, action.payload.status)
    },
    adminBookingCancelReverted(state, action: PayloadAction<string>) {
      const previous = state.cancelling[action.payload]
      delete state.cancelling[action.payload]
      if (previous) setStatus(state, action.payload, previous)
    },
  },
  extraReducers: (builder) => {
    // Never show one user's list to the next person on a shared device.
    builder
      .addCase(logoutRequested, () => initialState)
      .addCase(sessionExpired, () => initialState)
      .addCase(bookingReplaced, (state, action) => {
        const items = state.data?.items
        const i = items?.findIndex((b) => b.id === action.payload.id) ?? -1
        if (items && i >= 0) items[i] = action.payload
      })
      .addCase(bookingRemoved, (state, action) => {
        if (!state.data) return
        const before = state.data.items.length
        state.data.items = state.data.items.filter((b) => b.id !== action.payload)
        state.data.total -= before - state.data.items.length
      })
  },
})

export const {
  bookingsSearchRequested,
  bookingsLoaded,
  bookingsFailed,
  adminBookingCancelRequested,
  adminBookingCancelConfirmed,
  adminBookingCancelReverted,
} = bookingsSlice.actions
export default bookingsSlice.reducer
export const selectAdminBookings = (state: RootState) => state.adminBookings
