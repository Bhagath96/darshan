import { call, put, takeLeading } from 'redux-saga/effects'
import { toAppError } from '../errors'
import { templesFailed, templesLoaded, templesRequested } from './templesSlice'
import { templeApi } from '@/api'
import type { Temple } from '@/types'

function* loadTemples() {
  try {
    const temples: Temple[] = yield call(templeApi.getTemples)
    yield put(templesLoaded(temples))
  } catch (error) {
    yield put(templesFailed(toAppError(error)))
  }
}

export function* templesSaga() {
  // Several screens may ask at once; one request is enough.
  yield takeLeading(templesRequested.type, loadTemples)
}
