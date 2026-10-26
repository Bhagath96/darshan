import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import { offeringRemoved, offeringUpserted } from '../admin/manageActions'
import type { Offering } from '@/types'

export interface OfferingsState extends AsyncState<Offering[]> {
  requestId: string | null
  templeId: string | null
}

const initialState: OfferingsState = {
  ...asyncState<Offering[]>([]),
  requestId: null,
  templeId: null,
}

const offeringsSlice = createSlice({
  name: 'offerings',
  initialState,
  reducers: {
    offeringsRequested: {
      reducer(state, action: PayloadAction<{ templeId: string; requestId: string }>) {
        state.status = 'loading'
        state.error = null
        state.requestId = action.payload.requestId
        if (state.templeId !== action.payload.templeId) state.data = []
        state.templeId = action.payload.templeId
      },
      prepare(templeId: string) {
        return { payload: { templeId, requestId: nanoid() } }
      },
    },
    offeringsLoaded(
      state,
      action: PayloadAction<{ offerings: Offering[]; templeId: string; requestId: string }>,
    ) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.offerings
      state.status = 'success'
    },
    offeringsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },
  },
  extraReducers: (builder) => {
    // Keep the devotee catalogue in step with staff edits made in the same tab.
    builder
      .addCase(offeringUpserted, (state, action) => {
        if (state.templeId !== action.payload.templeId) return
        const i = state.data.findIndex((o) => o.id === action.payload.id)
        if (i >= 0) state.data[i] = action.payload
        else state.data.push(action.payload)
      })
      .addCase(offeringRemoved, (state, action) => {
        state.data = state.data.filter((o) => o.id !== action.payload)
      })
  },
})

export const { offeringsRequested, offeringsLoaded, offeringsFailed } = offeringsSlice.actions
export default offeringsSlice.reducer
export const selectOfferings = (state: RootState) => state.offerings
