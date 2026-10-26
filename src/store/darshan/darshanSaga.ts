import type { PayloadAction } from '@reduxjs/toolkit'
import { fork, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { notify, notifyError } from '../notify'
import type { RootState } from '../rootReducer'
import { takeOnePerId } from '../sagaUtils'
import {
  bookingFailed,
  bookingKeyAssigned,
  bookingSubmitted,
  bookingSucceeded,
  fingerprintOf,
  type BookingDraft,
  type BookingState,
} from './bookingSlice'
import {
  myBookingCancelConfirmed,
  myBookingCancelReverted,
  myBookingCancelRequested,
  myBookingsFailed,
  myBookingsLoaded,
  myBookingsRequested,
} from './myBookingsSlice'
import { slotsFailed, slotsLoaded, slotsRequested } from './slotsSlice'
import { bookingApi } from '@/api'
import { createId } from '@/lib/id'
import type { Booking, DarshanSlot, IsoDate } from '@/types'

/** takeLatest cancels the previous request when temple or date changes. */
function* loadSlots(action: PayloadAction<{ templeId: string; date: IsoDate; requestId: string }>) {
  const { templeId, date, requestId } = action.payload
  try {
    const slots: DarshanSlot[] = yield* callApi(bookingApi.getSlots, templeId, date)
    yield put(slotsLoaded({ slots, requestId }))
  } catch (error) {
    yield put(slotsFailed({ error: toAppError(error), requestId }))
  }
}

/**
 * Safe submit: takeLeading drops extra clicks while one booking is in flight, and the
 * idempotency key is reused for a retry of the same details (see BookingState).
 */
function* submitBooking(action: PayloadAction<BookingDraft>) {
  const draft = action.payload
  const current: BookingState = yield select((s: RootState) => s.booking)
  const fingerprint = fingerprintOf(draft)
  let key = current.idempotencyKey
  if (!key || current.fingerprint !== fingerprint) {
    key = createId('bk')
    yield put(bookingKeyAssigned({ key, fingerprint }))
  }
  try {
    const booking: Booking = yield* callApi(bookingApi.createBooking, {
      ...draft,
      idempotencyKey: key,
    })
    yield put(bookingSucceeded(booking))
    yield* notify('success', 'darshan.booked', { ref: booking.bookingRef })
  } catch (error) {
    // The form shows this error in an alert above the fields (read out by screen readers).
    yield put(bookingFailed(toAppError(error)))
  }
}

function* loadMyBookings(action: PayloadAction<{ phone: string; requestId: string }>) {
  const { phone, requestId } = action.payload
  try {
    const bookings: Booking[] = yield* callApi(bookingApi.getBookings, phone)
    yield put(myBookingsLoaded({ bookings, requestId }))
  } catch (error) {
    yield put(myBookingsFailed({ error: toAppError(error), requestId }))
  }
}

function* cancelMyBooking(action: PayloadAction<string>) {
  const id = action.payload
  const started: boolean = yield select((s: RootState) => id in s.myBookings.cancelling)
  if (!started) return
  try {
    const booking: Booking = yield* callApi(bookingApi.cancelBooking, id)
    yield put(myBookingCancelConfirmed(booking))
    yield* notify('success', 'myBookings.cancelled', { ref: booking.bookingRef })
  } catch (error) {
    yield put(myBookingCancelReverted(id))
    yield* notifyError(toAppError(error))
  }
}

export function* darshanSaga() {
  yield takeLatest(slotsRequested.type, loadSlots)
  yield takeLeading(bookingSubmitted.type, submitBooking)
  yield takeLatest(myBookingsRequested.type, loadMyBookings)
  yield fork(takeOnePerId, myBookingCancelRequested.type, cancelMyBooking)
}
