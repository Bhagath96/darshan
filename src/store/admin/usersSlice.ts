import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { logoutRequested, sessionExpired } from '../auth/authSlice'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import { userRemoved, userUpserted } from './manageActions'
import type { AuthUser, UserQuery } from '@/types'

/** Admin: the user accounts list. */
export interface AdminUsersState extends AsyncState<AuthUser[]> {
  requestId: string | null
}

const initialState: AdminUsersState = { ...asyncState<AuthUser[]>([]), requestId: null }

const usersSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    usersRequested: {
      reducer(state, action: PayloadAction<{ query: UserQuery; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
      },
      prepare(query: UserQuery) {
        return { payload: { query, requestId: nanoid() } }
      },
    },
    usersLoaded(state, action: PayloadAction<{ users: AuthUser[]; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.users
      state.status = 'success'
    },
    usersFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(userUpserted, (state, action) => {
        const i = state.data.findIndex((u) => u.id === action.payload.id)
        if (i >= 0) state.data[i] = action.payload
        else state.data.unshift(action.payload)
      })
      .addCase(userRemoved, (state, action) => {
        state.data = state.data.filter((u) => u.id !== action.payload)
      })
      .addCase(logoutRequested, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export const { usersRequested, usersLoaded, usersFailed } = usersSlice.actions
export default usersSlice.reducer
export const selectAdminUsers = (state: RootState) => state.adminUsers
