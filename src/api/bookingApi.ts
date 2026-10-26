import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import { makeSlot, type StoredUser } from './seed'
import {
  assertTempleScope,
  requireTemple,
  validName,
  validPhone,
  validTime,
  validWholeNumber,
} from './validate'
import {
  MAX_SLOT_CAPACITY,
  MAX_TICKETS_PER_BOOKING,
  SLOT_DAYS,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from '@/lib/constants'
import { addDays, istToInstant, isValidIsoDate, todayIST } from '@/lib/date'
import { can } from '@/lib/permissions'
import { normalizePhone } from '@/lib/phone'
import type {
  Booking,
  BookingQuery,
  BookingUpdate,
  CreateBookingRequest,
  DarshanSlot,
  IsoDate,
  Paged,
  SlotInput,
  SlotUpdate,
} from '@/types'

const hasStarted = (startsAt: string) => new Date(startsAt).getTime() <= Date.now()

/** Public: slots for a temple on a date, earliest first. */
export function getSlots(templeId: string, date: IsoDate): Promise<DarshanSlot[]> {
  return simulate('darshan', () => {
    const db = getDb()
    if (!db.temples.some((t) => t.id === templeId))
      throw new ApiError('NOT_FOUND', 'Temple not found.')
    if (!isValidIsoDate(date)) throw new ApiError('VALIDATION', 'Please choose a valid date.')
    return db.slots
      .filter((s) => s.templeId === templeId && s.date === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  })
}

/**
 * Books tickets in a slot. Pass the same `idempotencyKey` when retrying:
 * if the first attempt already reached the server, the original booking is returned.
 */
export function createBooking(request: CreateBookingRequest): Promise<Booking> {
  return simulate(
    'darshan',
    () => {
      const user = requireUser('booking:create')
      const db = getDb()
      const slot = db.slots.find((s) => s.id === request.slotId)
      if (!slot) throw new ApiError('NOT_FOUND', 'This slot no longer exists.')
      if (slot.isBlocked) throw new ApiError('CONFLICT', 'This slot is closed for booking.')
      if (hasStarted(slot.startsAt))
        throw new ApiError('CONFLICT', 'This slot has already started.')

      const phone = normalizePhone(request.phone)
      const name = request.devoteeName.trim()
      const tickets = request.ticketCount
      if (!phone) throw new ApiError('VALIDATION', 'Please enter a valid 10-digit mobile number.')
      if (name.length < 2) throw new ApiError('VALIDATION', 'Please enter the devotee name.')
      if (!Number.isInteger(tickets) || tickets < 1 || tickets > MAX_TICKETS_PER_BOOKING) {
        throw new ApiError('VALIDATION', `You can book 1 to ${MAX_TICKETS_PER_BOOKING} tickets.`)
      }
      if (tickets > slot.remainingTickets) {
        throw new ApiError(
          'CONFLICT',
          `Only ${slot.remainingTickets} tickets are left in this slot.`,
        )
      }

      slot.remainingTickets -= tickets
      db.counters.booking += 1
      const booking: Booking = {
        id: `bk-${db.counters.booking}`,
        bookingRef: `DB${db.counters.booking}`,
        templeId: slot.templeId,
        slotId: slot.id,
        userId: user.id,
        date: slot.date,
        startsAt: slot.startsAt,
        devoteeName: name,
        phone,
        ticketCount: tickets,
        status: 'BOOKED',
        createdAt: new Date().toISOString(),
      }
      db.bookings.push(booking)
      return booking
    },
    { idempotencyKey: request.idempotencyKey },
  )
}

function canSeeBooking(user: StoredUser, booking: Booking): boolean {
  if (can(user.role, 'booking:viewAny')) {
    return user.templeId === null || user.templeId === booking.templeId
  }
  return booking.userId === user.id || booking.phone === user.phone
}

/**
 * Bookings for a phone number, latest slot first.
 * Devotees only get bookings they made or that use their own number;
 * staff are limited to their temple; admins see everything.
 */
export function getBookings(phone: string): Promise<Booking[]> {
  return simulate('darshan', () => {
    const user = requireUser('booking:viewOwn')
    const normalized = normalizePhone(phone)
    if (!normalized)
      throw new ApiError('VALIDATION', 'Please enter a valid 10-digit mobile number.')
    return getDb()
      .bookings.filter((b) => b.phone === normalized && canSeeBooking(user, b))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  })
}

/** Cancels a booking and releases its tickets. Cancelling twice is harmless. */
export function cancelBooking(bookingId: string): Promise<Booking> {
  return simulate('darshan', () => {
    const user = requireUser('booking:cancelOwn')
    const db = getDb()
    const booking = db.bookings.find((b) => b.id === bookingId)
    if (!booking || !canSeeBooking(user, booking))
      throw new ApiError('NOT_FOUND', 'Booking not found.')
    if (booking.status === 'CANCELLED') return booking
    if (hasStarted(booking.startsAt)) {
      throw new ApiError(
        'CONFLICT',
        'This darshan has already started, so it can no longer be cancelled.',
      )
    }
    booking.status = 'CANCELLED'
    const slot = db.slots.find((s) => s.id === booking.slotId)
    if (slot)
      slot.remainingTickets = Math.min(
        slot.totalCapacity,
        slot.remainingTickets + booking.ticketCount,
      )
    return booking
  })
}

/** Pages a sorted list; an out-of-range page snaps to the last one. */
function paginate<T>(items: T[], page: number, pageSize: number): Paged<T> {
  const size = Math.max(1, pageSize)
  const lastPage = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), lastPage)
  return {
    items: items.slice((current - 1) * size, current * size),
    total: items.length,
    page: current,
    pageSize: size,
  }
}

/**
 * Staff/admin search over bookings, latest slot first. Staff only see their temple.
 * Phone is a partial match, so "98470" finds every number containing it.
 */
export function searchBookings(query: BookingQuery): Promise<Paged<Booking>> {
  return simulate('darshan', () => {
    const user = requireUser('booking:viewAny')
    const digits = query.phone?.replace(/\D/g, '') ?? ''
    const matches = getDb()
      .bookings.filter(
        (b) =>
          canSeeBooking(user, b) &&
          (!digits || b.phone.includes(digits)) &&
          (!query.date || b.date === query.date) &&
          (!query.templeId || b.templeId === query.templeId) &&
          (!query.status || b.status === query.status),
      )
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    return paginate(matches, query.page, query.pageSize)
  })
}

/**
 * Staff/admin: change a slot's capacity or block it. Capacity can't go below the tickets
 * already booked; the remaining count moves by the same amount as the capacity.
 */
export function updateSlot({ slotId, totalCapacity, isBlocked }: SlotUpdate): Promise<DarshanSlot> {
  return simulate('darshan', () => {
    const user = requireUser('catalog:manage')
    const slot = getDb().slots.find((s) => s.id === slotId)
    if (!slot) throw new ApiError('NOT_FOUND', 'This slot no longer exists.')
    assertTempleScope(user, slot.templeId)
    if (totalCapacity !== undefined) {
      const booked = slot.totalCapacity - slot.remainingTickets
      if (
        !Number.isInteger(totalCapacity) ||
        totalCapacity < 1 ||
        totalCapacity > MAX_SLOT_CAPACITY
      ) {
        throw new ApiError(
          'VALIDATION',
          `Capacity must be a whole number from 1 to ${MAX_SLOT_CAPACITY}.`,
        )
      }
      if (totalCapacity < booked) {
        throw new ApiError(
          'CONFLICT',
          `${booked} tickets are already booked, so capacity can't be lower than that.`,
        )
      }
      slot.remainingTickets = totalCapacity - booked
      slot.totalCapacity = totalCapacity
    }
    if (isBlocked !== undefined) slot.isBlocked = isBlocked
    return slot
  })
}

/** Staff/admin: adds a darshan slot. Two slots of a temple can't start at the same time. */
export function createSlot(input: SlotInput): Promise<DarshanSlot> {
  return simulate('darshan', () => {
    const user = requireUser('catalog:manage')
    requireTemple(input.templeId)
    assertTempleScope(user, input.templeId)
    const db = getDb()
    const today = todayIST()
    if (
      !isValidIsoDate(input.date) ||
      input.date < today ||
      input.date > addDays(today, SLOT_DAYS - 1)
    )
      throw new ApiError('VALIDATION', `Please choose a day within the next ${SLOT_DAYS} days.`)
    const time = validTime(input.time)
    if (hasStarted(istToInstant(input.date, time)))
      throw new ApiError('VALIDATION', 'This time has already passed. Please choose a later time.')
    const minutes = validWholeNumber(
      input.durationMinutes,
      SLOT_MIN_MINUTES,
      SLOT_MAX_MINUTES,
      'Length in minutes',
    )
    const capacity = validWholeNumber(input.totalCapacity, 1, MAX_SLOT_CAPACITY, 'Capacity')
    const slot = makeSlot(input.templeId, input.date, time, minutes, capacity)
    if (db.slots.some((s) => s.id === slot.id))
      throw new ApiError('CONFLICT', 'A slot already starts at this time on this day.')
    db.slots.push(slot)
    return slot
  })
}

/** Staff/admin: deletes a slot. Refused while it still has active bookings. */
export function deleteSlot(slotId: string): Promise<void> {
  return simulate('darshan', () => {
    const user = requireUser('catalog:manage')
    const db = getDb()
    const slot = db.slots.find((s) => s.id === slotId)
    if (!slot) return
    assertTempleScope(user, slot.templeId)
    const active = db.bookings.filter((b) => b.slotId === slotId && b.status === 'BOOKED').length
    if (active > 0) {
      throw new ApiError(
        'CONFLICT',
        `${active} active booking${active === 1 ? ' is' : 's are'} in this slot. Cancel ${active === 1 ? 'it' : 'them'} first, or close the slot instead.`,
      )
    }
    db.slots = db.slots.filter((s) => s.id !== slotId)
  })
}

function findManagedBooking(user: StoredUser, bookingId: string): Booking {
  const booking = getDb().bookings.find((b) => b.id === bookingId)
  if (!booking || !canSeeBooking(user, booking))
    throw new ApiError('NOT_FOUND', 'Booking not found.')
  return booking
}

/**
 * Staff/admin: corrects a booking's name, phone or ticket count. The ticket count can only
 * change on an active booking that hasn't started, and the slot must have room for it.
 */
export function updateBooking(bookingId: string, update: BookingUpdate): Promise<Booking> {
  return simulate('darshan', () => {
    const user = requireUser('booking:manage')
    const booking = findManagedBooking(user, bookingId)
    const devoteeName = validName(update.devoteeName, 'the devotee name')
    const phone = validPhone(update.phone)
    const tickets = validWholeNumber(update.ticketCount, 1, MAX_TICKETS_PER_BOOKING, 'Tickets')
    const change = tickets - booking.ticketCount
    if (change !== 0) {
      if (booking.status !== 'BOOKED')
        throw new ApiError('CONFLICT', 'Tickets can only be changed on an active booking.')
      if (hasStarted(booking.startsAt))
        throw new ApiError(
          'CONFLICT',
          'This darshan has already started, so tickets cannot change.',
        )
      const slot = getDb().slots.find((s) => s.id === booking.slotId)
      if (!slot) throw new ApiError('NOT_FOUND', 'This slot no longer exists.')
      if (change > slot.remainingTickets) {
        throw new ApiError(
          'CONFLICT',
          `Only ${slot.remainingTickets} more tickets are left in this slot.`,
        )
      }
      slot.remainingTickets -= change
      booking.ticketCount = tickets
    }
    booking.devoteeName = devoteeName
    booking.phone = phone
    return booking
  })
}

/** Staff/admin: removes a booking for good. An active, upcoming booking gives its tickets back. */
export function deleteBooking(bookingId: string): Promise<void> {
  return simulate('darshan', () => {
    const user = requireUser('booking:manage')
    const db = getDb()
    const booking = db.bookings.find((b) => b.id === bookingId)
    if (!booking) return
    if (!canSeeBooking(user, booking)) throw new ApiError('NOT_FOUND', 'Booking not found.')
    if (booking.status === 'BOOKED' && !hasStarted(booking.startsAt)) {
      const slot = db.slots.find((s) => s.id === booking.slotId)
      if (slot)
        slot.remainingTickets = Math.min(
          slot.totalCapacity,
          slot.remainingTickets + booking.ticketCount,
        )
    }
    db.bookings = db.bookings.filter((b) => b.id !== bookingId)
  })
}
