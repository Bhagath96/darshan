import type { PayloadAction } from '@reduxjs/toolkit'
import { fork, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { profileUpdated } from '../auth/authSlice'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { notify, notifyError } from '../notify'
import type { RootState } from '../rootReducer'
import { takeOnePerId } from '../sagaUtils'
import { editorFailed, editorSucceeded } from './editorSlice'
import {
  bookingDeleteRequested,
  bookingEditRequested,
  bookingRemoved,
  bookingReplaced,
  noticeEditRequested,
  noticeUpdated,
  offeringDeleteRequested,
  offeringRemoved,
  offeringSaveRequested,
  offeringUpserted,
  orderDeleteRequested,
  orderEditRequested,
  orderRemoved,
  orderReplaced,
  slotCreateRequested,
  slotDeleteRequested,
  slotRemoved,
  slotUpserted,
  templeDeleteRequested,
  templeRemoved,
  templeSaveRequested,
  templeUpserted,
  userDeleteRequested,
  userRemoved,
  userSaveRequested,
  userUpserted,
} from './manageActions'
import { usersFailed, usersLoaded, usersRequested } from './usersSlice'
import { bookingApi, noticeApi, orderApi, templeApi, userApi } from '@/api'
import type { MessageKey } from '@/i18n'
import type {
  AuthUser,
  Booking,
  DarshanSlot,
  Notice,
  Offering,
  Order,
  Temple,
  UserQuery,
} from '@/types'

/** After a save: close the dialog and confirm. A failure keeps the dialog open with the error. */
function* saved(key: MessageKey) {
  yield put(editorSucceeded())
  yield* notify('success', key)
}

function* saveFailed(error: unknown) {
  yield put(editorFailed(toAppError(error)))
}

/** A delete has no dialog left open (the confirm closed), so a failure is toasted. */
function* deleteFailed(error: unknown) {
  yield* notifyError(toAppError(error))
}

// ---- Temples ------------------------------------------------------------------

function* saveTemple(action: ReturnType<typeof templeSaveRequested>) {
  const { id, input, addStandardSlots } = action.payload
  try {
    const temple: Temple = id
      ? yield* callApi(templeApi.updateTemple, id, input)
      : yield* callApi(templeApi.createTemple, input, addStandardSlots ?? true)
    yield put(templeUpserted(temple))
    yield* saved(id ? 'manage.templeSaved' : 'manage.templeCreated')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteTemple(action: PayloadAction<string>) {
  try {
    yield* callApi(templeApi.deleteTemple, action.payload)
    yield put(templeRemoved(action.payload))
    yield* notify('success', 'manage.templeDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

// ---- Offerings ----------------------------------------------------------------

function* saveOffering(action: ReturnType<typeof offeringSaveRequested>) {
  const { id, input } = action.payload
  try {
    const offering: Offering = id
      ? yield* callApi(templeApi.saveOffering, id, input)
      : yield* callApi(templeApi.createOffering, input)
    yield put(offeringUpserted(offering))
    yield* saved(id ? 'manage.offeringSaved' : 'manage.offeringCreated')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteOffering(action: PayloadAction<string>) {
  try {
    yield* callApi(templeApi.deleteOffering, action.payload)
    yield put(offeringRemoved(action.payload))
    yield* notify('success', 'manage.offeringDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

// ---- Darshan slots and bookings -------------------------------------------------

function* createSlot(action: ReturnType<typeof slotCreateRequested>) {
  try {
    const slot: DarshanSlot = yield* callApi(bookingApi.createSlot, action.payload)
    yield put(slotUpserted(slot))
    yield* saved('manage.slotCreated')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteSlot(action: PayloadAction<string>) {
  try {
    yield* callApi(bookingApi.deleteSlot, action.payload)
    yield put(slotRemoved(action.payload))
    yield* notify('success', 'manage.slotDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

function* editBooking(action: ReturnType<typeof bookingEditRequested>) {
  const { id, update } = action.payload
  try {
    const booking: Booking = yield* callApi(bookingApi.updateBooking, id, update)
    yield put(bookingReplaced(booking))
    yield* saved('manage.bookingSaved')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteBooking(action: PayloadAction<string>) {
  try {
    yield* callApi(bookingApi.deleteBooking, action.payload)
    yield put(bookingRemoved(action.payload))
    yield* notify('success', 'manage.bookingDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

// ---- Orders and notices ---------------------------------------------------------

function* editOrder(action: ReturnType<typeof orderEditRequested>) {
  const { id, update } = action.payload
  try {
    const order: Order = yield* callApi(orderApi.updateOrder, id, update)
    yield put(orderReplaced(order))
    yield* saved('manage.orderSaved')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteOrder(action: PayloadAction<string>) {
  try {
    yield* callApi(orderApi.deleteOrder, action.payload)
    yield put(orderRemoved(action.payload))
    yield* notify('success', 'manage.orderDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

function* editNotice(action: ReturnType<typeof noticeEditRequested>) {
  const { id, input } = action.payload
  try {
    const notice: Notice = yield* callApi(noticeApi.updateNotice, id, input)
    yield put(noticeUpdated(notice))
    yield* saved('manage.noticeSaved')
  } catch (error) {
    yield* saveFailed(error)
  }
}

// ---- User accounts --------------------------------------------------------------

function* loadUsers(action: PayloadAction<{ query: UserQuery; requestId: string }>) {
  const { query, requestId } = action.payload
  try {
    const users: AuthUser[] = yield* callApi(userApi.getUsers, query)
    yield put(usersLoaded({ users, requestId }))
  } catch (error) {
    yield put(usersFailed({ error: toAppError(error), requestId }))
  }
}

function* saveUser(action: ReturnType<typeof userSaveRequested>) {
  const { id, input } = action.payload
  try {
    const user: AuthUser = id
      ? yield* callApi(userApi.updateUser, id, input)
      : yield* callApi(userApi.createUser, input)
    yield put(userUpserted(user))
    // Editing your own account changes the name in the header too.
    const me: string | undefined = yield select((s: RootState) => s.auth.user?.id)
    if (me === user.id) yield put(profileUpdated(user))
    yield* saved(id ? 'manage.userSaved' : 'manage.userCreated')
  } catch (error) {
    yield* saveFailed(error)
  }
}

function* deleteUser(action: PayloadAction<string>) {
  try {
    yield* callApi(userApi.deleteUser, action.payload)
    yield put(userRemoved(action.payload))
    yield* notify('success', 'manage.userDeleted')
  } catch (error) {
    yield* deleteFailed(error)
  }
}

export function* manageSaga() {
  // One save at a time (a double click on Save sends one request).
  yield takeLeading(templeSaveRequested.type, saveTemple)
  yield takeLeading(offeringSaveRequested.type, saveOffering)
  yield takeLeading(slotCreateRequested.type, createSlot)
  yield takeLeading(bookingEditRequested.type, editBooking)
  yield takeLeading(orderEditRequested.type, editOrder)
  yield takeLeading(noticeEditRequested.type, editNotice)
  yield takeLeading(userSaveRequested.type, saveUser)
  yield takeLatest(usersRequested.type, loadUsers)
  // Deletes of different items run side by side; a repeat for one item is ignored.
  yield fork(takeOnePerId, templeDeleteRequested.type, deleteTemple)
  yield fork(takeOnePerId, offeringDeleteRequested.type, deleteOffering)
  yield fork(takeOnePerId, slotDeleteRequested.type, deleteSlot)
  yield fork(takeOnePerId, bookingDeleteRequested.type, deleteBooking)
  yield fork(takeOnePerId, orderDeleteRequested.type, deleteOrder)
  yield fork(takeOnePerId, userDeleteRequested.type, deleteUser)
}
