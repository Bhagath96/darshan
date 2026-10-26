import type { PayloadAction } from '@reduxjs/toolkit'
import { fork, put, select, take, takeLatest } from 'redux-saga/effects'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { notify, notifyError } from '../notify'
import type { RootState } from '../rootReducer'
import { takeOnePerId } from '../sagaUtils'
import {
  adminBookingCancelConfirmed,
  adminBookingCancelRequested,
  adminBookingCancelReverted,
  bookingsFailed,
  bookingsLoaded,
  bookingsSearchRequested,
} from './bookingsSlice'
import {
  adminOfferingsFailed,
  adminOfferingsLoaded,
  adminOfferingsRequested,
  adminSlotsFailed,
  adminSlotsLoaded,
  adminSlotsRequested,
  offeringSettled,
  offeringUpdateRequested,
  slotSettled,
  slotUpdateRequested,
} from './catalogSlice'
import { dashboardFailed, dashboardLoaded, dashboardRequested } from './dashboardSlice'
import { adminApi, bookingApi, templeApi } from '@/api'
import type {
  Booking,
  BookingQuery,
  DarshanSlot,
  DashboardStats,
  IsoDate,
  Offering,
  OfferingUpdate,
  Paged,
  SlotUpdate,
} from '@/types'

// ---- Lists (takeLatest: a new filter cancels the old request) -------------

function* loadDashboard(
  action: PayloadAction<{ templeId: string | undefined; requestId: string }>,
) {
  const { templeId, requestId } = action.payload
  try {
    const stats: DashboardStats = yield* callApi(adminApi.getDashboard, templeId)
    yield put(dashboardLoaded({ stats, requestId }))
  } catch (error) {
    yield put(dashboardFailed({ error: toAppError(error), requestId }))
  }
}

function* searchBookings(action: PayloadAction<{ query: BookingQuery; requestId: string }>) {
  const { query, requestId } = action.payload
  try {
    const page: Paged<Booking> = yield* callApi(bookingApi.searchBookings, query)
    yield put(bookingsLoaded({ page, requestId }))
  } catch (error) {
    yield put(bookingsFailed({ error: toAppError(error), requestId }))
  }
}

function* loadSlots(action: PayloadAction<{ templeId: string; date: IsoDate; requestId: string }>) {
  const { templeId, date, requestId } = action.payload
  try {
    const slots: DarshanSlot[] = yield* callApi(bookingApi.getSlots, templeId, date)
    yield put(adminSlotsLoaded({ slots, requestId }))
  } catch (error) {
    yield put(adminSlotsFailed({ error: toAppError(error), requestId }))
  }
}

function* loadOfferings(action: PayloadAction<{ templeId: string; requestId: string }>) {
  const { templeId, requestId } = action.payload
  try {
    const offerings: Offering[] = yield* callApi(templeApi.getOfferings, templeId)
    yield put(adminOfferingsLoaded({ offerings, requestId }))
  } catch (error) {
    yield put(adminOfferingsFailed({ error: toAppError(error), requestId }))
  }
}

// ---- Optimistic cancel with rollback ------------------------------------------

function* cancelBooking(action: PayloadAction<string>) {
  const id = action.payload
  const started: boolean = yield select((s: RootState) => id in s.adminBookings.cancelling)
  if (!started) return
  try {
    const booking: Booking = yield* callApi(bookingApi.cancelBooking, id)
    yield put(adminBookingCancelConfirmed(booking))
    yield* notify('success', 'adminBookings.cancelled', { ref: booking.bookingRef })
  } catch (error) {
    yield put(adminBookingCancelReverted(id))
    yield* notifyError(toAppError(error))
  }
}

// ---- Optimistic edits with rollback --------------------------------------------

function* updateSlot(action: PayloadAction<SlotUpdate>) {
  const { slotId } = action.payload
  const snapshot: DarshanSlot | undefined = yield select(
    (s: RootState) => s.adminCatalog.slots.saving[slotId],
  )
  try {
    const saved: DarshanSlot = yield* callApi(bookingApi.updateSlot, action.payload)
    yield put(slotSettled(saved))
    yield* notify('success', 'adminSlots.saved')
  } catch (error) {
    if (snapshot) yield put(slotSettled(snapshot))
    yield* notifyError(toAppError(error))
  }
}

function* updateOffering(action: PayloadAction<OfferingUpdate>) {
  const { offeringId } = action.payload
  const snapshot: Offering | undefined = yield select(
    (s: RootState) => s.adminCatalog.offerings.saving[offeringId],
  )
  try {
    const saved: Offering = yield* callApi(templeApi.updateOffering, action.payload)
    yield put(offeringSettled(saved))
    yield* notify('success', 'adminRates.saved')
  } catch (error) {
    if (snapshot) yield put(offeringSettled(snapshot))
    yield* notifyError(toAppError(error))
  }
}

export function* adminSaga() {
  yield takeLatest(dashboardRequested.type, loadDashboard)
  yield takeLatest(bookingsSearchRequested.type, searchBookings)
  yield takeLatest(adminSlotsRequested.type, loadSlots)
  yield takeLatest(adminOfferingsRequested.type, loadOfferings)
  yield fork(takeOnePerId, adminBookingCancelRequested.type, cancelBooking)
  // Edits to different rows run side by side; edits to one row are serialised by the UI.
  yield fork(function* watchSlots() {
    while (true) {
      const action: PayloadAction<SlotUpdate> = yield take(slotUpdateRequested.type)
      yield fork(updateSlot, action)
    }
  })
  yield fork(function* watchOfferings() {
    while (true) {
      const action: PayloadAction<OfferingUpdate> = yield take(offeringUpdateRequested.type)
      yield fork(updateOffering, action)
    }
  })
}
