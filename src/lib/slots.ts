import type { DarshanSlot } from '@/types'

export type SlotAvailability = 'open' | 'full' | 'started' | 'closed'

/** Why a slot can or can't be booked right now. "Started" wins over everything else. */
export function availabilityOf(slot: DarshanSlot, now: number): SlotAvailability {
  if (Date.parse(slot.startsAt) <= now) return 'started'
  if (slot.isBlocked) return 'closed'
  if (slot.remainingTickets <= 0) return 'full'
  return 'open'
}
