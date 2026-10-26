import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppError } from '../types'
import type { RootState } from '../rootReducer'
import type { Booking, CreateBookingRequest, RequestStatus } from '@/types'

/** What the form sends; the saga adds the idempotency key. */
export type BookingDraft = Omit<CreateBookingRequest, 'idempotencyKey'>

export interface BookingState {
  /** The slot whose booking form is open. */
  slotId: string | null
  status: RequestStatus
  error: AppError | null
  /**
   * One key per booking attempt. A retry of the same details reuses it, so if the first
   * try reached the server ("saved, then the response was lost") the server returns
   * that booking instead of making a second one. A new key is made after a success,
   * or when the details change.
   */
  idempotencyKey: string | null
  /** The details the key belongs to. */
  fingerprint: string | null
  lastBooking: Booking | null
}

const initialState: BookingState = {
  slotId: null,
  status: 'idle',
  error: null,
  idempotencyKey: null,
  fingerprint: null,
  lastBooking: null,
}

export const fingerprintOf = (draft: BookingDraft) =>
  JSON.stringify([
    draft.slotId,
    draft.devoteeName.trim(),
    draft.phone.replace(/\D/g, '').slice(-10),
    draft.ticketCount,
  ])

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    bookingFormOpened(state, action: PayloadAction<string>) {
      state.slotId = action.payload
      state.status = 'idle'
      state.error = null
      state.lastBooking = null
    },
    bookingFormClosed(state) {
      state.slotId = null
      if (state.status !== 'loading') state.status = 'idle'
      state.error = null
    },
    bookingSubmitted(state, _action: PayloadAction<BookingDraft>) {
      state.status = 'loading'
      state.error = null
    },
    bookingKeyAssigned(state, action: PayloadAction<{ key: string; fingerprint: string }>) {
      state.idempotencyKey = action.payload.key
      state.fingerprint = action.payload.fingerprint
    },
    bookingSucceeded(state, action: PayloadAction<Booking>) {
      state.status = 'success'
      state.lastBooking = action.payload
      state.idempotencyKey = null
      state.fingerprint = null
    },
    bookingFailed(state, action: PayloadAction<AppError>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  bookingFormOpened,
  bookingFormClosed,
  bookingSubmitted,
  bookingKeyAssigned,
  bookingSucceeded,
  bookingFailed,
} = bookingSlice.actions
export default bookingSlice.reducer
export const selectBooking = (state: RootState) => state.booking
