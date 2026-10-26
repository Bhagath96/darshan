import noticesJson from './data/notices.json'
import offeringsJson from './data/offerings.json'
import templesJson from './data/temples.json'
import usersJson from './data/users.json'
import { createRng, type Rng } from './rng'
import { DEFAULT_SLOT_MINUTES, NAKSHATRA_IDS, SLOT_DAYS } from '@/lib/constants'
import { addDays, istToInstant, todayIST } from '@/lib/date'
import type {
  AuthUser,
  Booking,
  DarshanSlot,
  IsoDate,
  Notice,
  Offering,
  Order,
  OrderStatus,
  Temple,
} from '@/types'

/** A user record as the "server" stores it. */
export interface StoredUser extends AuthUser {
  password: string
}

// JSON imports widen string unions (role, category) to `string`; the files are checked by tests.
export const seedUsers = usersJson as StoredUser[]
export const seedTemples = templesJson as Temple[]
export const seedOfferings = offeringsJson as Offering[]

/** A notice as written in notices.json: dates are relative, so the demo always looks current. */
export interface NoticeSeed extends Omit<Notice, 'publishedAt' | 'eventDate'> {
  publishedDaysAgo: number
  eventInDays: number | null
}

export const seedNotices = noticesJson as NoticeSeed[]

export function generateNotices(now: Date): Notice[] {
  const today = todayIST(now)
  return seedNotices
    .map(({ publishedDaysAgo, eventInDays, ...notice }) => ({
      ...notice,
      // Published at 09:00 IST, n days ago (never in the future, for an early-morning load).
      publishedAt: new Date(
        Math.min(
          now.getTime(),
          Date.parse(istToInstant(addDays(today, -publishedDaysAgo), '09:00')),
        ),
      ).toISOString(),
      eventDate: eventInDays === null ? null : addDays(today, eventInDays),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** Darshan slot start times (IST) and their length in minutes. */
export const SLOT_TIMES = ['05:00', '06:30', '08:00', '10:00', '17:00', '18:30'] as const
const SLOT_MINUTES = DEFAULT_SLOT_MINUTES

const DEVOTEE_NAMES = [
  'Anil Kumar',
  'Lakshmi Nair',
  'Suresh Pillai',
  'Meera Menon',
  'Gopika Varma',
  'Hari Krishnan',
  'Divya Raj',
  'Arjun Nambiar',
  'Sreeja Thampi',
  'Vishnu Prasad',
  'Anjali Das',
  'Rajesh Kurup',
  'Parvathy Iyer',
  'Midhun Mohan',
  'Keerthana S',
  'Gokul Unni',
] as const

function phoneFor(rng: Rng): string {
  return `${rng.pick(['94', '98', '99', '70', '80', '63'])}${String(rng.int(10_000_000, 99_999_999))}`
}

/** One empty slot. The id is built from temple, day and start time, so it is unique per start. */
export function makeSlot(
  templeId: string,
  date: IsoDate,
  time: string,
  minutes: number,
  capacity: number,
): DarshanSlot {
  const startsAt = istToInstant(date, time)
  return {
    id: `sl-${templeId}-${date}-${time.replace(':', '')}`,
    templeId,
    date,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString(),
    totalCapacity: capacity,
    remainingTickets: capacity,
    isBlocked: false,
  }
}

/** The standard six slots a day for the next SLOT_DAYS days, all empty (for a new temple). */
export function standardSlots(templeId: string, now: Date): DarshanSlot[] {
  const today = todayIST(now)
  return Array.from({ length: SLOT_DAYS }, (_, day) => addDays(today, day)).flatMap((date) =>
    SLOT_TIMES.map((time, i) =>
      makeSlot(templeId, date, time, SLOT_MINUTES, i % 2 === 0 ? 100 : 50),
    ),
  )
}

export function generateSlots(rng: Rng, now: Date): DarshanSlot[] {
  const today = todayIST(now)
  const slots: DarshanSlot[] = []
  for (const temple of seedTemples) {
    for (let day = 0; day < SLOT_DAYS; day++) {
      const date = addDays(today, day)
      SLOT_TIMES.forEach((time, i) => {
        const slot = makeSlot(temple.id, date, time, SLOT_MINUTES, i % 2 === 0 ? 100 : 50)
        slot.remainingTickets = rng.chance(0.15) ? 0 : rng.int(1, slot.totalCapacity)
        // Tomorrow's 08:00 slot always has exactly 10 left, for the "book 3 of 10" scenario.
        if (day === 1 && time === '08:00') slot.remainingTickets = 10
        slots.push(slot)
      })
    }
  }
  return slots
}

export function generateBookings(rng: Rng, slots: DarshanSlot[], now: Date): Booking[] {
  const devotee = seedUsers.find((u) => u.role === 'DEVOTEE')
  const bookings: Booking[] = []
  const today = todayIST(now)

  // The demo devotee gets one booking on today's first slot (usually already started)
  // and a few upcoming ones, so "My Bookings" shows every case.
  const mine = [
    slots.find((s) => s.date === today && s.templeId === 'tm-krishna'),
    ...slots.filter((s) => s.date === addDays(today, 2) && s.templeId === 'tm-sastha').slice(0, 2),
  ]
  const others = Array.from({ length: 20 }, () => rng.pick(slots))

  const add = (slot: DarshanSlot | undefined, owner: StoredUser | undefined) => {
    if (!slot) return
    const n = bookings.length + 1
    bookings.push({
      id: `bk-${n}`,
      bookingRef: `DB${String(1000 + n)}`,
      templeId: slot.templeId,
      slotId: slot.id,
      userId: owner?.id ?? null,
      date: slot.date,
      startsAt: slot.startsAt,
      devoteeName: owner?.name ?? rng.pick(DEVOTEE_NAMES),
      phone: owner?.phone ?? phoneFor(rng),
      ticketCount: rng.int(1, 4),
      status: rng.chance(0.15) ? 'CANCELLED' : 'BOOKED',
      createdAt: new Date(now.getTime() - rng.int(1, 72) * 3_600_000).toISOString(),
    })
  }
  mine.forEach((slot) => add(slot, devotee))
  // Keep the demo devotee's own bookings active.
  bookings.forEach((b) => (b.status = 'BOOKED'))
  others.forEach((slot) => add(slot, undefined))
  return bookings
}

export function generateOrders(rng: Rng, now: Date): Order[] {
  const today = todayIST(now)
  const orders: Order[] = []
  for (let n = 1; n <= 50; n++) {
    const temple = rng.pick(seedTemples)
    const active = seedOfferings.filter((o) => o.templeId === temple.id && o.isActive)
    const lineCount = rng.int(1, 3)
    const chosen = new Map<string, Offering>()
    while (chosen.size < lineCount) {
      const o = rng.pick(active)
      chosen.set(o.id, o)
    }
    const items = [...chosen.values()].map((o) => ({
      offeringId: o.id,
      offeringName: o.name,
      quantity: rng.int(1, 3),
      unitPrice: o.price,
    }))
    const offeringDate = addDays(today, rng.int(-15, 20))
    const isPast = offeringDate < today
    const status: OrderStatus = rng.chance(0.15) ? 'CANCELLED' : isPast ? 'COMPLETED' : 'CONFIRMED'
    const createdAt = new Date(
      new Date(istToInstant(offeringDate, '09:00')).getTime() - rng.int(1, 10) * 86_400_000,
    ).toISOString()
    orders.push({
      id: `od-${n}`,
      orderNumber: `VZ${String(10_000 + n)}`,
      templeId: temple.id,
      userId: null,
      devoteeName: rng.pick(DEVOTEE_NAMES),
      phone: phoneFor(rng),
      star: rng.pick(NAKSHATRA_IDS),
      offeringDate,
      items,
      totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      status,
      createdAt,
    })
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createSeed(now: Date) {
  const rng = createRng(20261026)
  const slots = generateSlots(rng, now)
  return {
    users: structuredClone(seedUsers),
    temples: structuredClone(seedTemples),
    offerings: structuredClone(seedOfferings),
    notices: generateNotices(now),
    slots,
    bookings: generateBookings(rng, slots, now),
    orders: generateOrders(rng, now),
  }
}
