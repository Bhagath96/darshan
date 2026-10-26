import type { PayloadAction } from '@reduxjs/toolkit'
import { call, put, select, takeEvery, takeLatest, takeLeading } from 'redux-saga/effects'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { notify } from '../notify'
import { saveJson, STORAGE_KEYS } from '../persistence'
import type { RootState } from '../rootReducer'
import {
  cartCleared,
  cartReplacedWith,
  itemAdded,
  itemRemoved,
  quantitySet,
  type CartState,
} from './cartSlice'
import {
  orderFailed,
  orderFingerprint,
  orderKeyAssigned,
  orderPlaced,
  orderSubmitted,
  receiptFailed,
  receiptLoaded,
  receiptRequested,
  type CheckoutState,
  type OrderDraft,
} from './checkoutSlice'
import { offeringsFailed, offeringsLoaded, offeringsRequested } from './offeringsSlice'
import { orderApi, templeApi } from '@/api'
import { createId } from '@/lib/id'
import type { Offering, Order } from '@/types'

function* loadOfferings(action: PayloadAction<{ templeId: string; requestId: string }>) {
  const { templeId, requestId } = action.payload
  try {
    const offerings: Offering[] = yield* callApi(templeApi.getOfferings, templeId)
    yield put(offeringsLoaded({ offerings, templeId, requestId }))
  } catch (error) {
    yield put(offeringsFailed({ error: toAppError(error), requestId }))
  }
}

/** Safe submit: takeLeading + one idempotency key per attempt, reused on retry. */
function* placeOrder(action: PayloadAction<OrderDraft>) {
  const draft = action.payload
  const current: CheckoutState = yield select((s: RootState) => s.checkout)
  const fingerprint = orderFingerprint(draft)
  let key = current.idempotencyKey
  if (!key || current.fingerprint !== fingerprint) {
    key = createId('od')
    yield put(orderKeyAssigned({ key, fingerprint }))
  }
  try {
    const order: Order = yield* callApi(orderApi.createOrder, { ...draft, idempotencyKey: key })
    yield put(orderPlaced(order))
    yield* notify('success', 'checkout.placed', { number: order.orderNumber })
  } catch (error) {
    // The cart and the form stay as they are; the page shows the error with "Try again".
    yield put(orderFailed(toAppError(error)))
  }
}

function* loadReceipt(action: PayloadAction<string>) {
  try {
    const order: Order = yield* callApi(orderApi.getOrder, action.payload)
    yield put(receiptLoaded(order))
  } catch (error) {
    yield put(receiptFailed(toAppError(error)))
  }
}

function* persistCart() {
  const cart: CartState = yield select((s: RootState) => s.cart)
  yield call(saveJson, STORAGE_KEYS.cart, cart)
}

export function* vazhipaduSaga() {
  yield takeLatest(offeringsRequested.type, loadOfferings)
  yield takeLeading(orderSubmitted.type, placeOrder)
  yield takeLatest(receiptRequested.type, loadReceipt)
  yield takeEvery(
    [
      itemAdded.type,
      cartReplacedWith.type,
      quantitySet.type,
      itemRemoved.type,
      cartCleared.type,
      orderPlaced.type,
      offeringsLoaded.type,
    ],
    persistCart,
  )
}
