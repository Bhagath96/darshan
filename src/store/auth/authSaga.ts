import type { PayloadAction } from '@reduxjs/toolkit'
import { call, delay, fork, put, select, takeEvery, takeLeading } from 'redux-saga/effects'
import { callApi } from '../callApi'
import { toAppError } from '../errors'
import { removeKey, saveJson, STORAGE_KEYS } from '../persistence'
import {
  loginFailed,
  loginRequested,
  loginSucceeded,
  logoutRequested,
  passwordChanged,
  passwordChangeFailed,
  passwordChangeRequested,
  profileUpdated,
  profileUpdateFailed,
  profileUpdateRequested,
  registerRequested,
  selectAuth,
  sessionExpired,
  sessionRestored,
  sessionRestoreGaveUp,
  type AuthState,
} from './authSlice'
import { ApiError, authApi, setAuthToken } from '@/api'
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdate,
  RegisterRequest,
  Session,
} from '@/types'

/** Waits before each retry of the start-up session check (ms). */
export const RESTORE_RETRY_DELAYS = [1000, 3000, 8000]

function* saveSession(session: Session) {
  yield call(setAuthToken, session.token)
  yield call(saveJson, STORAGE_KEYS.session, session)
}

function* clearSession() {
  yield call(setAuthToken, null)
  yield call(removeKey, STORAGE_KEYS.session)
}

function* login(action: PayloadAction<LoginRequest>) {
  try {
    const session: Session = yield call(authApi.login, action.payload)
    yield* saveSession(session)
    yield put(loginSucceeded(session))
  } catch (error) {
    yield put(loginFailed(toAppError(error)))
  }
}

function* register(action: PayloadAction<RegisterRequest>) {
  try {
    const session: Session = yield call(authApi.register, action.payload)
    yield* saveSession(session)
    yield put(loginSucceeded(session))
  } catch (error) {
    yield put(loginFailed(toAppError(error)))
  }
}

/**
 * Checks a saved token after a reload. A network failure keeps the user logged in
 * and tries again; only an "expired / invalid" answer logs them out.
 */
export function* restoreSession() {
  const { token }: AuthState = yield select(selectAuth)
  if (!token) return
  yield call(setAuthToken, token)

  for (let attempt = 0; ; attempt++) {
    try {
      const user: AuthUser = yield call(authApi.me, token)
      yield call(saveJson, STORAGE_KEYS.session, { token, user })
      yield put(sessionRestored(user))
      return
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
        // The sessionExpired watcher below clears the token and storage.
        yield put(sessionExpired())
        return
      }
      const wait = RESTORE_RETRY_DELAYS[attempt]
      if (wait === undefined) {
        yield put(sessionRestoreGaveUp())
        return
      }
      yield delay(wait)
    }
  }
}

function* updateProfile(action: PayloadAction<ProfileUpdate>) {
  try {
    const user: AuthUser = yield* callApi(authApi.updateProfile, action.payload)
    const { token }: AuthState = yield select(selectAuth)
    if (token) yield call(saveJson, STORAGE_KEYS.session, { token, user })
    yield put(profileUpdated(user))
  } catch (error) {
    yield put(profileUpdateFailed(toAppError(error)))
  }
}

function* changePassword(action: PayloadAction<ChangePasswordRequest>) {
  try {
    yield* callApi(authApi.changePassword, action.payload)
    yield put(passwordChanged())
  } catch (error) {
    yield put(passwordChangeFailed(toAppError(error)))
  }
}

export function* authSaga() {
  yield fork(restoreSession)
  // A second click on "Log in" / "Create account" while the first is running is ignored.
  yield takeLeading(
    [loginRequested.type, registerRequested.type],
    function* route(action: PayloadAction<unknown>) {
      if (loginRequested.match(action)) yield* login(action)
      else if (registerRequested.match(action)) yield* register(action)
    },
  )
  yield takeLeading(profileUpdateRequested.type, updateProfile)
  yield takeLeading(passwordChangeRequested.type, changePassword)
  yield takeEvery([logoutRequested.type, sessionExpired.type], clearSession)
}
