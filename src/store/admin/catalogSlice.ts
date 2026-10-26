import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { asyncState, type AppError, type AsyncState } from '../types'
import type { RootState } from '../rootReducer'
import type { DarshanSlot, IsoDate, Offering, OfferingUpdate, SlotUpdate } from '@/types'

type Editable<T> = AsyncState<T[]> & {
  requestId: string | null
  /** Saves in flight: id → the item as it was before the first unsaved change (for rollback). */
  saving: Record<string, T>
}

/** Slots and offerings as the admin edits them (capacity, block, price, on/off). */
export interface AdminCatalogState {
  slots: Editable<DarshanSlot>
  offerings: Editable<Offering>
}

const editable = <T>(): Editable<T> => ({ ...asyncState<T[]>([]), requestId: null, saving: {} })

const initialState: AdminCatalogState = {
  slots: editable<DarshanSlot>(),
  offerings: editable<Offering>(),
}

function start(list: Editable<unknown>, requestId: string) {
  list.status = 'loading'
  list.error = null
  list.requestId = requestId
}

const catalogSlice = createSlice({
  name: 'adminCatalog',
  initialState,
  reducers: {
    adminSlotsRequested: {
      reducer(
        state,
        action: PayloadAction<{ templeId: string; date: IsoDate; requestId: string }>,
      ) {
        start(state.slots, action.payload.requestId)
      },
      prepare(templeId: string, date: IsoDate) {
        return { payload: { templeId, date, requestId: nanoid() } }
      },
    },
    adminSlotsLoaded(state, action: PayloadAction<{ slots: DarshanSlot[]; requestId: string }>) {
      if (action.payload.requestId !== state.slots.requestId) return
      state.slots.data = action.payload.slots
      state.slots.status = 'success'
    },
    adminSlotsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.slots.requestId) return
      state.slots.status = 'error'
      state.slots.error = action.payload.error
    },
    /** Optimistic: the change shows at once; the saga puts the old slot back if it fails. */
    slotUpdateRequested(state, action: PayloadAction<SlotUpdate>) {
      const { slotId, totalCapacity, isBlocked } = action.payload
      const slot = state.slots.data.find((s) => s.id === slotId)
      if (!slot) return
      state.slots.saving[slotId] ??= { ...slot }
      if (totalCapacity !== undefined) {
        slot.remainingTickets = totalCapacity - (slot.totalCapacity - slot.remainingTickets)
        slot.totalCapacity = totalCapacity
      }
      if (isBlocked !== undefined) slot.isBlocked = isBlocked
    },
    /** Success: the server's version. Rollback: the saga passes the saved snapshot. */
    slotSettled(state, action: PayloadAction<DarshanSlot>) {
      delete state.slots.saving[action.payload.id]
      const i = state.slots.data.findIndex((s) => s.id === action.payload.id)
      if (i >= 0) state.slots.data[i] = action.payload
    },

    adminOfferingsRequested: {
      reducer(state, action: PayloadAction<{ templeId: string; requestId: string }>) {
        start(state.offerings, action.payload.requestId)
      },
      prepare(templeId: string) {
        return { payload: { templeId, requestId: nanoid() } }
      },
    },
    adminOfferingsLoaded(
      state,
      action: PayloadAction<{ offerings: Offering[]; requestId: string }>,
    ) {
      if (action.payload.requestId !== state.offerings.requestId) return
      state.offerings.data = action.payload.offerings
      state.offerings.status = 'success'
    },
    adminOfferingsFailed(state, action: PayloadAction<{ error: AppError; requestId: string }>) {
      if (action.payload.requestId !== state.offerings.requestId) return
      state.offerings.status = 'error'
      state.offerings.error = action.payload.error
    },
    offeringUpdateRequested(state, action: PayloadAction<OfferingUpdate>) {
      const { offeringId, price, isActive } = action.payload
      const offering = state.offerings.data.find((o) => o.id === offeringId)
      if (!offering) return
      state.offerings.saving[offeringId] ??= { ...offering }
      if (price !== undefined) offering.price = price
      if (isActive !== undefined) offering.isActive = isActive
    },
    offeringSettled(state, action: PayloadAction<Offering>) {
      delete state.offerings.saving[action.payload.id]
      const i = state.offerings.data.findIndex((o) => o.id === action.payload.id)
      if (i >= 0) state.offerings.data[i] = action.payload
    },
  },
})

export const {
  adminSlotsRequested,
  adminSlotsLoaded,
  adminSlotsFailed,
  slotUpdateRequested,
  slotSettled,
  adminOfferingsRequested,
  adminOfferingsLoaded,
  adminOfferingsFailed,
  offeringUpdateRequested,
  offeringSettled,
} = catalogSlice.actions
export default catalogSlice.reducer
export const selectAdminSlots = (state: RootState) => state.adminCatalog.slots
export const selectAdminOfferings = (state: RootState) => state.adminCatalog.offerings
