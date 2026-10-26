import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { bookingSucceeded } from './bookingSlice'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { DarshanSlot, IsoDate } from '@/types'

export interface SlotsState extends AsyncState<DarshanSlot[]> {
  /** Only the answer to the latest request is shown (race safety, with takeLatest). */
  requestId: string | null
  query: { templeId: string; date: IsoDate } | null
}

const initialState: SlotsState = { ...asyncState<DarshanSlot[]>([]), requestId: null, query: null }

const slotsSlice = createSlice({
  name: 'slots',
  initialState,
  reducers: {
    slotsRequested: {
      reducer(
        state,
        action: PayloadAction<{ templeId: string; date: IsoDate; requestId: string }>,
      ) {
        const { templeId, date, requestId } = action.payload
        state.status = 'loading'
        state.error = null
        state.requestId = requestId
        // A different temple/day: don't show the old day's slots while loading.
        if (state.query?.templeId !== templeId || state.query.date !== date) state.data = []
        state.query = { templeId, date }
      },
      prepare(templeId: string, date: IsoDate) {
        return { payload: { templeId, date, requestId: nanoid() } }
      },
    },
    slotsLoaded(state, action: PayloadAction<{ slots: DarshanSlot[]; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.data = action.payload.slots
      state.status = 'success'
    },
    slotsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.requestId) return
      state.status = 'error'
      state.error = action.payload.error
    },
  },
  extraReducers: (builder) => {
    // After booking 3 of 10, show 7 left straight away.
    builder.addCase(bookingSucceeded, (state, action) => {
      const slot = state.data.find((s) => s.id === action.payload.slotId)
      if (slot)
        slot.remainingTickets = Math.max(0, slot.remainingTickets - action.payload.ticketCount)
    })
  },
})

export const { slotsRequested, slotsLoaded, slotsFailed } = slotsSlice.actions
export default slotsSlice.reducer
export const selectSlots = (state: RootState) => state.slots
