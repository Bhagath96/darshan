import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import { templeRemoved, templeUpserted } from '../admin/manageActions'
import type { Temple } from '@/types'

/** The temple list is small and changes rarely, so it is fetched once and shared by every screen. */
export type TemplesState = AsyncState<Temple[]>

const initialState: TemplesState = asyncState<Temple[]>([])

const templesSlice = createSlice({
  name: 'temples',
  initialState,
  reducers: {
    templesRequested(state) {
      state.status = 'loading'
      state.error = null
    },
    templesLoaded(state, action: PayloadAction<Temple[]>) {
      state.data = action.payload
      state.status = 'success'
    },
    templesFailed(state, action: PayloadAction<AppError>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    // Admin changes show on the public website straight away.
    builder
      .addCase(templeUpserted, (state, action) => {
        const i = state.data.findIndex((t) => t.id === action.payload.id)
        if (i >= 0) state.data[i] = action.payload
        else state.data.push(action.payload)
      })
      .addCase(templeRemoved, (state, action) => {
        state.data = state.data.filter((t) => t.id !== action.payload)
      })
  },
})

export const { templesRequested, templesLoaded, templesFailed } = templesSlice.actions
export default templesSlice.reducer

export const selectTemples = (state: RootState) => state.temples
export const selectTempleById = (state: RootState, templeId: string | undefined) =>
  state.temples.data.find((t) => t.id === templeId)
