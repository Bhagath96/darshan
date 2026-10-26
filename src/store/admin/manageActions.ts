import { createAction } from '@reduxjs/toolkit'
import type {
  AuthUser,
  Booking,
  BookingUpdate,
  DarshanSlot,
  Notice,
  NoticeInput,
  Offering,
  OfferingInput,
  Order,
  OrderUpdate,
  SlotInput,
  Temple,
  TempleInput,
  UserInput,
} from '@/types'

/**
 * Add / edit / delete requests from the admin portal. Saves (create or edit) drive the
 * shared editor state of the open dialog; deletes are confirmed first and then toasted.
 * A save without `id` creates; with `id` it replaces that item.
 */

export const templeSaveRequested = createAction<{
  id?: string
  input: TempleInput
  addStandardSlots?: boolean
}>('manage/templeSaveRequested')
export const templeDeleteRequested = createAction<string>('manage/templeDeleteRequested')
export const templeUpserted = createAction<Temple>('manage/templeUpserted')
export const templeRemoved = createAction<string>('manage/templeRemoved')

export const offeringSaveRequested = createAction<{ id?: string; input: OfferingInput }>(
  'manage/offeringSaveRequested',
)
export const offeringDeleteRequested = createAction<string>('manage/offeringDeleteRequested')
export const offeringUpserted = createAction<Offering>('manage/offeringUpserted')
export const offeringRemoved = createAction<string>('manage/offeringRemoved')

export const slotCreateRequested = createAction<SlotInput>('manage/slotCreateRequested')
export const slotDeleteRequested = createAction<string>('manage/slotDeleteRequested')
export const slotUpserted = createAction<DarshanSlot>('manage/slotUpserted')
export const slotRemoved = createAction<string>('manage/slotRemoved')

export const bookingEditRequested = createAction<{ id: string; update: BookingUpdate }>(
  'manage/bookingEditRequested',
)
export const bookingDeleteRequested = createAction<string>('manage/bookingDeleteRequested')
export const bookingReplaced = createAction<Booking>('manage/bookingReplaced')
export const bookingRemoved = createAction<string>('manage/bookingRemoved')

export const orderEditRequested = createAction<{ id: string; update: OrderUpdate }>(
  'manage/orderEditRequested',
)
export const orderDeleteRequested = createAction<string>('manage/orderDeleteRequested')
export const orderReplaced = createAction<Order>('manage/orderReplaced')
export const orderRemoved = createAction<string>('manage/orderRemoved')

export const noticeEditRequested = createAction<{ id: string; input: NoticeInput }>(
  'manage/noticeEditRequested',
)
export const noticeUpdated = createAction<Notice>('manage/noticeUpdated')

export const userSaveRequested = createAction<{ id?: string; input: UserInput }>(
  'manage/userSaveRequested',
)
export const userDeleteRequested = createAction<string>('manage/userDeleteRequested')
export const userUpserted = createAction<AuthUser>('manage/userUpserted')
export const userRemoved = createAction<string>('manage/userRemoved')

/** Every save that an editor dialog waits for. */
export const SAVE_ACTIONS = [
  templeSaveRequested,
  offeringSaveRequested,
  slotCreateRequested,
  bookingEditRequested,
  orderEditRequested,
  noticeEditRequested,
  userSaveRequested,
] as const
