import { call, put, select } from 'redux-saga/effects'
import { sessionExpired } from './auth/authSlice'
import type { RootState } from './rootReducer'
import { ApiError } from '@/api'

type ApiFn = (...args: never[]) => Promise<unknown>

/**
 * Calls an API function from a saga (use with `yield*`). If the server answers
 * UNAUTHORIZED while the user thinks they are logged in, the session has expired:
 * log them out everywhere, then rethrow so the calling saga still shows its error.
 */
export function* callApi<Fn extends ApiFn>(
  fn: Fn,
  ...args: Parameters<Fn>
): Generator<unknown, Awaited<ReturnType<Fn>>, unknown> {
  try {
    return (yield call(fn, ...args)) as Awaited<ReturnType<Fn>>
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
      const token = (yield select((s: RootState) => s.auth.token)) as string | null
      if (token) yield put(sessionExpired())
    }
    throw error
  }
}
