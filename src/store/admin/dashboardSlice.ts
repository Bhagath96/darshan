import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { DashboardStats } from '@/types'

export type DashboardState = AsyncState<DashboardStats | null> & { requestId: string | null }

const initialState: DashboardState = { ...asyncState<DashboardStats | null>(null), requestId: null }

const dashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {
    dashboardRequested: {
      reducer(state, action: PayloadAction<{ templeId: string | undefined; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
      },
      prepare(templeId?: string) {
        return { payload: { templeId, requestId: nanoid() } }
      },
    },
    dashboardLoaded(state, action: PayloadAction<{ stats: DashboardStats; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.stats
      state.status = 'success'
    },
    dashboardFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },
  },
})

export const { dashboardRequested, dashboardLoaded, dashboardFailed } = dashboardSlice.actions
export default dashboardSlice.reducer
export const selectDashboard = (state: RootState) => state.adminDashboard
