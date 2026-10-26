import type { PayloadAction } from '@reduxjs/toolkit'
import { call, fork, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { notify, notifyError } from '../notify'
import type { RootState } from '../rootReducer'
import { takeOnePerId } from '../sagaUtils'
import { ordersToCsv } from './exportOrders'
import {
  orderCancelConfirmed,
  orderCancelReverted,
  orderCancelRequested,
  ordersExported,
  ordersExportFailed,
  ordersExportRequested,
  ordersFailed,
  ordersLoaded,
  ordersRequested,
} from './ordersSlice'
import { orderApi } from '@/api'
import { EXPORT_ROW_LIMIT } from '@/lib/constants'
import { downloadFile } from '@/lib/csv'
import { todayIST } from '@/lib/date'
import type { Order, OrderQuery, Paged } from '@/types'

function* loadOrders(action: PayloadAction<{ query: OrderQuery; requestId: string }>) {
  const { query, requestId } = action.payload
  try {
    const page: Paged<Order> = yield* callApi(orderApi.getOrders, query)
    yield put(ordersLoaded({ page, requestId }))
  } catch (error) {
    yield put(ordersFailed({ error: toAppError(error), requestId }))
  }
}

/** Optimistic: the reducer already shows CANCELLED; roll back if the server refuses. */
function* cancelOrder(action: PayloadAction<string>) {
  const id = action.payload
  const started: boolean = yield select((s: RootState) => id in s.orders.cancelling)
  if (!started) return
  try {
    const order: Order = yield* callApi(orderApi.cancelOrder, id)
    yield put(orderCancelConfirmed(order))
    yield* notify('success', 'adminOrders.cancelled', { number: order.orderNumber })
  } catch (error) {
    yield put(orderCancelReverted(id))
    yield* notifyError(toAppError(error))
  }
}

function* exportOrders(action: PayloadAction<Omit<OrderQuery, 'page' | 'pageSize'>>) {
  try {
    const all: Paged<Order> = yield* callApi(orderApi.getOrders, {
      ...action.payload,
      page: 1,
      pageSize: EXPORT_ROW_LIMIT,
    })
    const temples: RootState['temples']['data'] = yield select((s: RootState) => s.temples.data)
    yield call(downloadFile, `vazhipadu-orders-${todayIST()}.csv`, ordersToCsv(all.items, temples))
    yield put(ordersExported())
    yield* notify('success', 'adminOrders.exported', { count: all.items.length })
  } catch (error) {
    const appError = toAppError(error)
    yield put(ordersExportFailed(appError))
    yield* notifyError(appError)
  }
}

export function* ordersSaga() {
  yield takeLatest(ordersRequested.type, loadOrders)
  yield fork(takeOnePerId, orderCancelRequested.type, cancelOrder)
  yield takeLeading(ordersExportRequested.type, exportOrders)
}
