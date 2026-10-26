import { describe, expect, it } from 'vitest'
import { formatINR } from '@/lib/currency'
import { addDays, formatTimeIST, istToInstant, isValidIsoDate, todayIST } from '@/lib/date'
import { normalizePhone } from '@/lib/phone'
import { safeRedirect } from '@/lib/redirect'

describe('safeRedirect', () => {
  it('keeps paths on this site', () => {
    expect(safeRedirect('/darshan?temple=tm-sastha')).toBe('/darshan?temple=tm-sastha')
  })

  it.each([
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('falls back for %s', (target) => {
    expect(safeRedirect(target)).toBe('/')
  })
})

describe('dates in IST', () => {
  it('uses the Indian date even when it is still yesterday in UTC', () => {
    // 20:00 UTC on 25 Oct = 01:30 IST on 26 Oct
    expect(todayIST(new Date('2026-10-25T20:00:00Z'))).toBe('2026-10-26')
  })

  it('converts IST wall-clock time to a UTC instant and back', () => {
    const instant = istToInstant('2026-10-26', '05:30')
    expect(instant).toBe('2026-10-26T00:00:00.000Z')
    expect(formatTimeIST(instant)).toBe('5:30 am')
  })

  it('adds days across month ends and checks real dates', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(isValidIsoDate('2026-02-30')).toBe(false)
    expect(isValidIsoDate('2026-10-26')).toBe(true)
  })
})

describe('phone numbers', () => {
  it.each([
    ['9847012345', '9847012345'],
    ['+91 98470 12345', '9847012345'],
    ['098470-12345', '9847012345'],
    ['5847012345', null],
    ['98470', null],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('currency', () => {
  it('uses Indian digit grouping and no paise', () => {
    expect(formatINR(110)).toBe('₹110')
    expect(formatINR(125000)).toBe('₹1,25,000')
  })
})
