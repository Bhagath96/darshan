import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { CreateOrderRequest, Order, RequestStatus } from '@/types'

/** What the order form sends; the saga adds the idempotency key. */
export type OrderDraft = Omit<CreateOrderRequest, 'idempotencyKey'>

export interface CheckoutState {
  status: RequestStatus
  error: AppError | null
  /** Same rule as darshan bookings: one key per attempt, reused on retry of the same order. */
  idempotencyKey: string | null
  fingerprint: string | null
  lastOrder: Order | null
  /** The order shown on the receipt page (when it isn't the one just placed). */
  receipt: AsyncState<Order | null>
}

const initialState: CheckoutState = {
  status: 'idle',
  error: null,
  idempotencyKey: null,
  fingerprint: null,
  lastOrder: null,
  receipt: asyncState<Order | null>(null),
}

export const orderFingerprint = (d: OrderDraft) =>
  JSON.stringify([
    d.templeId,
    d.items.map((i) => [i.offeringId, i.quantity]),
    d.devoteeName.trim(),
    d.phone.replace(/\D/g, '').slice(-10),
    d.star,
    d.offeringDate,
  ])

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    orderSubmitted(state, _action: PayloadAction<OrderDraft>) {
      state.status = 'loading'
      state.error = null
    },
    orderKeyAssigned(state, action: PayloadAction<{ key: string; fingerprint: string }>) {
      state.idempotencyKey = action.payload.key
      state.fingerprint = action.payload.fingerprint
    },
    orderPlaced(state, action: PayloadAction<Order>) {
      state.status = 'success'
      state.lastOrder = action.payload
      state.idempotencyKey = null
      state.fingerprint = null
    },
    orderFailed(state, action: PayloadAction<AppError>) {
      state.status = 'error'
      state.error = action.payload
    },
    /** Opening the checkout page again starts a fresh attempt (but keeps any retry key). */
    checkoutOpened(state) {
      if (state.status !== 'loading') {
        state.status = 'idle'
        state.error = null
      }
    },

    receiptRequested(state, _action: PayloadAction<string>) {
      state.receipt = { data: null, status: 'loading', error: null }
    },
    receiptLoaded(state, action: PayloadAction<Order>) {
      state.receipt = { data: action.payload, status: 'success', error: null }
    },
    receiptFailed(state, action: PayloadAction<AppError>) {
      state.receipt = { data: null, status: 'error', error: action.payload }
    },
  },
})

export const {
  orderSubmitted,
  orderKeyAssigned,
  orderPlaced,
  orderFailed,
  checkoutOpened,
  receiptRequested,
  receiptLoaded,
  receiptFailed,
} = checkoutSlice.actions
export default checkoutSlice.reducer
export const selectCheckout = (state: RootState) => state.checkout
