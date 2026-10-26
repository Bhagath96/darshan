import { IST_TIME_ZONE } from './constants'
import type { IsoDate, IsoDateTime, Language } from '@/types'

const IST_OFFSET_MINUTES = 5 * 60 + 30

/** Today's calendar date in India, whatever the device time zone is. */
export function todayIST(now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function parseIsoDate(date: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number)
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 }
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const { y, m, d } = parseIsoDate(value)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { y, m, d } = parseIsoDate(date)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Converts an IST wall-clock time on a date into a UTC instant. */
export function istToInstant(date: IsoDate, time: string): IsoDateTime {
  const { y, m, d } = parseIsoDate(date)
  const [hh, mm] = time.split(':').map(Number)
  const utcMs = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0) - IST_OFFSET_MINUTES * 60_000
  return new Date(utcMs).toISOString()
}

const intlLocale = (lang: Language) => (lang === 'ml' ? 'ml-IN' : 'en-IN')

/** Formats a calendar date, e.g. "26 Oct 2026". Date-only values are not shifted by time zone. */
export function formatDate(date: IsoDate, lang: Language = 'en'): string {
  const { y, m, d } = parseIsoDate(date)
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** Formats the time of an instant in IST, e.g. "5:30 am". */
export function formatTimeIST(instant: IsoDateTime, lang: Language = 'en'): string {
  return new Intl.DateTimeFormat(intlLocale(lang), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST_TIME_ZONE,
  }).format(new Date(instant))
}

export function formatDateTimeIST(instant: IsoDateTime, lang: Language = 'en'): string {
  return new Intl.DateTimeFormat(intlLocale(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: IST_TIME_ZONE,
  }).format(new Date(instant))
}
