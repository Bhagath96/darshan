import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { logoutRequested, sessionExpired } from '../auth/authSlice'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { Order, OrderQuery, OrderStatus, Paged, RequestStatus } from '@/types'

export interface OrdersState extends AsyncState<Paged<Order> | null> {
  requestId: string | null
  /** The query of the latest request (to tell whether an answer belongs to it). */
  query: OrderQuery | null
  /** Cancels in flight: id → status before the cancel, used to roll back on failure. */
  cancelling: Record<string, OrderStatus>
  export: { status: RequestStatus; error: AppError | null }
}

const initialState: OrdersState = {
  ...asyncState<Paged<Order> | null>(null),
  requestId: null,
  query: null,
  cancelling: {},
  export: { status: 'idle', error: null },
}

const setStatus = (state: OrdersState, id: string, status: OrderStatus) => {
  const order = state.data?.items.find((o) => o.id === id)
  if (order) order.status = status
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    ordersRequested: {
      reducer(state, action: PayloadAction<{ query: OrderQuery; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
        state.query = action.payload.query
      },
      prepare(query: OrderQuery) {
        return { payload: { query, requestId: nanoid() } }
      },
    },
    ordersLoaded(state, action: PayloadAction<{ page: Paged<Order>; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.page
      state.status = 'success'
    },
    ordersFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },

    /** Optimistic: shows CANCELLED straight away; the saga reverts it if the server says no. */
    orderCancelRequested(state, action: PayloadAction<string>) {
      const item = state.data?.items.find((x) => x.id === action.payload)
      if (!item || state.cancelling[item.id]) return
      state.cancelling[item.id] = item.status
      item.status = 'CANCELLED'
    },
    orderCancelConfirmed(state, action: PayloadAction<Order>) {
      delete state.cancelling[action.payload.id]
      setStatus(state, action.payload.id, action.payload.status)
    },
    orderCancelReverted(state, action: PayloadAction<string>) {
      const previous = state.cancelling[action.payload]
      delete state.cancelling[action.payload]
      if (previous) setStatus(state, action.payload, previous)
    },

    /** Export every order matching the filters (all pages) as CSV. */
    ordersExportRequested(state, _action: PayloadAction<Omit<OrderQuery, 'page' | 'pageSize'>>) {
      state.export = { status: 'loading', error: null }
    },
    ordersExported(state) {
      state.export = { status: 'success', error: null }
    },
    ordersExportFailed(state, action: PayloadAction<AppError>) {
      state.export = { status: 'error', error: action.payload }
    },
  },
  extraReducers: (builder) => {
    // Never show one user's list to the next person on a shared device.
    builder.addCase(logoutRequested, () => initialState).addCase(sessionExpired, () => initialState)
  },
})

export const {
  ordersRequested,
  ordersLoaded,
  ordersFailed,
  orderCancelRequested,
  orderCancelConfirmed,
  orderCancelReverted,
  ordersExportRequested,
  ordersExported,
  ordersExportFailed,
} = ordersSlice.actions
export default ordersSlice.reducer
/** Order list shared by the admin orders page and the devotee's "My orders" page. */
export const selectOrders = (state: RootState) => state.orders
