import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadJson, STORAGE_KEYS } from '../persistence'
import type { AppError } from '../types'
import type { RootState } from '../rootReducer'
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdate,
  RegisterRequest,
  RequestStatus,
  Session,
  UserRole,
} from '@/types'

/** Status of one account form (profile or password). */
export interface FormRequest {
  status: RequestStatus
  error: AppError | null
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  /** Status of the last login or sign-up attempt. */
  status: RequestStatus
  error: AppError | null
  /** True while a saved session is being checked with the server after a reload. */
  restoring: boolean
  /** Set when the server ended the session, so the UI can say why the user was logged out. */
  expired: boolean
  profile: FormRequest
  password: FormRequest
}

const idleForm: FormRequest = { status: 'idle', error: null }

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
  restoring: false,
  expired: false,
  profile: idleForm,
  password: idleForm,
}

const ROLES: readonly UserRole[] = ['DEVOTEE', 'STAFF', 'ADMIN']

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const { token, user } = value as Partial<Session>
  return (
    typeof token === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.phone === 'string' &&
    ROLES.includes(user.role)
  )
}

/**
 * The saved session is used straight away, so the header and guards don't flash
 * "logged out" on reload; the saga then checks it with the server.
 */
export function loadAuthState(): AuthState {
  const saved = loadJson(STORAGE_KEYS.session, isSession)
  if (!saved) return initialAuthState
  return {
    ...initialAuthState,
    user: saved.user,
    token: saved.token,
    status: 'success',
    restoring: true,
  }
}

const startRequest = (state: AuthState) => {
  state.status = 'loading'
  state.error = null
  state.expired = false
}

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    loginRequested(state, _action: PayloadAction<LoginRequest>) {
      startRequest(state)
    },
    registerRequested(state, _action: PayloadAction<RegisterRequest>) {
      startRequest(state)
    },
    /** Login and sign-up both end here. */
    loginSucceeded(state, action: PayloadAction<Session>) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.status = 'success'
      state.error = null
      state.restoring = false
    },
    loginFailed(state, action: PayloadAction<AppError>) {
      state.status = 'error'
      state.error = action.payload
    },
    /** Clears a login error, e.g. when the user starts typing again or leaves the page. */
    loginErrorCleared(state) {
      if (state.status === 'error') state.status = 'idle'
      state.error = null
    },

    sessionRestored(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.restoring = false
    },
    /** The server could not be reached; keep the saved user and stop showing "checking". */
    sessionRestoreGaveUp(state) {
      state.restoring = false
    },
    /** The server said the token is no longer valid. */
    sessionExpired() {
      return { ...initialAuthState, expired: true }
    },
    expiredNoticeShown(state) {
      state.expired = false
    },
    logoutRequested() {
      return initialAuthState
    },

    profileUpdateRequested(state, _action: PayloadAction<ProfileUpdate>) {
      state.profile = { status: 'loading', error: null }
    },
    profileUpdated(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.profile = { status: 'success', error: null }
    },
    profileUpdateFailed(state, action: PayloadAction<AppError>) {
      state.profile = { status: 'error', error: action.payload }
    },
    passwordChangeRequested(state, _action: PayloadAction<ChangePasswordRequest>) {
      state.password = { status: 'loading', error: null }
    },
    passwordChanged(state) {
      state.password = { status: 'success', error: null }
    },
    passwordChangeFailed(state, action: PayloadAction<AppError>) {
      state.password = { status: 'error', error: action.payload }
    },
    /** Resets the profile and password form status when the account page opens. */
    accountFormsReset(state) {
      state.profile = idleForm
      state.password = idleForm
    },
  },
})

export const {
  loginRequested,
  registerRequested,
  loginSucceeded,
  loginFailed,
  loginErrorCleared,
  sessionRestored,
  sessionRestoreGaveUp,
  sessionExpired,
  expiredNoticeShown,
  logoutRequested,
  profileUpdateRequested,
  profileUpdated,
  profileUpdateFailed,
  passwordChangeRequested,
  passwordChanged,
  passwordChangeFailed,
  accountFormsReset,
} = authSlice.actions
export default authSlice.reducer

export const selectAuth = (state: RootState) => state.auth
export const selectCurrentUser = (state: RootState) => state.auth.user
