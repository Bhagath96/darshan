import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
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
})

export const { templesRequested, templesLoaded, templesFailed } = templesSlice.actions
export default templesSlice.reducer

export const selectTemples = (state: RootState) => state.temples
export const selectTempleById = (state: RootState, templeId: string | undefined) =>
  state.temples.data.find((t) => t.id === templeId)
