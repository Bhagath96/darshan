import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { logoutRequested, sessionExpired } from '../auth/authSlice'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { Booking, BookingStatus } from '@/types'

export interface MyBookingsState extends AsyncState<Booking[]> {
  requestId: string | null
  /** Cancels in flight: id → status before the cancel, for rollback. */
  cancelling: Record<string, BookingStatus>
}

const initialState: MyBookingsState = {
  ...asyncState<Booking[]>([]),
  requestId: null,
  cancelling: {},
}

const myBookingsSlice = createSlice({
  name: 'myBookings',
  initialState,
  reducers: {
    myBookingsRequested: {
      reducer(state, action: PayloadAction<{ phone: string; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
      },
      prepare(phone: string) {
        return { payload: { phone, requestId: nanoid() } }
      },
    },
    myBookingsLoaded(state, action: PayloadAction<{ bookings: Booking[]; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.bookings
      state.status = 'success'
    },
    myBookingsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },
    /** Optimistic: CANCELLED at once; the saga reverts if the server refuses. */
    myBookingCancelRequested(state, action: PayloadAction<string>) {
      const booking = state.data.find((b) => b.id === action.payload)
      if (!booking || state.cancelling[booking.id]) return
      state.cancelling[booking.id] = booking.status
      booking.status = 'CANCELLED'
    },
    myBookingCancelConfirmed(state, action: PayloadAction<Booking>) {
      delete state.cancelling[action.payload.id]
      const booking = state.data.find((b) => b.id === action.payload.id)
      if (booking) booking.status = action.payload.status
    },
    myBookingCancelReverted(state, action: PayloadAction<string>) {
      const previous = state.cancelling[action.payload]
      delete state.cancelling[action.payload]
      const booking = state.data.find((b) => b.id === action.payload)
      if (booking && previous) booking.status = previous
    },
  },
  extraReducers: (builder) => {
    // One user's bookings must never show for the next person on a shared device.
    builder.addCase(logoutRequested, () => initialState).addCase(sessionExpired, () => initialState)
  },
})

export const {
  myBookingsRequested,
  myBookingsLoaded,
  myBookingsFailed,
  myBookingCancelRequested,
  myBookingCancelConfirmed,
  myBookingCancelReverted,
} = myBookingsSlice.actions
export default myBookingsSlice.reducer
export const selectMyBookings = (state: RootState) => state.myBookings
